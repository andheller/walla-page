# Walla Page

Walla Page is a CLI-first wall runtime for agents.

One room maps to one Cloudflare Durable Object. A controller (CLI/API/agent) schedules scenes and speech. Display clients subscribe over WebSocket and render the live state.

## Package Manager

This project uses `npm`.

- Install dependencies with `npm install`
- Run the CLI locally with `npm run walla -- ...`
- Publish the package to npm as `walla-page`

Keeping one lockfile is simpler for contributors, and `npm` is the most common default in open source JavaScript projects.

## Install

The published npm package is just the Node CLI. Installing it does not require Wrangler.

For CLI users:

```bash
npm install -g walla-page
walla help
```

For local development in this repo:

```bash
npm install
```

Wrangler is only needed if you are developing or deploying the Cloudflare worker from this repository.

## Contributing

```bash
npm install
npm run walla -- help
```

## Scope (Current Build)

- Control plane is CLI/API only
- Display UI is receiver-only (no room creation web app)
- No R2 dependency

This keeps the hackathon surface area small and testable.

## Core Capabilities

- Show fullscreen HTML now (`show`)
- Schedule fullscreen HTML for later (`schedule`)
- Generate ElevenLabs speech and schedule it (`say`)
- Delete room state and disconnect clients (`delete`, `delete --force`)
- Rotate display access token (`display`)

## Current Behavior Notes

- `delete --force` is the explicit “disconnect clients and remove room state” path.

## Security Model

- Capability token auth for room operations
- Separate room-control and display token roles
- Display page requires user click (`Load Wall`) before connecting/playing audio
- Scene HTML is rendered in a sandboxed iframe (`srcdoc`)
- TTS is rejected unless at least one display websocket is connected
- TTS has server-side word limit (`TTS_MAX_WORDS`)
- CLI validates `say` word count up front (`--max-words`)

## Room Model

One room contains:

- Current scene
- Scheduled upcoming scenes
- Pair tokens for room control and display access
- Live websocket sessions
- Room settings (for example display websocket limit)

## Display Fanout and Limits

Displays are multi-screen by default.

- Default: unlimited display websocket connections per room
- Optional cap at room creation via `displayLimit`
- When capped and full, new display ws attempts return `429`

CLI flag:

- `walla create --display-limit <n>`
- `n >= 1` sets a cap
- `0` means unlimited

## Alarm + Lifecycle

Each room maintains one DO alarm set to the next relevant timestamp:

- next scheduled scene start
- current scene end
- cleanup deadline

On alarm:

1. expire finished scene
2. activate due scenes
3. evaluate cleanup conditions
4. set next alarm

## Cleanup Semantics

### Automatic

- When last socket disconnects, room sets `idleSince` and `cleanupAt`
- Default idle TTL is 7 days (`ROOM_IDLE_TTL_MS=604800000`)
- If no sockets and no future scenes at cleanup time, room storage is deleted

### Explicit

- `DELETE /api/rooms/:roomId`
- `walla delete [--force]`

Without `--force`, delete fails with `409` if sockets are connected.  
With `--force`, all sockets are closed and room state is removed.

## CLI

Run:

```bash
npm run walla -- help
```

Commands:

- `walla create [--display-limit <n>]`
- `walla delete [--force]`
- `walla display`
- `walla config`
- `walla logout`
- `walla status`
- `walla quickstart`
- `walla show <file.html> [--title <title>] [--duration <seconds>]`
- `walla schedule <file.html> --at <time> [--title <title>] [--duration <seconds>]`
- `walla say <text> [--at <time>] [--title <title>] [--duration <seconds>] [--voice-id <id>] [--max-words <n>]`

Config file:

```text
~/.config/wallapage/config.json
```

## HTTP API

Room lifecycle:

- `POST /api/rooms`
- `DELETE /api/rooms/:roomId` (`?force=1` for forced delete)

Room operations:

- `GET /api/rooms/:roomId/state`
- `POST /api/rooms/:roomId/pair`
- `POST /api/rooms/:roomId/schedule`
- `POST /api/rooms/:roomId/tts`
- `POST /api/rooms/:roomId/showcase`
- `GET /api/rooms/:roomId/ws`

Create payload:

```json
{
  "displayLimit": 0
}
```

- `displayLimit >= 1`: cap displays
- `displayLimit = 0` or omitted: unlimited

Display route:

- `GET /rooms/:roomId/display?token=...`

Built-in audio route (allow-listed asset endpoint):

- `GET /audio/campfire.mp3`

## Quickstart

Install and run local worker:

```bash
npm install
npm run dev
```

Create room (unlimited displays):

```bash
npm run walla -- create
```

Or create room with display cap:

```bash
npm run walla -- create --display-limit 4
```

Open printed display URL on wall screens and click `Load Wall`.

Drive the room:

```bash
npm run walla -- status
npm run walla -- show ./examples/campfire.html --duration 120
npm run walla -- say "Dinner in five minutes."
npm run walla -- delete
# if displays are still connected:
npm run walla -- delete --force
```

## Environment

Worker vars:

- `BASE_URL`
- `ROOM_IDLE_TTL_MS`
- `CREATE_ROOM_LIMIT`
- `CREATE_ROOM_WINDOW_MS`
- `TTS_LIMIT`
- `TTS_WINDOW_MS`
- `TTS_MAX_WORDS`
- `DISPLAY_TOKEN_TTL_MS`
- `PRODUCER_TOKEN_TTL_MS`

Secrets:

- `ELEVENLABS_API_KEY` (required for `say` / `/tts`)
- `ELEVENLABS_VOICE_ID` (optional default voice)

Set secret:

```bash
npx wrangler secret put ELEVENLABS_API_KEY
```

Deploy:

```bash
npm run deploy
```

## Testing

Typecheck:

```bash
npm run check
```

Smoke test:

```bash
npm run test:smoke
```

## Future (Post-Hackathon)

- Multi-tenant room ownership and room listing
- PIN-based short display URLs
- Expanded allow-listed audio catalog
- More policy controls (rate/quotas by room/tenant)
