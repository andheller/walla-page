import type { ScenePreset } from "../lib/types";
import { ambientExamples } from "./examples";

function doc(title: string, body: string, config?: unknown, scriptPath?: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https: *.unsplash.com grainy-gradients.vercel.app; media-src 'self' blob:; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me; font-src 'self' https://fonts.gstatic.com https://rsms.me; object-src 'none'; base-uri 'none'; frame-src 'self'" />
    <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@300;400;500;700&display=swap" rel="stylesheet" />
    <title>${title}</title>
    <style>
      :root {
        --bg: #ffffff;
        --text: #0a0a0a;
        --muted: #737373;
        --accent: #ff6321;
        --ring: rgba(10, 10, 10, 0.1);
        --panel: #fcfcfc;
      }
      
      * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      
      body { 
        margin: 0; 
        background: var(--bg); 
        color: var(--text); 
        line-height: 1.5; 
        font-family: 'Inter Variable', 'Inter', sans-serif;
        font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11', 'ss01';
        font-optical-sizing: auto;
      }
      
      a { color: inherit; text-decoration: none; transition: opacity 0.2s ease; }
      a:hover { opacity: 0.8; }
      
      .container { width: min(1320px, calc(100vw - 64px)); margin: 0 auto; }
      
      /* Subtle Design Elements */
      .ring-border { box-shadow: 0 0 0 1px var(--ring); }
      .concentric-28 { border-radius: 28px; }
      .concentric-24 { border-radius: 24px; }
      .concentric-16 { border-radius: 16px; }
      
      header { height: 84px; display: flex; align-items: center; justify-content: space-between; }
      .nav-links { display: flex; align-items: center; gap: 16px; font-weight: 550; font-size: 14px; letter-spacing: -0.01em; }
      .nav-link { color: var(--muted); }
      .nav-btn { padding: 10px 18px; background: var(--text); color: white; border-radius: 999px; font-size: 13px; font-weight: 600; }

      .hero { padding: 72px 0 88px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); gap: 72px; align-items: center; }
      .hero-title { 
        font-size: clamp(42px, 5.6vw, 76px); 
        font-weight: 850; 
        line-height: 0.94; 
        letter-spacing: -0.045em; 
        margin: 0; 
        font-variation-settings: "opsz" 96;
        max-width: 12ch;
      }
      .hero-support { font-size: 19px; color: var(--muted); margin-top: 24px; max-width: 40ch; text-wrap: balance; line-height: 1.45; letter-spacing: -0.01em; }
      .hero-actions { display: flex; gap: 16px; margin-top: 36px; }
      .hero-media { position: relative; }
      .hero-frame {
        aspect-ratio: 10 / 13;
        background: #0a0a0a;
        overflow: hidden;
        padding: 28px;
        box-shadow: 0 40px 80px -20px rgba(0,0,0,0.15);
      }
      .hero-video {
        position: relative;
        height: 100%;
        border-radius: 20px;
        overflow: hidden;
        background:
          linear-gradient(145deg, rgba(255,99,33,0.22), rgba(255,99,33,0) 36%),
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 30%),
          linear-gradient(180deg, #101010, #050505 72%);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .hero-video::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 18% 18%, 18% 18%;
        opacity: 0.14;
      }
      .hero-video::after {
        content: "";
        position: absolute;
        inset: auto 12% 10% 12%;
        height: 18%;
        background: radial-gradient(circle, rgba(255,99,33,0.38), transparent 65%);
        filter: blur(18px);
      }
      .hero-video-label {
        position: absolute;
        top: 24px;
        left: 24px;
        z-index: 1;
        color: rgba(255,255,255,0.78);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      .hero-video-copy {
        position: absolute;
        left: 24px;
        right: 24px;
        bottom: 24px;
        z-index: 1;
        display: grid;
        gap: 10px;
      }
      .hero-video-copy strong {
        color: white;
        font-size: 26px;
        line-height: 1.05;
        letter-spacing: -0.04em;
      }
      .hero-video-copy span {
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        max-width: 24ch;
      }
      
      .btn-primary { 
        padding: 18px 36px; 
        background: var(--text); 
        color: white; 
        border-radius: 999px; 
        font-weight: 600; 
        font-size: 17px; 
        box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2); opacity: 1; }
      
      .btn-secondary { 
        padding: 18px 36px; 
        border-radius: 999px; 
        font-weight: 600; 
        font-size: 17px; 
        box-shadow: 0 0 0 1px var(--ring); 
        transition: background 0.2s ease;
      }
      .btn-secondary:hover { background: #f9f9f9; opacity: 1; }

      .section-heading { margin-bottom: 64px; }
      .eyebrow { 
        font-family: 'JetBrains Mono', monospace; 
        text-transform: uppercase; 
        font-size: 12px; 
        font-weight: 600;
        letter-spacing: 0.4em; 
        color: var(--accent); 
        margin-bottom: 24px; 
        display: block; 
      }
      .section-title { font-size: 56px; font-weight: 850; letter-spacing: -0.04em; margin: 0; font-variation-settings: "opsz" 64; }
      .statement-section { padding: 0 0 108px; }
      .statement-copy {
        max-width: 20ch;
        font-size: clamp(34px, 4.6vw, 58px);
        font-weight: 760;
        letter-spacing: -0.05em;
        line-height: 1.02;
        margin: 0;
      }
      .statement-copy span {
        color: var(--accent);
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-weight: 400;
      }

      .demo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
      .demo-card { display: flex; flex-direction: column; gap: 24px; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      .demo-card:hover { transform: translateY(-8px); opacity: 1; }
      .demo-thumb { 
        aspect-ratio: 4/3; 
        background: #f5f5f5; 
        position: relative; 
        overflow: hidden; 
      }
      .demo-label { font-size: 22px; font-weight: 750; letter-spacing: -0.03em; margin-bottom: 8px; }
      .demo-desc { font-size: 16px; color: var(--muted); line-height: 1.6; }
      .docs-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:32px; }
      .docs-card { padding:40px; background:white; transition: transform 0.3s ease; }
      .docs-card:hover { transform: translateY(-4px); }
      .docs-copy { font-size:15px; color:var(--muted); line-height:1.7; }

      footer { padding: 100px 0; border-top: 1px solid var(--ring); margin-top: 140px; }
      .footer-grid { display: grid; grid-template-columns: 1fr auto; gap: 80px; align-items: start; }
      .footer-copy { font-size: 15px; color: var(--muted); max-width: 40ch; }

      select, input, textarea {
        font-family: inherit;
        font-size: 16px;
        background: #f9f9f9;
        border: none;
        padding: 16px 20px;
        width: 100%;
        outline: none;
        transition: box-shadow 0.2s ease;
      }
      select:focus, input:focus, textarea:focus {
        box-shadow: 0 0 0 2px var(--accent);
      }

      @media (max-width: 1100px) {
        .hero { grid-template-columns: 1fr; gap: 48px; }
        .hero-title { max-width: 11ch; }
        .hero-support { margin-left: auto; margin-right: auto; }
        .hero-actions { justify-content: flex-start; }
        .hero-media { max-width: 640px; }
        .demo-grid { grid-template-columns: repeat(2, 1fr); }
        .docs-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 768px) {
        .container { width: min(1320px, calc(100vw - 32px)); }
        header { height: auto; padding: 20px 0; align-items: flex-start; gap: 20px; }
        .nav-links { gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .hero { padding: 40px 0 72px; gap: 36px; }
        .hero-actions { flex-direction: column; align-items: stretch; }
        .hero-frame { padding: 18px; }
        .hero-video-copy strong { font-size: 22px; }
        .statement-section { padding-bottom: 84px; }
        .footer-grid { grid-template-columns: 1fr; gap: 40px; text-align: center; justify-items: center; }
        .demo-grid { grid-template-columns: 1fr; }
        .docs-grid { grid-template-columns: 1fr; }
        .hero-title { font-size: 48px; }
        .section-title { font-size: 40px; }
      }
    </style>
  </head>
  <body>
    ${body}
    ${config !== undefined ? `<script id="walla-config" type="application/json">${JSON.stringify(config)}</script>` : ""}
    ${scriptPath ? `<script type="module" src="${scriptPath}"></script>` : ""}
  </body>
</html>`;
}

export function landingPage(origin: string, presets: ScenePreset[]) {
  const curatedPresetIds = new Set([
    "monitoring-the-situation",
    "executive-dashboard",
    "morning-brief"
  ]);
  const curatedAmbientIds = new Set([
    "wallaboard",
    "nebula",
    "mosaic",
    "dot-matrix",
    "station-board",
    "ticker",
    "transit-map",
    "dinner-bell",
    "campfire"
  ]);
  const presetLinks = presets
    .filter((preset) => curatedPresetIds.has(preset.id))
    .map((preset) => `<a href="/demo/${preset.id}" target="_blank" class="demo-card">
      <div class="demo-thumb concentric-28 ring-border" style="background:${preset.accent}15;">
        <div style="position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:inherit;">
          <iframe src="/demo/${preset.id}" scrolling="no" style="width:1600px; height:1200px; border:none; transform:scale(0.25); transform-origin:top left; opacity:0.8;"></iframe>
        </div>
        <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.4));"></div>
        <div style="position:absolute; top:24px; left:24px; width:44px; height:44px; border-radius:14px; background:white; display:grid; place-items:center; font-size:20px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index:2;">
          ${preset.template === "focus" ? "⏰" : preset.template === "broadcast" ? "🔔" : preset.template === "poster" ? "📌" : preset.template === "campfire" ? "🔥" : preset.template === "terminal" ? "⌘" : preset.template === "monitoring" ? "🕵️" : preset.template === "dashboard" ? "📈" : preset.template === "lofi" ? "☕" : "✦"}
        </div>
        <div style="position:absolute; bottom:24px; left:24px; z-index:2;">
          <div style="font-family:'JetBrains Mono', monospace; font-size:10px; font-weight:700; letter-spacing:0.2em; color:white; text-transform:uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">Recipe: ${preset.template}</div>
        </div>
      </div>
      <div style="padding: 0 4px;">
        <div class="demo-label">${preset.label}</div>
      </div>
    </a>`)
    .join("");
  const ambientLinks = ambientExamples
    .filter((example) => curatedAmbientIds.has(example.id))
    .map((example) => `<a href="${example.href}" target="_blank" class="demo-card">
      <div class="demo-thumb concentric-28 ring-border" style="background:${example.accent}18;">
        <div style="position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:inherit;">
          <iframe src="${example.href}" scrolling="no" style="width:1600px; height:1200px; border:none; transform:scale(0.25); transform-origin:top left; opacity:0.9;"></iframe>
        </div>
        <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.4));"></div>
        <div style="position:absolute; top:24px; left:24px; width:44px; height:44px; border-radius:14px; background:white; display:grid; place-items:center; font-size:20px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index:2;">
          ${example.id === "wallaboard" ? "▤" : example.id === "nebula" ? "✦" : example.id === "mosaic" ? "▦" : example.id === "dot-matrix" ? "⚃" : example.id === "station-board" ? "✈" : example.id === "ticker" ? "〰" : example.id === "transit-map" ? "⊚" : example.id === "dinner-bell" ? "🔔" : "🔥"}
        </div>
        <div style="position:absolute; bottom:24px; left:24px; z-index:2;">
          <div style="font-family:'JetBrains Mono', monospace; font-size:10px; font-weight:700; letter-spacing:0.2em; color:white; text-transform:uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">${example.eyebrow}</div>
        </div>
      </div>
      <div style="padding: 0 4px;">
        <div class="demo-label">${example.label}</div>
      </div>
    </a>`)
    .join("");
  const demoLinks = ambientLinks + presetLinks;

  const body = `
    <header class="container">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:36px; height:36px; background:var(--text); border-radius:10px; display:grid; place-items:center;">
          <div style="width:16px; height:16px; border:2.5px solid white; border-radius:3px;"></div>
        </div>
        <span style="font-weight:850; font-size:22px; letter-spacing:-0.04em; font-variation-settings: 'opsz' 32;">Walla Page</span>
      </div>
      <nav class="nav-links">
        <a href="https://github.com" target="_blank" rel="noreferrer" class="nav-btn">GitHub</a>
      </nav>
    </header>

    <main>
      <section class="hero container">
        <div>
          <span class="eyebrow">Cloudflare + ElevenLabs</span>
          <h1 class="hero-title">
            Let your agent speak, show you things, and update one wall in real time.
          </h1>
          <p class="hero-support">
            Open source wall control for agents: send fullscreen HTML, speak through ElevenLabs, and keep one screen in sync from a CLI, script, or tool.
          </p>
          <div class="hero-actions">
            <a href="https://www.npmjs.com/package/walla-page" target="_blank" rel="noreferrer" class="btn-primary">npm ↗</a>
            <a href="#examples" class="btn-secondary">View Demos</a>
          </div>
        </div>
        <div class="hero-media">
          <div class="hero-frame concentric-28 ring-border">
            <div class="hero-video">
              <div class="hero-video-label">Room feed / live display</div>
              <div class="hero-video-copy">
                <strong>HTML scenes, voice alerts, and background loops on one wall.</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="statement-section container">
        <span class="eyebrow">Deadpan mode</span>
        <h2 class="statement-copy">
          Use Walla Page to turn your wall into a dashboard that gives executives deeper insights into <span>critical business functions</span>.
        </h2>
      </section>

      <section id="examples" class="container" style="padding:0 0 120px;">
        <div class="section-heading">
          <span class="eyebrow">Selected demos</span>
          <h2 class="section-title">A smaller set of stronger examples.</h2>
          <p style="font-size:20px; color:var(--muted); margin-top:20px; max-width:44ch; letter-spacing: -0.01em;">A few polished wall treatments for rooms, ambient displays, and dead-serious executive theater.</p>
        </div>
        <div class="demo-grid">
          ${demoLinks}
        </div>
      </section>

      <section id="docs" style="background:#fafafa; padding:140px 0; border-top: 1px solid var(--ring); border-bottom: 1px solid var(--ring);">
        <div class="container">
          <div class="section-heading">
            <span class="eyebrow">API & CLI</span>
            <h2 class="section-title">Four primitives for one wall.</h2>
            <p style="font-size:20px; color:var(--muted); margin-top:20px; max-width:42ch; letter-spacing:-0.01em;">The model is intentionally simple: show something now, schedule something later, say something out loud, or delete the room when the moment is done.</p>
          </div>
          <div class="docs-grid">
            ${[
              ["Show", "Push a fullscreen HTML scene to the wall immediately for status, ambient visuals, or a focused moment."],
              ["Schedule", "Queue a scene for later so the wall changes at the right time without someone standing by."],
              ["Say", "Use ElevenLabs voice to announce something important when the room needs attention."],
              ["Delete", "Remove room state and disconnect clients when you want to reset or end a wall session."]
            ].map(([action, copy]) => `
              <div class="docs-card concentric-24 ring-border">
                <div style="font-weight:850; font-size:24px; margin-bottom:16px; letter-spacing: -0.03em;">${action}</div>
                <p class="docs-copy">${copy}</p>
                <div style="margin-top:24px; font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--accent); font-weight:600;">WALLA ${action.toUpperCase()}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
    </main>

    <footer class="container">
      <div class="footer-grid">
        <div style="display:flex; flex-direction:column; gap:24px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:32px; height:32px; background:var(--text); border-radius:8px;"></div>
            <span style="font-weight:850; font-size:20px; letter-spacing:-0.04em;">Walla Page</span>
          </div>
          <p class="footer-copy">
            A wall for scenes, sound, and real-time room updates. Open source, hackable, and built for agents that need to show or say something now.
          </p>
        </div>
        <div style="display:grid; gap:16px;">
          <div class="eyebrow" style="margin-bottom:0; font-size:10px;">Documentation</div>
          <a href="https://github.com" target="_blank" rel="noreferrer" style="font-weight:600; font-size:14px;">GitHub</a>
        </div>
      </div>
    </footer>
  `;

  return doc("Walla Page", body, { origin }, "/app/landing.js");
}

export function demoIndexPage(presets: ScenePreset[]) {
  return landingPage("", presets);
}

export function publicDemoPage(preset: ScenePreset, markup: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Walla Page Gallery / ${preset.label}</title>
    <style>html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }</style>
  </head>
  <body>${markup}</body>
</html>`;
}

export function notFoundPage() {
  const body = `
    <main style="min-height:100vh; display:grid; place-items:center; background:#050505; color:white; font-family:'Inter Variable', sans-serif;">
      <div style="text-align:center; max-width:480px; padding:48px 32px; width:calc(100% - 40px);">
        <div style="font-size:clamp(80px,10vw,120px); font-weight:850; letter-spacing:-0.06em; line-height:1; margin-bottom:24px; color:rgba(255,255,255,0.08);">404</div>
        <h1 style="font-size:clamp(28px,3vw,40px); font-weight:850; margin:0 0 16px; letter-spacing:-0.04em; line-height:1.1;">Nothing here.</h1>
        <p style="color:rgba(255,255,255,0.35); font-size:15px; line-height:1.65; margin:0 0 40px; text-wrap:balance;">This page doesn&rsquo;t exist. If you were given a display link, it may have expired.</p>
        <a href="/" style="display:inline-block; background:white; color:black; font-weight:600; font-size:15px; padding:14px 28px; border-radius:12px; text-decoration:none;">Go home</a>
      </div>
    </main>
  `;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Not Found / Walla Page</title><link rel="stylesheet" href="https://rsms.me/inter/inter.css"><style>*{box-sizing:border-box;-webkit-font-smoothing:antialiased}body{margin:0}</style></head><body>${body}</body></html>`;
}

