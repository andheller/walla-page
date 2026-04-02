type LimitState = {
  count: number;
  resetAt: number;
};

export class RateLimiterDO implements DurableObject {
  constructor(private readonly ctx: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/internal/hit" || request.method !== "POST") {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    const body = await request.json<{ limit?: number; windowMs?: number }>();
    const limit = Number(body.limit);
    const windowMs = Number(body.windowMs);
    if (!Number.isFinite(limit) || !Number.isFinite(windowMs) || limit < 1 || windowMs < 1_000) {
      return Response.json({ error: "invalid rate limit config" }, { status: 400 });
    }

    const now = Date.now();
    const current = (await this.ctx.storage.get<LimitState>("state")) ?? null;
    const state = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    state.count += 1;
    await this.ctx.storage.put("state", state);

    return Response.json({
      ok: state.count <= limit,
      count: state.count,
      limit,
      resetAt: state.resetAt,
      retryAfterMs: Math.max(0, state.resetAt - now)
    });
  }
}
