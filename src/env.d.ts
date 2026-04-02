interface Env {
  ROOMS: DurableObjectNamespace<import("./durable/room").RoomDO>;
  RATE_LIMITER: DurableObjectNamespace<import("./durable/rate-limiter").RateLimiterDO>;
  ROOM_IDLE_TTL_MS: string;
  BASE_URL?: string;
  CREATE_ROOM_LIMIT?: string;
  CREATE_ROOM_WINDOW_MS?: string;
  TTS_LIMIT?: string;
  TTS_WINDOW_MS?: string;
  TTS_MAX_WORDS?: string;
  DISPLAY_TOKEN_TTL_MS?: string;
  PRODUCER_TOKEN_TTL_MS?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}
