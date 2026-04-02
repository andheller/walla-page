import { initializeSchema, row } from "./schema";
import { buildTemplateMarkup, showcaseScenes } from "../lib/templates";
import type {
  ElevenTtsInput,
  PairResponse,
  Role,
  RoomSnapshot,
  ScheduleInput,
  SceneEnvelope,
  SceneRecord,
  SceneTemplateInput
} from "../lib/types";

type RoomStateRow = {
  room_id: string;
  active_scene_id: string | null;
  current_loop_asset_key: string | null;
  current_loop_volume: number;
  current_loop_until: number | null;
  idle_since: number | null;
  cleanup_at: number | null;
};

type TokenRow = {
  token: string;
  role: Role;
  expires_at: number;
};

type AuthResult = {
  role: Role;
  token: string | null;
};

export class RoomDO implements DurableObject {
  private ctx: DurableObjectState;
  private env: Env;
  private roomId: string | null = null;
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    try {
      const stateRow = row<{ room_id: string }>(
        this.sql.exec(`SELECT room_id FROM room_state WHERE id = 1`)
      );
      this.roomId = stateRow?.room_id ?? null;
    } catch {
      this.roomId = null;
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomId = request.headers.get("x-room-id") ?? this.roomId;
    if (!roomId) {
      return this.json({ error: "room id missing" }, 400);
    }

    this.ensureInitialized(roomId);

    switch (url.pathname) {
      case "/internal/init":
        return this.handleInit(request);
      case "/internal/bootstrap":
        return this.handleBootstrap(request);
      case "/internal/auth-check":
        return this.handleAuthCheck(request);
      case "/internal/pair":
        return this.handlePair(request);
      case "/internal/state":
        return this.handleState(request);
      case "/internal/schedule":
        return this.handleSchedule(request);
      case "/internal/delete":
        return this.handleDelete(request, { force: this.isForceDelete(request) });
      case "/internal/showcase":
        return this.handleShowcase(request);
      case "/internal/tts":
        return this.handleTts(request);
      case "/internal/ws":
        return this.handleWebSocket(request);
    }

    return this.json({ error: "not found" }, 404);
  }