export function displayPage(roomId: string) {
  const body = `
    <main id="display-shell" style="min-height:100vh; display:grid; place-items:center; background:#050505; color:white; font-family:'Inter Variable', sans-serif;">
      <div id="display-card" style="text-align:center; max-width:560px; padding:48px 32px; width:calc(100% - 40px);">
        <div style="font-size:17px; font-weight:850; letter-spacing:-0.04em; color:rgba(255,255,255,0.4); margin-bottom:40px;">Walla Page</div>
        <h1 style="font-size:clamp(52px,6vw,80px); font-weight:850; margin:0 0 20px; letter-spacing:-0.05em; line-height:1.05;">Your room&rsquo;s<br>live display.</h1>
        <p style="color:rgba(255,255,255,0.4); font-size:clamp(16px,1.6vw,20px); line-height:1.6; margin:0 0 40px; max-width:32ch; margin-left:auto; margin-right:auto; text-wrap:balance;">When someone activates a scene, it appears here fullscreen. This display needs one click before it can play sound.</p>
        <p id="display-status" style="color:rgba(255,255,255,0.25); font-size:clamp(13px,1.2vw,16px); line-height:1.6; margin:0 0 28px;"></p>
        <div style="display:grid; gap:12px;">
          <button id="display-overlay" class="btn-primary" style="background:white; color:black; border:none; width:100%; font-size:clamp(15px,1.4vw,18px); font-weight:600;">Click to start wall</button>
          <button id="display-test-sound" style="background:transparent; color:white; border:1px solid rgba(255,255,255,0.18); width:100%; font-size:clamp(14px,1.2vw,16px); font-weight:600; border-radius:999px; padding:14px 18px; cursor:pointer;">Test sound</button>
        </div>
      </div>
      <iframe id="scene-frame" sandbox="allow-scripts" style="position:fixed; inset:0; width:100%; height:100%; border:0; display:none;"></iframe>
    </main>
  `;
  return doc(`Walla Page`, body, { roomId }, "/app/display.js");
}
