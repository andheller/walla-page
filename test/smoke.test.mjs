import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import WebSocket from "ws";

const PORT = await getFreePort();
const BASE_URL = `http://127.0.0.1:${PORT}`;
const output = [];

let server;
let displaySocket;

try {
  server = spawn("npx", ["wrangler", "dev", "--port", String(PORT)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  });

  await waitForReady(server, BASE_URL, output);

  const created = await fetchJson(`${BASE_URL}/api/rooms`, {
    method: "POST"
  });

  assert.equal(typeof created.roomId, "string");
  assert.equal(created.display.role, "display");
  assert.equal(typeof created.token, "string");
  assert.match(created.display.link, new RegExp(`/rooms/${created.roomId}\\?token=`));

  const producerToken = created.token;
  const displayToken = created.display.token;
  const roomId = created.roomId;

  const pageWithToken = await fetch(`${BASE_URL}/rooms/${roomId}?token=${encodeURIComponent(displayToken)}`, {
    redirect: "manual"
  });
  assert.equal(pageWithToken.status, 302);
  assert.equal(pageWithToken.headers.get("location"), `/rooms/${roomId}`);
  const displayCookie = pageWithToken.headers.get("set-cookie");
  assert.match(displayCookie || "", new RegExp(`walla-display-${roomId}=`));

  const refreshedPage = await fetch(`${BASE_URL}/rooms/${roomId}`, {
    headers: {
      cookie: displayCookie
    }
  });
  assert.equal(refreshedPage.status, 200);
  const refreshedMarkup = await refreshedPage.text();
  assert.match(refreshedMarkup, /id="display-overlay"/);

  const ttsWithoutDisplay = await fetchTts(`${BASE_URL}/api/rooms/${roomId}/tts`, producerToken, {
    text: "This should not synthesize without a live display."
  });
  const ttsWithoutDisplayPayload = await ttsWithoutDisplay.json().catch(() => ({}));
  assert.equal(ttsWithoutDisplay.status, 409);
  assert.equal(ttsWithoutDisplayPayload.error, "no display is currently connected to this room");

  displaySocket = await openDisplaySocket(`${BASE_URL}/api/rooms/${roomId}/ws`, {
    headers: {
      cookie: displayCookie
    }
  });

  const scheduled = await fetchJson(`${BASE_URL}/api/rooms/${roomId}/schedule`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${producerToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      title: "Smoke Test Scene",
      startAt: Date.now() + 5_000,
      durationMs: 60_000,
      template: "poster",
      templateInput: {
        title: "Smoke Test Scene",
        headline: "Ship the hackathon demo",
        body: "This room was created and scheduled by the smoke test.",
        accent: "#f4a447",
        kicker: "TEST"
      }
    })
  });

  assert.equal(scheduled.ok, true);
  assert.equal(typeof scheduled.id, "string");

  const state = await fetchJson(`${BASE_URL}/api/rooms/${roomId}/state?token=${encodeURIComponent(producerToken)}`, {
    headers: {
      authorization: `Bearer ${producerToken}`
    }
  });

  assert.equal(state.roomId, roomId);
  assert.equal(state.displayWsLimit, null);
  assert.ok(Array.isArray(state.upcomingScenes));
  assert.equal(state.upcomingScenes.length, 1);
  assert.equal(state.upcomingScenes[0].title, "Smoke Test Scene");
  assert.equal(state.sockets.display, 1);

  const ttsWithDisplay = await fetchTts(`${BASE_URL}/api/rooms/${roomId}/tts`, producerToken, {
    text: "This room has a connected display."
  });
  assert.notEqual(ttsWithDisplay.status, 409);

  const immediate = await fetchJson(`${BASE_URL}/api/rooms/${roomId}/schedule`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${producerToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      title: "Kick Test Scene",
      startAt: Date.now() + 1_000,
      durationMs: 60_000,
      template: "poster",
      templateInput: {
        title: "Kick Test Scene",
        headline: "Clear the wall",
        body: "This scene should become active and then require forced delete while displays are connected.",
        accent: "#f4a447",
        kicker: "KICK"
      }
    })
  });

  assert.equal(immediate.ok, true);

  await new Promise((resolve) => setTimeout(resolve, 1_500));

  const liveState = await fetchJson(`${BASE_URL}/api/rooms/${roomId}/state?token=${encodeURIComponent(producerToken)}`, {
    headers: {
      authorization: `Bearer ${producerToken}`
    }
  });

  assert.equal(liveState.currentScene?.title, "Kick Test Scene");

  const blockedDelete = await fetch(`${BASE_URL}/api/rooms/${roomId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${producerToken}`
    }
  });
  const blockedDeletePayload = await blockedDelete.json().catch(() => ({}));
  assert.equal(blockedDelete.status, 409);
  assert.equal(blockedDeletePayload.error, "room has active connections; retry with force");

  const deleted = await fetchJson(`${BASE_URL}/api/rooms/${roomId}?force=1`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${producerToken}`
    }
  });
  assert.equal(deleted.ok, true);
  assert.equal(deleted.roomId, roomId);
  assert.equal(deleted.forced, true);

  const stateAfterDelete = await fetch(`${BASE_URL}/api/rooms/${roomId}/state?token=${encodeURIComponent(producerToken)}`, {
    headers: {
      authorization: `Bearer ${producerToken}`
    }
  });
  const stateAfterDeletePayload = await stateAfterDelete.json().catch(() => ({}));
  assert.equal(stateAfterDelete.status, 401);
  assert.equal(stateAfterDeletePayload.error, "invalid token");

  console.log("Smoke test passed.");
  console.log(`Room ${roomId} created and scheduled successfully at ${BASE_URL}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  displaySocket?.close();
  await stopServer(server);
}

async function fetchJson(url, init) {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("x-forwarded-for") && !headers.has("x-real-ip")) {
    const ip = randomTestIp();
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }
  const response = await fetch(url, {
    ...init,
    headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function fetchTts(url, token, body) {
  let response = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ip = randomTestIp();
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "x-forwarded-for": ip,
        "x-real-ip": ip,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (response.status !== 429) {
      return response;
    }
  }
  return response;
}

async function openDisplaySocket(url, options = {}) {
  return await new Promise((resolve, reject) => {
    const wsUrl = url.replace(/^http/, "ws");
    const socket = new WebSocket(wsUrl, options);

    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error(`Timed out opening display socket: ${wsUrl}`));
    }, 5_000);

    socket.once("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate a test port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

function randomTestIp() {
  return `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
}

async function waitForReady(child, baseUrl, logs) {
  await new Promise((resolve, reject) => {
    let ready = false;
    const onChunk = (chunk) => {
      const text = chunk.toString();
      logs.push(text);
      if (text.includes(`Ready on ${baseUrl}`) || text.includes(`Ready on http://localhost:${new URL(baseUrl).port}`)) {
        ready = true;
        resolve();
      }
    };

    child.stdout.on("data", onChunk);
    child.stderr.on("data", onChunk);
    child.on("exit", (code) => {
      if (!ready) {
        reject(new Error(`wrangler dev exited early with code ${code}\n${logs.join("")}`));
      }
    });
  });
}

async function stopServer(child) {
  if (!child) {
    return;
  }

  child.kill("SIGKILL");
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.removeAllListeners();
  await new Promise((resolve) => setTimeout(resolve, 200));
}
