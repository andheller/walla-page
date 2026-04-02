import { Context, Hono } from "hono";
import { RoomDO } from "./durable/room";
import { RateLimiterDO } from "./durable/rate-limiter";
import { WALLA_LOGO_WEBP_BASE64 } from "./ui/logo";
import { getScenePreset, buildTemplateMarkup, scenePresets } from "./lib/templates";
import { getBuiltinLoop } from "./lib/loops";
import { TEST_HI_MP3_BASE64 } from "./lib/test-audio";
import { landingPage, displayPage, demoIndexPage, publicDemoPage, notFoundPage } from "./ui/pages";
import { ambientExamplePage } from "./ui/examples";

export { RoomDO };
export { RateLimiterDO };

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.html(landingPage(originFromRequest(c.env, c.req.raw), scenePresets)));
app.get("/demo", (c) => c.html(demoIndexPage(scenePresets)));
app.get("/test-sound", (c) => c.html(cTestSoundPage()));
app.get("/demo/:presetId", (c) => {
  const preset = getScenePreset(c.req.param("presetId"));
  if (!preset) {
    return c.text("Demo not found", 404);
  }
  return c.html(publicDemoPage(preset, buildTemplateMarkup(preset.template, preset)));
});
app.get("/examples/:exampleId", (c) => {
  const page = ambientExamplePage(c.req.param("exampleId"));
  if (!page) {
    return c.text("Example not found", 404);
  }
  return c.html(page);
});

app.get("/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const token = c.req.query("token");
  const auth = await authorizeRoomPage(c.env, roomId, c.req.raw, "display");
  if (!auth.ok) {
    return new Response("Invalid or expired token", { status: auth.status });
  }
  if (token) {
    return new Response(null, {
      status: 302,
      headers: {
        location: `/rooms/${roomId}`,
        "set-cookie": displayCookie(roomId, token, c.env)
      }
    });
  }
  return c.html(displayPage(roomId));
});

app.get("/audio/*", async (c) => {
  const pathname = new URL(c.req.url).pathname;
  const filename = pathname.slice("/audio/".length);
  if (!filename.endsWith(".mp3")) {
    return c.text("Audio not found", 404);
  }
  const soundId = decodeURIComponent(filename.slice(0, -".mp3".length));
  if (!soundId) {
    return c.text("Audio not found", 404);
  }
  if (soundId === "test-hi") {
    return new Response(decodeBase64(TEST_HI_MP3_BASE64), {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  }
  const sound = getBuiltinLoop(soundId);
  if (!sound) {
    return c.text("Audio not found", 404);
  }
  const upstream = await fetch(sound.url);
  if (!upstream.ok) {
    return c.text("Audio unavailable", 502);
  }
  const headers = new Headers(upstream.headers);
  headers.set("content-type", sound.contentType);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(upstream.body, { status: 200, headers });
});

app.get("/app/landing.js", (c) => c.body(landingScript, 200, { "content-type": "application/javascript; charset=utf-8" }));
app.get("/app/display.js", (c) => c.body(displayScript, 200, { "content-type": "application/javascript; charset=utf-8" }));
app.get("/brand/logo.webp", () =>
  new Response(decodeBase64(WALLA_LOGO_WEBP_BASE64), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable"
    }
  })
);

app.post("/api/rooms", async (c) => {
  const limited = await enforceRateLimit(c.env, "create-room", clientIp(c.req.raw), {
    limit: Number(c.env.CREATE_ROOM_LIMIT || "5"),
    windowMs: Number(c.env.CREATE_ROOM_WINDOW_MS || "600000")
  });
  if (limited) {
    return limited;
  }

  const roomId = shortId();
  const origin = originFromRequest(c.env, c.req.raw);
  const stub = roomStub(c.env, roomId);
  const body = await c.req.json<{ displayLimit?: unknown }>().catch(() => null);
  const initPayload = {
    displayLimit: body?.displayLimit
  };

  await stub.fetch(new Request("https://room/internal/init", {
    method: "POST",
    headers: roomHeaders(roomId, { "content-type": "application/json" }),
    body: JSON.stringify(initPayload)
  }));

  const bootstrap = await jsonFetch<{ token: string; display: unknown }>(stub, roomId, "/internal/bootstrap", {
    method: "POST",
    body: JSON.stringify({ origin }),
    headers: { "content-type": "application/json" }
  });

  return c.json({
    roomId,
    token: bootstrap.token,
    display: bootstrap.display
  });
});

