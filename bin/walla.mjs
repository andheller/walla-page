#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".config", "wallapage");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const LEGACY_CONFIG_PATH = path.join(os.homedir(), ".config", "wallapalooza", "config.json");
const DEFAULT_TTS_MAX_WORDS = 60;
const DEFAULT_SERVER = "https://wallapage.redo-page-8fa.workers.dev";

async function main() {
  const args = process.argv.slice(2);
  const command = args.shift();

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case "create":
        await createRoom(args);
        return;
      case "delete":
        await deleteCurrentRoom(args);
        return;
      case "display":
        await displayLink(args);
        return;
      case "config":
        await showConfig(args);
        return;
      case "logout":
        await clearConfig();
        return;
      case "status":
        await status();
        return;
      case "quickstart":
        quickstart();
        return;
      case "show":
        await showOrSchedule("show", args);
        return;
      case "schedule":
        await showOrSchedule("schedule", args);
        return;
      case "say":
        await say(args);
        return;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function printHelp() {
  console.log(`Walla Page CLI

Usage:
  walla create [--display-limit <n>] [--server <url>]
  walla delete [--force]
  walla display
  walla config [--server <url>]
  walla logout
  walla status
  walla quickstart
  walla show <file.html> [--title <title>] [--duration <seconds>]
  walla schedule <file.html> --at <time> [--title <title>] [--duration <seconds>]
  walla say <text> [--at <time>] [--title <title>] [--duration <seconds>] [--voice-id <id>] [--max-words <n>]

Notes:
  - HTML scene commands send raw HTML directly to the room runtime.
  - Times can be ISO timestamps, "now", or relative values like "+5m", "+30s", "+2h".
  - Set WALLA_SERVER or use --server to point the CLI at a different backend.
  - The default CLI flow is create -> open display -> status/show/say. Use delete to remove a room and display to rotate the wall link.`);
}

function quickstart() {
  console.log(`Wall quickstart

1. Create a room:
   walla create
   walla create --keep
2. Open the printed display link on the wall screen.
3. Inspect the room:
   walla status
4. Generate speech:
   walla say "Dinner soon."
5. Delete room state when finished:
   walla delete
   walla delete --force

Notes:
- The display browser should be clicked once with "Load Wall" to unlock audio and join the live room.`);
}

async function createRoom(args) {
  const flags = parseFlags(args);
  const existing = await maybeCurrentRoom();
  const server = resolveServer(existing, flags.server);
  const displayLimit = parseDisplayLimitFlag(flags["display-limit"]);
  const created = await fetchJson(`${server}/api/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayLimit })
  });
  const next = await upsertRoom({
    server,
    roomId: created.roomId,
    token: created.token ?? created.producer?.token
  }, { voiceId: flags["voice-id"] || null });

  console.log(`Created room ${created.roomId}`);
  console.log(`Default room set to ${created.roomId}`);
  if (existing && existing.roomId !== created.roomId) {
    console.log(`Previous room still saved: ${existing.roomId}`);
  }
  if (displayLimit !== null) {
    console.log(`Display WS limit: ${displayLimit}`);
  } else {
    console.log("Display WS limit: unlimited");
  }
  console.log(`Display: ${created.display.link}`);
  await saveConfig(next);
}

async function displayLink() {
  const room = await requireCurrentRoom();
  const pair = await api(room, "POST", `/api/rooms/${room.roomId}/pair`, { role: "display" });
  console.log(pair.link);
}

async function deleteCurrentRoom(args = []) {
  const flags = parseFlags(args);
  const force = Boolean(flags.force);
  const config = await loadConfig();
  if (!config) {
    throw new Error("No Walla Page config saved. Run `walla create` first.");
  }

  const roomId = config.currentRoomId;
  const room = roomId ? config.rooms?.[roomId] : null;
  if (!room) {
    throw new Error("No current Walla Page room configured. Run `walla create` first.");
  }

  const deleted = await deleteRoomByConfig(room, { force });
  if (!deleted) {
    if (force) {
      throw new Error(`Failed to force-delete room ${room.roomId}`);
    }
    throw new Error(`Failed to delete room ${room.roomId}. If displays are connected, retry with --force.`);
  }

  delete config.rooms[room.roomId];
  config.currentRoomId = Object.keys(config.rooms)[0] ?? null;

  if (!config.currentRoomId) {
    await rm(CONFIG_PATH, { force: true });
    console.log(`Deleted room ${room.roomId}${force ? " (forced)" : ""}`);
    console.log("Removed local CLI config.");
    return;
  }

  await saveConfig(config);
  console.log(`Deleted room ${room.roomId}${force ? " (forced)" : ""}`);
}

async function showConfig(args = []) {
  const flags = parseFlags(args);
  if (typeof flags.server === "string") {
    await setCurrentRoomServer(flags.server);
    return;
  }
  const config = await loadConfig();
  if (!config) {
    console.log("No Walla Page config saved.");
    return;
  }
  console.log(JSON.stringify(config, null, 2));
}

async function clearConfig() {
  await rm(CONFIG_PATH, { force: true });
  console.log("Cleared Walla Page CLI config.");
}

async function status() {
  const room = await requireCurrentRoom();
  const snapshot = await api(room, "GET", `/api/rooms/${room.roomId}/state?token=${encodeURIComponent(room.token)}`);
  console.log(JSON.stringify({
    roomId: snapshot.roomId,
    displayWsLimit: snapshot.displayWsLimit,
    currentScene: snapshot.currentScene?.title ?? null,
    upcomingScenes: snapshot.upcomingScenes.length,
    sockets: snapshot.sockets
  }, null, 2));
}

async function showOrSchedule(mode, args) {
  const room = await requireCurrentRoom();
  const flags = parseFlags(args);
  const file = flags._[0];
  if (!file) {
    throw new Error(`walla ${mode} needs a path to an HTML file`);
  }

  const html = await readFile(path.resolve(file), "utf8");
  const title = flags.title || path.basename(file);
  const durationMs = Number(flags.duration || room.defaults.sceneDurationSeconds || 60) * 1000;
  const at = mode === "show" ? (flags.at || "+3s") : flags.at;
  if (!at) {
    throw new Error("walla schedule needs --at");
  }

  const payload = {
    title,
    startAt: parseTime(at),
    durationMs,
    markup: html
  };

  const result = await api(room, "POST", `/api/rooms/${room.roomId}/schedule`, payload);
  console.log(`Scheduled ${title}`);
  console.log(JSON.stringify(result, null, 2));
}

async function say(args) {
  const room = await requireCurrentRoom();
  const flags = parseFlags(args);
  const text = flags._.join(" ").trim();
  if (!text) {
    throw new Error("walla say needs text");
  }
  const ttsWordLimit = Number(flags["max-words"] || room.defaults.ttsMaxWords || DEFAULT_TTS_MAX_WORDS);
  const wordCount = countWords(text);
  if (wordCount > ttsWordLimit) {
    throw new Error(`walla say text has ${wordCount} words; limit is ${ttsWordLimit}. Shorten it or pass --max-words.`);
  }

  const voiceId = flags["voice-id"] || room.defaults.voiceId || undefined;
  const generated = await api(room, "POST", `/api/rooms/${room.roomId}/tts`, {
    text,
    voiceId
  });

  const durationMs = Number(flags.duration || room.defaults.sayDurationSeconds || 18) * 1000;
  const title = flags.title || "Wall announcement";
  const startAt = parseTime(flags.at || "+3s");

  const payload = {
    title,
    startAt,
    durationMs,
    audioAssetKey: generated.key,
    template: "poster",
    templateInput: {
      title,
      headline: flags.headline || "Announcement",
      body: text,
      accent: flags.accent || "#f4a447",
      kicker: flags.kicker || "WALL"
    }
  };

  const scheduled = await api(room, "POST", `/api/rooms/${room.roomId}/schedule`, payload);
  console.log(`Generated and scheduled ${generated.name}`);
  console.log(JSON.stringify({
    assetType: generated.key?.startsWith("data:audio/") ? "inline-audio" : "audio-asset",
    schedule: scheduled.id ?? null
  }, null, 2));
}

async function api(config, method, route, body) {
  const response = await fetch(`${config.server}${route}`, {
    method,
    headers: {
      authorization: `Bearer ${config.token}`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function parseFlags(args) {
  const flags = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      flags._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return flags;
}

function parseTime(value) {
  if (value === "now") {
    return Date.now();
  }
  const relative = /^([+-])(\d+)(s|m|h|d)$/i.exec(value);
  if (relative) {
    const amount = Number(relative[2]);
    const unit = relative[3].toLowerCase();
    const multipliers = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000
    };
    const delta = amount * multipliers[unit];
    return Date.now() + (relative[1] === "-" ? -delta : delta);
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid time value: ${value}`);
  }
  return parsed;
}

function normalizeServerUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("Server URL is required");
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid server URL: ${trimmed}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid server URL: ${trimmed}`);
  }
  return parsed.toString().replace(/\/+$/, "");
}

function resolveServer(existingRoom, overrideServer) {
  if (overrideServer) {
    return normalizeServerUrl(overrideServer);
  }
  const envServer = process.env.WALLA_SERVER?.trim();
  return normalizeServerUrl(envServer || existingRoom?.server || DEFAULT_SERVER);
}

async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    try {
      const raw = await readFile(LEGACY_CONFIG_PATH, "utf8");
      return normalizeConfig(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}

async function requireCurrentRoom() {
  const config = await loadConfig();
  if (!config) {
    throw new Error("No Walla Page config saved. Run `walla create` first.");
  }
  const roomId = config.currentRoomId;
  const room = roomId ? config.rooms?.[roomId] : null;
  if (!room) {
    throw new Error("No current Walla Page room configured. Run `walla create` first.");
  }
  return room;
}

async function maybeCurrentRoom() {
  const config = await loadConfig();
  if (!config) {
    return null;
  }
  const roomId = config.currentRoomId;
  return roomId ? config.rooms?.[roomId] || null : null;
}

async function saveConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function setCurrentRoomServer(serverUrl) {
  const config = await loadConfig();
  if (!config) {
    throw new Error("No Walla Page config saved. Run `walla create` first.");
  }
  const roomId = config.currentRoomId;
  const room = roomId ? config.rooms?.[roomId] : null;
  if (!room) {
    throw new Error("No current Walla Page room configured. Run `walla create` first.");
  }
  const server = normalizeServerUrl(serverUrl);
  room.server = server;
  await saveConfig(config);
  console.log(`Current room server set to ${server}`);
}

function normalizeConfig(config) {
  if (!config || typeof config !== "object") {
    return null;
  }

  if (config.currentRoomId && config.rooms) {
    return config;
  }

  if (config.server && config.roomId && config.token) {
    const room = {
      server: config.server,
      roomId: config.roomId,
      token: config.token,
      defaults: {
      sceneDurationSeconds: config.defaults?.sceneDurationSeconds || 60,
      sayDurationSeconds: config.defaults?.sayDurationSeconds || 18,
      template: config.defaults?.template || "poster",
      voiceId: config.defaults?.voiceId || null,
      ttsMaxWords: config.defaults?.ttsMaxWords || DEFAULT_TTS_MAX_WORDS
    }
  };
    return {
      currentRoomId: config.roomId,
      rooms: {
        [config.roomId]: room
      }
    };
  }

  return null;
}

async function upsertRoom(room, overrides = {}) {
  const current = (await loadConfig()) || { currentRoomId: null, rooms: {} };
  const existing = current.rooms[room.roomId];
  current.rooms[room.roomId] = {
    server: room.server,
    roomId: room.roomId,
    token: room.token,
    defaults: {
      sceneDurationSeconds: existing?.defaults?.sceneDurationSeconds || 60,
      sayDurationSeconds: existing?.defaults?.sayDurationSeconds || 18,
      template: existing?.defaults?.template || "poster",
      voiceId: overrides.voiceId ?? existing?.defaults?.voiceId ?? null,
      ttsMaxWords: existing?.defaults?.ttsMaxWords || DEFAULT_TTS_MAX_WORDS
    }
  };
  current.currentRoomId = room.roomId;
  return current;
}

async function deleteRoomByConfig(config, options = {}) {
  const force = options.force === true;
  const suffix = force ? "?force=1" : "";
  try {
    const response = await fetch(`${config.server}/api/rooms/${config.roomId}${suffix}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${config.token}`
      }
    });
    if (!response.ok) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function parseDisplayLimitFlag(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("--display-limit must be an integer >= 0");
  }
  return parsed === 0 ? null : parsed;
}

main();