  async alarm(): Promise<void> {
    if (!this.roomId) {
      return;
    }

    const now = Date.now();
    let changed = false;
    const active = this.getCurrentScene();

    if (active && active.endAt <= now) {
      this.sql.exec(`UPDATE room_state SET active_scene_id = NULL WHERE id = 1`);
      changed = true;
    }

    const dueScenes = this.sql
      .exec<{
        id: string;
      }>(
        `SELECT id
         FROM schedule_entries
         WHERE status = 'scheduled' AND start_at <= ?
         ORDER BY start_at ASC`,
        now
      )
      .toArray();

    let sceneToActivate: SceneRecord | null = null;
    if (dueScenes.length > 0) {
      for (const scene of dueScenes) {
        this.sql.exec(
          `UPDATE schedule_entries SET status = 'played' WHERE id = ?`,
          scene.id
        );
      }

      const latestDue = dueScenes[dueScenes.length - 1];
      this.sql.exec(
        `UPDATE room_state
         SET active_scene_id = ?, idle_since = NULL, cleanup_at = NULL
         WHERE id = 1`,
        latestDue.id
      );
      sceneToActivate = this.getSceneById(latestDue.id);
      changed = true;
    }

    const shouldCleanup = this.shouldRunCleanup(now);
    if (shouldCleanup) {
      await this.cleanupRoom();
      return;
    }

    const roomState = this.getRoomState();
    if (roomState.current_loop_until && roomState.current_loop_until <= now) {
      this.sql.exec(
        `UPDATE room_state
         SET current_loop_asset_key = NULL,
             current_loop_until = NULL
         WHERE id = 1`
      );
      changed = true;
    }

    await this.syncAlarm();

    if (changed) {
      const currentScene = sceneToActivate ?? this.getCurrentScene();
      this.broadcast({ type: "scene_changed", scene: currentScene });
      this.broadcast({ type: "room_meta", snapshot: this.getSnapshot() });
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    try {
      const payload = JSON.parse(text) as { type?: string };
      if (payload.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", now: Date.now() } satisfies SceneEnvelope));
      }
      if (payload.type === "refresh") {
        ws.send(JSON.stringify({ type: "snapshot", snapshot: this.getSnapshot() } satisfies SceneEnvelope));
      }
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "invalid message" } satisfies SceneEnvelope));
    }
  }

  async webSocketClose(): Promise<void> {
    if (this.ctx.getWebSockets().length === 0) {
      const now = Date.now();
      this.sql.exec(
        `UPDATE room_state
         SET idle_since = COALESCE(idle_since, ?),
             cleanup_at = ?
         WHERE id = 1`,
        now,
        now + this.idleTtlMs
      );
      await this.syncAlarm();
      this.broadcast({ type: "room_meta", snapshot: this.getSnapshot() });
    }
  }

  private ensureInitialized(roomId: string) {
    if (!this.roomId) {
      initializeSchema(this.sql, roomId, Date.now());
      this.roomId = roomId;
    }
  }

  private async handleInit(request: Request) {
    const body = await this.readJson<{ displayLimit?: unknown; publicDisplay?: unknown }>(request);
    if (body && "displayLimit" in body) {
      const parsed = parseDisplayLimit(body.displayLimit);
      if (!parsed.ok) {
        return this.json({ error: parsed.error }, 400);
      }
      this.setDisplayWsLimit(parsed.value);
    }
    if (body && "publicDisplay" in body) {
      const parsed = parsePublicDisplay(body.publicDisplay);
      if (!parsed.ok) {
        return this.json({ error: parsed.error }, 400);
      }
      this.setPublicDisplay(parsed.value);
    }
    return this.json({
      ok: true,
      roomId: this.roomId,
      displayWsLimit: this.getDisplayWsLimit(),
      publicDisplay: this.getPublicDisplay()
    });
  }

  private async handlePair(request: Request) {
    const auth = this.requireToken(request, ["producer"]);
    if (auth instanceof Response) {
      return auth;
    }

    const body = (await request.json()) as { role?: Role; origin?: string };
    return this.issuePair(body);
  }

  private async handleBootstrap(request: Request) {
    const body = (await request.json()) as { origin?: string };
    const producer = await this.issuePairJson({ role: "producer", origin: body.origin });
    const display = await this.issuePairJson({ role: "display", origin: body.origin });
    return this.json({ token: producer.token, display });
  }

  private async handleAuthCheck(request: Request) {
    const url = new URL(request.url);
    const requiredRole = url.searchParams.get("role");
    if (requiredRole && requiredRole !== "display" && requiredRole !== "producer") {
      return this.json({ error: "invalid role" }, 400);
    }
    if (requiredRole === "display") {
      const auth = this.authorizeDisplay(request);
      if (auth instanceof Response) {
        return auth;
      }
      return this.json({ ok: true, role: auth.role, publicDisplay: auth.token === null });
    }
    const roles = requiredRole ? [requiredRole as Role] : undefined;
    const auth = this.requireToken(request, roles);
    if (auth instanceof Response) {
      return auth;
    }
    return this.json({ ok: true, role: auth.role, publicDisplay: false });
  }

  private issuePair(body: { role?: Role; origin?: string }) {
    const role = body.role;
    if (role !== "display" && role !== "producer") {
      return this.json({ error: "invalid role" }, 400);
    }

    if (role === "display" && this.getPublicDisplay()) {
      const response: PairResponse = {
        roomId: this.roomId!,
        role,
        link: `${body.origin}/rooms/${this.roomId}`
      };
      return this.json(response);
    }

    if (role === "display") {
      this.sql.exec(`DELETE FROM pair_tokens WHERE role = 'display'`);
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (role === "display" ? this.displayTokenTtlMs : this.producerTokenTtlMs);
    this.sql.exec(
      `INSERT INTO pair_tokens (token, role, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
      token,
      role,
      Date.now(),
      expiresAt
    );

    const response: PairResponse = {
      roomId: this.roomId!,
      role,
      token,
      ...(role === "display"
        ? { link: `${body.origin}/rooms/${this.roomId}?token=${token}` }
        : {})
    };
    return this.json(response);
  }

  private async issuePairJson(body: { role?: Role; origin?: string }) {
    const response = this.issuePair(body);
    return (await response.json()) as PairResponse;
  }

  private async handleState(request: Request) {
    const auth = this.requireToken(request);
    if (auth instanceof Response) {
      return auth;
    }

    return this.json(this.getSnapshot());
  }

  private async handleSchedule(request: Request) {
    const auth = this.requireToken(request, ["producer"]);
    if (auth instanceof Response) {
      return auth;
    }

    const body = (await request.json()) as
      | (ScheduleInput & {
          template?: string;
          templateInput?: SceneTemplateInput;
        })
      | null;
    if (!body) {
      return this.json({ error: "missing payload" }, 400);
    }

    const title = body.title?.trim();
    const startAt = Number(body.startAt);
    const durationMs = Number(body.durationMs);
    if (!title || !Number.isFinite(startAt) || !Number.isFinite(durationMs) || durationMs < 1_000) {
      return this.json({ error: "invalid schedule input" }, 400);
    }

    let markup = "";
    const rawMarkup = body.markup?.trim() ?? "";
    if (rawMarkup) {
      markup = rawMarkup;
    } else if (body.template && body.templateInput) {
      markup = buildTemplateMarkup(body.template, body.templateInput);
    }
    if (!markup) {
      return this.json({ error: "template scene payload required" }, 400);
    }

    const id = crypto.randomUUID();
    const endAt = startAt + durationMs;
    this.sql.exec(
      `INSERT INTO schedule_entries
        (id, title, markup, start_at, end_at, audio_asset_key, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      id,
      title,
      markup,
      startAt,
      endAt,
      body.audioAssetKey ?? null,
      Date.now()
    );
    this.sql.exec(`UPDATE room_state SET idle_since = NULL, cleanup_at = NULL WHERE id = 1`);

    await this.syncAlarm();
    this.broadcast({ type: "room_meta", snapshot: this.getSnapshot() });

    return this.json({ ok: true, id });
  }

  private async handleShowcase(request: Request) {
    const auth = this.requireToken(request, ["producer"]);
    if (auth instanceof Response) {
      return auth;
    }

    const now = Date.now();
    for (const entry of showcaseScenes(now)) {
      this.sql.exec(
        `INSERT INTO schedule_entries
          (id, title, markup, start_at, end_at, audio_asset_key, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
        crypto.randomUUID(),
        entry.title,
        buildTemplateMarkup(entry.template, {
          title: entry.title,
          headline: entry.headline,
          body: entry.body,
          accent: entry.accent,
          kicker: entry.kicker
        }),
        entry.startAt,
        entry.startAt + entry.durationMs,
        null,
        now
      );
    }

    this.sql.exec(`UPDATE room_state SET idle_since = NULL, cleanup_at = NULL WHERE id = 1`);
    await this.syncAlarm();
    this.broadcast({ type: "room_meta", snapshot: this.getSnapshot() });
    return this.json({ ok: true });
  }

  private async handleDelete(request: Request, options?: { force?: boolean }) {
    const auth = this.requireToken(request, ["producer"]);
    if (auth instanceof Response) {
      return auth;
    }

    const forced = options?.force === true;
    const connectedSockets = this.ctx.getWebSockets().length;
    if (!forced && connectedSockets > 0) {
      return this.json({
        error: "room has active connections; retry with force",
        connectedSockets
      }, 409);
    }

    let closedSockets = 0;
    for (const socket of this.ctx.getWebSockets()) {
      closedSockets += 1;
      try {
        socket.close(4003, "Room deleted");
      } catch {
        // Ignore stale sockets.
      }
    }

    const deletedRoomId = this.roomId;
    await this.cleanupRoom();

    return this.json({
      ok: true,
      roomId: deletedRoomId,
      closedSockets,
      forced
    });
  }

  private async handleTts(request: Request) {
    const auth = this.requireToken(request, ["producer"]);
    if (auth instanceof Response) {
      return auth;
    }

    if (!this.hasConnectedDisplay()) {
      return this.json({ error: "no display is currently connected to this room" }, 409);
    }

    const limited = await this.enforceRateLimit("tts", this.clientIp(request), {
      limit: Number(this.env.TTS_LIMIT || "3"),
      windowMs: Number(this.env.TTS_WINDOW_MS || "3600000")
    });
    if (limited) {
      return limited;
    }

    if (!this.env.ELEVENLABS_API_KEY) {
      return this.json({ error: "ELEVENLABS_API_KEY is not configured" }, 400);
    }

    const body = (await request.json()) as ElevenTtsInput;
    const text = body?.text?.trim();
    if (!text) {
      return this.json({ error: "text required" }, 400);
    }
    if (countWords(text) > this.ttsMaxWords) {
      return this.json({ error: `text exceeds ${this.ttsMaxWords} word limit` }, 400);
    }

    const voiceId = body.voiceId || this.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
    const modelId = body.modelId || "eleven_multilingual_v2";
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "audio/mpeg",
        "xi-api-key": this.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: modelId
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return this.json({ error: "elevenlabs request failed", detail }, 502);
    }

    const audio = await response.arrayBuffer();
    const dataUrl = `data:audio/mpeg;base64,${bufferToBase64(audio)}`;
    return this.json({
      key: dataUrl,
      name: body.filename?.trim() || "voice-inline.mp3",
      contentType: "audio/mpeg",
      sizeBytes: audio.byteLength,
      inline: true
    });
  }

  private async handleWebSocket(request: Request) {
    const auth = this.authorizeSocket(request);
    if (auth instanceof Response) {
      return auth;
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const role = auth.role;

    if (role === "display") {
      const limit = this.getDisplayWsLimit();
      if (limit !== null) {
        const activeDisplays = this.socketCounts().display;
        if (activeDisplays >= limit) {
          return this.json({
            error: "display websocket limit reached",
            displayWsLimit: limit,
            activeDisplays
          }, 429);
        }
      }
    }

    server.serializeAttachment({ role, token: auth.token });
    this.ctx.acceptWebSocket(server);

    this.sql.exec(`UPDATE room_state SET idle_since = NULL, cleanup_at = NULL WHERE id = 1`);
    await this.syncAlarm();
    server.send(JSON.stringify({ type: "snapshot", snapshot: this.getSnapshot() } satisfies SceneEnvelope));

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  private requireToken(request: Request, roles?: Role[]) {
    const token = this.extractToken(request);
    if (!token) {
      return this.json({ error: "missing token" }, 401);
    }

    const found = row<TokenRow>(
      this.sql.exec(
        `SELECT token, role, expires_at
         FROM pair_tokens
         WHERE token = ?`,
        token
      )
    );
    if (!found || found.expires_at < Date.now()) {
      return this.json({ error: "invalid token" }, 401);
    }
    if (roles && !roles.includes(found.role)) {
      return this.json({ error: "forbidden" }, 403);
    }
    return found;
  }

  private authorizeDisplay(request: Request): AuthResult | Response {
    const token = this.extractToken(request);
    if (!token && this.getPublicDisplay()) {
      return { role: "display", token: null };
    }
    const auth = this.requireToken(request, ["display"]);
    if (auth instanceof Response) {
      return auth;
    }
    return { role: auth.role, token: auth.token };
  }

  private authorizeSocket(request: Request): AuthResult | Response {
    const token = this.extractToken(request);
    if (!token && this.getPublicDisplay()) {
      return { role: "display", token: null };
    }
    const auth = this.requireToken(request);
    if (auth instanceof Response) {
      return auth;
    }
    return { role: auth.role, token: auth.token };
  }

  private extractToken(request: Request) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      return auth.slice(7);
    }
    const url = new URL(request.url);
    const searchToken = url.searchParams.get("token");
    if (searchToken) {
      return searchToken;
    }
    return this.extractDisplayCookieToken(request.headers.get("cookie"));
  }

  private extractDisplayCookieToken(cookieHeader: string | null) {
    if (!cookieHeader || !this.roomId) {
      return null;
    }
    const name = `walla-display-${this.roomId}`;
    for (const entry of cookieHeader.split(";")) {
      const trimmed = entry.trim();
      if (!trimmed.startsWith(`${name}=`)) {
        continue;
      }
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
    return null;
  }

  private getSnapshot(): RoomSnapshot {
    const roomState = this.getRoomState();
    const counts = this.socketCounts();
    return {
      roomId: this.roomId!,
      now: Date.now(),
      publicDisplay: this.getPublicDisplay(),
      displayWsLimit: this.getDisplayWsLimit(),
      currentScene: this.getCurrentScene(),
      upcomingScenes: this.sql
        .exec<{
          id: string;
          title: string;
          markup: string;
          start_at: number;
          end_at: number;
          audio_asset_key: string | null;
          status: "scheduled" | "played" | "cancelled";
          created_at: number;
        }>(
          `SELECT id, title, markup, start_at, end_at, audio_asset_key, status, created_at
           FROM schedule_entries
           WHERE status = 'scheduled'
           ORDER BY start_at ASC
           LIMIT 12`
        )
        .toArray()
        .map(this.mapScene),
      sockets: counts,
      loopAudio: {
        assetKey: roomState.current_loop_asset_key,
        volume: roomState.current_loop_volume,
        until: roomState.current_loop_until
      },
      idleSince: roomState.idle_since,
      cleanupAt: roomState.cleanup_at
    };
  }

  private getRoomState(): RoomStateRow {
    const state = row<RoomStateRow>(
      this.sql.exec(
        `SELECT room_id, active_scene_id, idle_since, cleanup_at
                , current_loop_asset_key, current_loop_volume, current_loop_until
         FROM room_state
         WHERE id = 1`
      )
    );
    if (!state) {
      throw new Error("room state missing");
    }
    return state;
  }

  private getCurrentScene() {
    const roomState = this.getRoomState();
    if (!roomState.active_scene_id) {
      return null;
    }

    return this.getSceneById(roomState.active_scene_id);
  }

  private getSceneById(sceneId: string): SceneRecord | null {
    const scene = row<{
      id: string;
      title: string;
      markup: string;
      start_at: number;
      end_at: number;
      audio_asset_key: string | null;
      status: "scheduled" | "played" | "cancelled";
      created_at: number;
    }>(
      this.sql.exec(
        `SELECT id, title, markup, start_at, end_at, audio_asset_key, status, created_at
         FROM schedule_entries
         WHERE id = ?`,
        sceneId
      )
    );

    return scene ? this.mapScene(scene) : null;
  }

  private mapScene = (scene: {
    id: string;
    title: string;
    markup: string;
    start_at: number;
    end_at: number;
    audio_asset_key: string | null;
    status: "scheduled" | "played" | "cancelled";
    created_at: number;
  }): SceneRecord => ({
    id: scene.id,
    title: scene.title,
    markup: scene.markup,
    startAt: scene.start_at,
    endAt: scene.end_at,
    audioAssetKey: scene.audio_asset_key,
    status: scene.status,
    createdAt: scene.created_at
  });

  private socketCounts() {
    const counts = {
      display: 0,
      producer: 0
    };
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as { role?: Role } | null;
      if (attachment?.role === "display") {
        counts.display += 1;
      } else if (attachment?.role === "producer") {
        counts.producer += 1;
      }
    }
    return counts;
  }

  private hasConnectedDisplay() {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as { role?: Role } | null;
      if (attachment?.role === "display") {
        return true;
      }
    }
    return false;
  }

  private getDisplayWsLimit() {
    const stored = row<{ value: string }>(
      this.sql.exec(
        `SELECT value
         FROM room_settings
         WHERE key = 'display_ws_limit'`
      )
    );
    if (!stored) {
      return null;
    }
    const parsed = parseDisplayLimit(stored.value);
    return parsed.ok ? parsed.value : null;
  }

  private getPublicDisplay() {
    const stored = row<{ value: string }>(
      this.sql.exec(
        `SELECT value
         FROM room_settings
         WHERE key = 'public_display'`
      )
    );
    if (!stored) {
      return false;
    }
    return stored.value === "1";
  }

  private setDisplayWsLimit(limit: number | null) {
    if (limit === null) {
      this.sql.exec(`DELETE FROM room_settings WHERE key = 'display_ws_limit'`);
      return;
    }
    this.sql.exec(
      `INSERT INTO room_settings (key, value)
       VALUES ('display_ws_limit', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      String(limit)
    );
  }

  private setPublicDisplay(value: boolean) {
    this.sql.exec(
      `INSERT INTO room_settings (key, value)
       VALUES ('public_display', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      value ? "1" : "0"
    );
  }

  private async syncAlarm() {
    const now = Date.now();
    const roomState = this.getRoomState();
    const currentScene = this.getCurrentScene();
    const nextScheduled = row<{ start_at: number }>(
      this.sql.exec(
        `SELECT start_at
         FROM schedule_entries
         WHERE status = 'scheduled'
         ORDER BY start_at ASC
         LIMIT 1`
      )
    );

    const candidates = [
      currentScene?.endAt ?? null,
      roomState.current_loop_until ?? null,
      nextScheduled?.start_at ?? null,
      roomState.cleanup_at ?? null
    ]
      .filter((value): value is number => value !== null && value > now)
      .sort((a, b) => a - b);

    const next = candidates[0];
    if (next) {
      await this.ctx.storage.setAlarm(next);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private shouldRunCleanup(now: number) {
    const roomState = this.getRoomState();
    if (!roomState.cleanup_at || roomState.cleanup_at > now) {
      return false;
    }
    const nextScheduled = row<{ count: number }>(
      this.sql.exec(
        `SELECT COUNT(*) AS count
         FROM schedule_entries
         WHERE status = 'scheduled' AND start_at > ?`,
        now
      )
    );
    return this.ctx.getWebSockets().length === 0 && (nextScheduled?.count ?? 0) === 0;
  }

  private async cleanupRoom() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.roomId = null;
  }

  private broadcast(envelope: SceneEnvelope) {
    const payload = JSON.stringify(envelope);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch {
        // Ignore stale sockets; Cloudflare will close them.
      }
    }
  }

  private clientIp(request: Request) {
    const forwarded = request.headers.get("cf-connecting-ip")
      || request.headers.get("x-forwarded-for")
      || request.headers.get("x-real-ip");
    return forwarded?.split(",")[0]?.trim() || "unknown";
  }

  private isForceDelete(request: Request) {
    const value = new URL(request.url).searchParams.get("force");
    if (!value) {
      return false;
    }
    return value === "1" || value === "true" || value === "yes";
  }

  private async enforceRateLimit(
    action: string,
    ip: string,
    config: { limit: number; windowMs: number }
  ) {
    const id = this.env.RATE_LIMITER.idFromName(`${action}:${ip}`);
    const stub = this.env.RATE_LIMITER.get(id);
    const response = await stub.fetch("https://rate-limiter/internal/hit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config)
    });
    const payload = await response.json().catch(() => null) as { ok?: boolean; retryAfterMs?: number } | null;
    if (payload?.ok !== false) {
      return null;
    }
    return new Response(JSON.stringify({
      error: "rate limit exceeded",
      retryAfterMs: payload.retryAfterMs ?? null
    }), {
      status: 429,
      headers: { "content-type": "application/json" }
    });
  }

  private async readJson<T>(request: Request): Promise<T | null> {
    const text = await request.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  private json(data: unknown, status = 200) {
    return Response.json(data, { status });
  }

  private get idleTtlMs() {
    return Number(this.env.ROOM_IDLE_TTL_MS || "604800000");
  }

  private get ttsMaxWords() {
    return Number(this.env.TTS_MAX_WORDS || "60");
  }

  private get displayTokenTtlMs() {
    return Number(this.env.DISPLAY_TOKEN_TTL_MS || "900000");
  }

  private get producerTokenTtlMs() {
    return Number(this.env.PRODUCER_TOKEN_TTL_MS || "604800000");
  }
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function parseDisplayLimit(value: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === null || value === undefined || value === "" || value === "0" || value === 0) {
    return { ok: true, value: null };
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { ok: false, error: "displayLimit must be an integer >= 1, or 0 for unlimited" };
  }
  return { ok: true, value: parsed };
}

function parsePublicDisplay(value: unknown): { ok: true; value: boolean } | { ok: false; error: string } {
  if (typeof value !== "boolean") {
    return { ok: false, error: "publicDisplay must be a boolean" };
  }
  return { ok: true, value };
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