app.get("/api/rooms/:roomId/state", async (c) => {
  const response = await proxyJson(c.env, c.req.param("roomId"), "/internal/state", c.req.raw);
  return response;
});

app.post("/api/rooms/:roomId/pair", async (c) => {
  const origin = originFromRequest(c.env, c.req.raw);
  const raw = c.req.raw.clone();
  const body = await raw.json();
  return proxyJson(
    c.env,
    c.req.param("roomId"),
    "/internal/pair",
    new Request(c.req.raw.url, {
      method: "POST",
      headers: c.req.raw.headers,
      body: JSON.stringify({ ...(body as object), origin })
    })
  );
});

app.post("/api/rooms/:roomId/schedule", async (c) => {
  return proxyJson(c.env, c.req.param("roomId"), "/internal/schedule", c.req.raw);
});

app.delete("/api/rooms/:roomId", async (c) => {
  return proxyJson(c.env, c.req.param("roomId"), "/internal/delete", c.req.raw);
});

app.post("/api/rooms/:roomId/showcase", async (c) => {
  return proxyJson(c.env, c.req.param("roomId"), "/internal/showcase", c.req.raw);
});

app.post("/api/rooms/:roomId/tts", async (c) => {
  return proxyJson(c.env, c.req.param("roomId"), "/internal/tts", c.req.raw);
});

app.get("/api/rooms/:roomId/ws", async (c) => {
  const stub = roomStub(c.env, c.req.param("roomId"));
  return stub.fetch(withRoomHeaders(c.req.raw, c.req.param("roomId"), "/internal/ws"));
});

app.notFound((c) => c.html(notFoundPage(), 404));

export default app;

function roomStub(env: Env, roomId: string) {
  return env.ROOMS.get(env.ROOMS.idFromName(roomId));
}

function roomHeaders(roomId: string, headers?: HeadersInit) {
  const next = new Headers(headers);
  next.set("x-room-id", roomId);
  return next;
}

function withRoomHeaders(request: Request, roomId: string, path: string) {
  const source = new URL(request.url);
  const target = new URL(path, source.origin);
  target.search = source.search;
  return new Request(target.toString(), {
    method: request.method,
    headers: roomHeaders(roomId, request.headers),
    body: request.body
  } as RequestInit);
}

async function proxyJson(env: Env, roomId: string, path: string, request: Request) {
  const stub = roomStub(env, roomId);
  return stub.fetch(withRoomHeaders(request, roomId, path));
}

async function authorizeRoomPage(env: Env, roomId: string, request: Request, role: "producer" | "display") {
  const stub = roomStub(env, roomId);
  const source = new URL(request.url);
  const target = new URL(`https://room/internal/auth-check`);
  target.search = source.search;
  target.searchParams.set("role", role);
  const response = await stub.fetch(new Request(target.toString(), {
    method: "GET",
    headers: roomHeaders(roomId, request.headers)
  }));
  return { ok: response.ok, status: response.status };
}

async function enforceRateLimit(
  env: Env,
  action: string,
  ip: string,
  config: { limit: number; windowMs: number }
) {
  const id = env.RATE_LIMITER.idFromName(`${action}:${ip}`);
  const stub = env.RATE_LIMITER.get(id);
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

function clientIp(request: Request) {
  const forwarded = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function displayCookie(roomId: string, token: string, env: Env) {
  const maxAge = Math.max(1, Math.floor(Number(env.DISPLAY_TOKEN_TTL_MS || "900000") / 1000));
  return [
    `${displayCookieName(roomId)}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");
}

function displayCookieName(roomId: string) {
  return `walla-display-${roomId}`;
}

async function jsonFetch<T>(stub: DurableObjectStub, roomId: string, path: string, init: RequestInit): Promise<T> {
  const response = await stub.fetch(new Request(`https://room${path}`, {
    ...init,
    headers: roomHeaders(roomId, init.headers)
  }));
  return response.json<T>();
}

function originFromRequest(env: Env, request: Request) {
  if (env.BASE_URL) {
    return env.BASE_URL.replace(/\/+$/, "");
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function shortId() {
  return crypto.randomUUID().split("-")[0];
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function cTestSoundPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Test Sound / Walla Page</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        background: #050505;
        color: white;
        font-family: Inter, system-ui, sans-serif;
      }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: min(560px, 100%);
        text-align: center;
      }
      .eyebrow {
        color: rgba(255,255,255,0.45);
        font-size: 15px;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 20px;
      }
      h1 {
        margin: 0 0 16px;
        font-size: clamp(40px, 7vw, 72px);
        line-height: 0.98;
        letter-spacing: -0.06em;
      }
      p {
        margin: 0 0 28px;
        color: rgba(255,255,255,0.5);
        font-size: 18px;
        line-height: 1.6;
      }
      button {
        width: 100%;
        border: 0;
        border-radius: 999px;
        background: white;
        color: black;
        font-size: 17px;
        font-weight: 700;
        padding: 16px 20px;
        cursor: pointer;
      }
      .status {
        margin-top: 18px;
        color: rgba(255,255,255,0.55);
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="eyebrow">Walla Page</div>
      <h1>Test sound.</h1>
      <p>Use this page to confirm that the browser can unlock and play wall audio.</p>
      <button id="play">Play test sound</button>
      <div id="status" class="status">Ready.</div>
    </div>
    <script>
      const button = document.getElementById("play");
      const status = document.getElementById("status");
      button.addEventListener("click", async () => {
        try {
          const audio = new Audio("/audio/test-hi.mp3");
          audio.volume = 1;
          await audio.play();
          status.textContent = "Test sound playing.";
        } catch (error) {
          status.textContent = "Sound failed to play in this browser.";
        }
      });
    </script>
  </body>
</html>`;
}

const landingScript = `
`;

const displayScript = `
const config = JSON.parse(document.getElementById("walla-config").textContent);
const roomId = config.roomId;
const sceneFrame = document.getElementById("scene-frame");
const shell = document.getElementById("display-shell");
const card = document.getElementById("display-card");
const statusEl = document.getElementById("display-status");
const overlayButton = document.getElementById("display-overlay");
const testSoundButton = document.getElementById("display-test-sound");
let audioEnabled = false;
let audioContext;
let currentAudio;
let loopAudio;
let lastSceneId = null;
let lastLoopKey = null;
let needsGesture = false;
let hasStarted = false;
let currentScene = null;
let currentLoopState = null;

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function isFullDocument(markup) {
  return /<!doctype html>|<html[\\s>]|<head[\\s>]|<body[\\s>]/i.test(markup);
}

function sceneDoc(markup) {
  if (isFullDocument(markup)) {
    return markup;
  }
  return \`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; media-src data: https:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
      }
    </style>
  </head>
  <body>\${markup}</body>
</html>\`;
}

async function unlockAudio() {
  if (audioEnabled) return;
  audioContext = audioContext || new AudioContext();
  await audioContext.resume();
  const buffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
  try {
    const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    await silent.play();
    silent.pause();
  } catch {}
  audioEnabled = true;
  needsGesture = false;
  hideOverlay();
}

function showOverlay(label) {
  if (!overlayButton) return;
  needsGesture = true;
  overlayButton.textContent = label;
  overlayButton.style.display = "block";
}

function hideOverlay() {
  if (!overlayButton) return;
  overlayButton.style.display = "none";
}

async function playTestSound() {
  await unlockAudio();
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    currentAudio = new Audio("/audio/test-hi.mp3");
    currentAudio.volume = 1;
    await currentAudio.play();
    setStatus("Test sound playing.");
  } catch {
    showOverlay("Click to enable sound");
  }
}

function assetUrl(key) {
  if (!key) return null;
  if (key.startsWith("builtin:")) {
    return \`/audio/\${encodeURIComponent(key.slice("builtin:".length))}.mp3\`;
  }
  if (key.startsWith("data:audio/")) {
    return key;
  }
  return null;
}

async function playAudioForScene(scene) {
  if (!scene?.audioAssetKey || !audioEnabled) return;
  const url = assetUrl(scene.audioAssetKey);
  if (!url) return;
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    currentAudio = new Audio(url);
    currentAudio.volume = 1;
    await currentAudio.play();
  } catch {}
}

async function applyLoop(loopState) {
  currentLoopState = loopState || null;
  const nextKey = loopState?.assetKey || null;
  const nextVolume = typeof loopState?.volume === "number" ? loopState.volume : 0.3;

  if (!audioEnabled) return;

  if (!nextKey) {
    if (loopAudio) {
      loopAudio.pause();
      loopAudio = null;
    }
    lastLoopKey = null;
    return;
  }

  if (!loopAudio || lastLoopKey !== nextKey) {
    const url = assetUrl(nextKey);
    if (!url) {
      return;
    }
    if (loopAudio) {
      loopAudio.pause();
      loopAudio = null;
    }
    loopAudio = new Audio(url);
    loopAudio.loop = true;
    loopAudio.volume = nextVolume;
    lastLoopKey = nextKey;
    try {
      await loopAudio.play();
    } catch {}
    return;
  }

  loopAudio.volume = nextVolume;
}

async function applyScene(scene) {
  currentScene = scene || null;
  if (!scene) {
    sceneFrame.removeAttribute("srcdoc");
    sceneFrame.style.display = "none";
    if (card) card.style.display = "block";
    setStatus("Waiting for a scene\u2026");
    lastSceneId = null;
    return;
  }

  sceneFrame.srcdoc = sceneDoc(scene.markup);
  sceneFrame.style.display = "block";
  if (card) card.style.display = "none";
  if (scene.id !== lastSceneId) {
    lastSceneId = scene.id;
    await playAudioForScene(scene);
  }
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(\`\${protocol}://\${location.host}/api/rooms/\${roomId}/ws\`);

  socket.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "snapshot") {
      await applyLoop(message.snapshot.loopAudio);
      await applyScene(message.snapshot.currentScene);
    }
    if (message.type === "scene_changed") {
      await applyScene(message.scene);
    }
    if (message.type === "room_meta") {
      await applyLoop(message.snapshot.loopAudio);
    }
  });

  socket.addEventListener("close", () => {
    if (loopAudio) {
      loopAudio.pause();
      loopAudio = null;
    }
    lastLoopKey = null;
    sceneFrame.style.display = "none";
    sceneFrame.removeAttribute("srcdoc");
    if (card) card.style.display = "block";
    setStatus("Connection lost. Reconnecting...");
    setTimeout(connect, 1500);
  });
}

async function handleGesture() {
  if (!hasStarted) {
    hasStarted = true;
    setStatus("Connecting...");
    connect();
  }
  await unlockAudio();
  if (currentLoopState) {
    await applyLoop(currentLoopState);
  }
  if (currentScene) {
    await playAudioForScene(currentScene);
  }
  if (loopAudio && loopAudio.paused) {
    try {
      await loopAudio.play();
    } catch {}
  }
}

overlayButton?.addEventListener("click", handleGesture);
testSoundButton?.addEventListener("click", playTestSound);
showOverlay("Click to start wall");
`;
