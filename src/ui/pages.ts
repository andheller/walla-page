import type { ScenePreset } from "../lib/types";
import { renderDemoDocument } from "./demo-page";
import { wallaLogoMark } from "./logo";

type FeaturedDemo = {
  id: string;
  href: string;
  codeHref: string;
  accent: string;
  preview: "live" | "static";
};

const FEATURED_DEMOS: FeaturedDemo[] = [
  {
    id: "executive-dashboard",
    href: "/demo/executive-dashboard",
    codeHref: "https://github.com/andheller/walla-page/tree/main/examples",
    accent: "#3b82f6",
    preview: "live"
  },
  {
    id: "campfire",
    href: "/demo/campfire",
    codeHref: "https://github.com/andheller/walla-page/blob/main/examples/campfire.html",
    accent: "#ff7a18",
    preview: "static"
  },
  {
    id: "nebula",
    href: "/examples/nebula",
    codeHref: "https://github.com/andheller/walla-page/blob/main/examples/nebula.html",
    accent: "#00d2ff",
    preview: "live"
  },
  {
    id: "mosaic",
    href: "/examples/mosaic",
    codeHref: "https://github.com/andheller/walla-page/blob/main/examples/mosaic.html",
    accent: "#9b59b6",
    preview: "live"
  }
];

function featuredCard(demo: FeaturedDemo) {
  return `<article class="demo-card">
    <div class="demo-thumb concentric-28 ring-border" style="background:${demo.accent}15;">
      ${demo.preview === "live"
        ? `<div class="demo-frame-wrap">
        <iframe data-demo-src="${demo.href}" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>
      </div>`
        : `<div class="demo-static demo-static-image">
        <img src="/brand/campfire-card.webp" alt="Campfire scene preview" loading="lazy" decoding="async" />
        </div>`
      }
      <div class="demo-thumb-shade"></div>
      <div class="demo-hover">
        <a href="${demo.href}" target="_blank" rel="noreferrer" class="demo-action demo-action-primary">View Demo</a>
        <a href="${demo.codeHref}" target="_blank" rel="noreferrer" class="demo-action">View Code</a>
      </div>
    </div>
  </article>`;
}

function doc(title: string, body: string, config?: unknown, scriptPath?: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https: *.unsplash.com grainy-gradients.vercel.app; media-src 'self' blob: data:; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me; font-src 'self' https://fonts.gstatic.com https://rsms.me; object-src 'none'; base-uri 'none'; frame-src 'self'" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
      .nav-links { display: flex; align-items: center; gap: 18px; font-weight: 600; font-size: 14px; letter-spacing: -0.01em; }
      .nav-link { color: var(--muted); }

      .hero { padding: 72px 0 88px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); gap: 72px; align-items: center; }
      .hero-title { 
        font-size: clamp(40px, 5.1vw, 70px); 
        font-weight: 850; 
        line-height: 0.94; 
        letter-spacing: -0.045em; 
        margin: 0; 
        font-variation-settings: "opsz" 96;
        max-width: 12ch;
      }
      .hero-support { font-size: 19px; color: var(--muted); margin-top: 24px; max-width: 40ch; text-wrap: balance; line-height: 1.45; letter-spacing: -0.01em; }
      .hero-actions { display: flex; margin-top: 36px; }
      .install-pill {
        width: min(100%, 380px);
        display: grid;
        grid-template-columns: minmax(0, 1fr) 54px;
        align-items: center;
        border-radius: 999px;
        background: linear-gradient(180deg, #ffffff, #f7f4ef);
        box-shadow: 0 0 0 1px rgba(10, 10, 10, 0.12), 0 16px 40px -24px rgba(0, 0, 0, 0.28);
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .install-pill:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 0 1px rgba(10, 10, 10, 0.14), 0 22px 48px -24px rgba(0, 0, 0, 0.3);
      }
      .install-command {
        display: block;
        padding: 18px 22px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        letter-spacing: 0.08em;
        color: #4d4a45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .install-copy {
        width: 40px;
        height: 40px;
        margin-right: 7px;
        border: 0;
        border-radius: 999px;
        padding: 0;
        display: grid;
        place-items: center;
        background: rgba(10, 10, 10, 0.04);
        color: #6b675f;
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
      }
      .install-copy:hover {
        background: rgba(10, 10, 10, 0.08);
        color: #0a0a0a;
        transform: scale(1.02);
      }
      .install-copy svg {
        width: 21px;
        height: 21px;
      }
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
        background: #050505;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .hero-iframe-wrap {
        position: absolute;
        inset: 0;
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
      }
      .hero-iframe-wrap iframe {
        width: 400%;
        height: 400%;
        border: none;
        transform: scale(0.25);
        transform-origin: top left;
        pointer-events: none;
      }
      
      .section-heading { margin-bottom: 64px; }
      .section-title { font-size: 56px; font-weight: 850; letter-spacing: -0.04em; margin: 0; font-variation-settings: "opsz" 64; }
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

      .demo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
      .demo-card {
        min-width: 0;
        display: block;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .demo-card:hover {
        transform: translateY(-8px);
        opacity: 1;
      }
      .demo-thumb { 
        aspect-ratio: 4 / 3;
        background: #f5f5f5;
        position: relative; 
        overflow: hidden; 
      }
      .demo-frame-wrap {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        border-radius: inherit;
      }
      .demo-static {
        position: absolute;
        inset: 0;
      }
      .demo-frame-wrap iframe {
        width: 400%;
        height: 400%;
        border: none;
        transform: scale(0.25);
        transform-origin: top left;
        opacity: 0.9;
        pointer-events: none;
      }
      .demo-thumb-shade {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.35));
      }
      .demo-hover {
        position: absolute;
        inset: auto 18px 18px 18px;
        z-index: 2;
        display: flex;
        gap: 10px;
      }
      .demo-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 116px;
        padding: 11px 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.16);
        backdrop-filter: blur(14px);
        color: white;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .demo-action-primary {
        background: rgba(255,255,255,0.94);
        border-color: rgba(255,255,255,0.94);
        color: #080808;
      }
      .demo-static-image {
        background: #050505;
      }
      .demo-static-image img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        object-position: center;
      }
      .docs-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:32px; }
      .docs-card { padding:40px; background:white; transition: transform 0.3s ease; display:flex; flex-direction:column; }
      .docs-card:hover { transform: translateY(-4px); }
      .docs-copy { font-size:15px; color:var(--muted); line-height:1.7; margin:0; }
      .section-header-row {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
      }
      .section-header-copy {
        min-width: 0;
      }
      .section-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 14px 20px;
        border-radius: 999px;
        background: white;
        box-shadow: 0 0 0 1px var(--ring);
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .docs-command-pill {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        align-items: center;
        margin-top: auto;
        border-radius: 999px;
        background: linear-gradient(180deg, #ffffff, #f7f4ef);
        box-shadow: 0 0 0 1px rgba(10, 10, 10, 0.09), 0 14px 30px -26px rgba(0, 0, 0, 0.34);
        overflow: hidden;
      }
      .docs-command {
        display: block;
        padding: 14px 18px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        letter-spacing: 0.04em;
        color: #4d4a45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .docs-copy-button {
        width: 30px;
        height: 30px;
        margin-right: 5px;
        border: 0;
        border-radius: 999px;
        padding: 0;
        display: grid;
        place-items: center;
        background: rgba(10, 10, 10, 0.04);
        color: #6b675f;
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
      }
      .docs-copy-button:hover {
        background: rgba(10, 10, 10, 0.08);
        color: #0a0a0a;
        transform: scale(1.02);
      }
      .docs-copy-button svg {
        width: 17px;
        height: 17px;
      }

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
        .docs-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 768px) {
        .container { width: min(1320px, calc(100vw - 32px)); }
        header { height: auto; padding: 20px 0; align-items: flex-start; gap: 20px; }
        .nav-links { gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .hero { padding: 40px 0 72px; gap: 36px; }
        .hero-actions { align-items: stretch; }
        .install-pill { width: 100%; }
        .install-command { padding: 17px 18px; font-size: 13px; letter-spacing: 0.05em; }
        .hero-frame { padding: 18px; }
        .hero-video-copy strong { font-size: 22px; }
        .footer-grid { grid-template-columns: 1fr; gap: 40px; text-align: center; justify-items: center; }
        .demo-grid { grid-template-columns: 1fr; }
        .demo-action {
          min-width: 0;
          flex: 1 1 0;
        }
        .section-header-row {
          align-items: flex-start;
          flex-direction: column;
        }
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
  const demoLinks = FEATURED_DEMOS.map((demo) => featuredCard(demo)).join("");

  const body = `
    <header class="container">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:36px; height:36px; background:var(--text); border-radius:10px; display:grid; place-items:center;">
          ${wallaLogoMark()}
        </div>
        <span style="font-weight:850; font-size:22px; letter-spacing:-0.04em; font-variation-settings: 'opsz' 32;">Walla Page</span>
      </div>
      <nav class="nav-links">
        <a href="https://github.com/andheller/walla-page" target="_blank" rel="noreferrer" class="nav-link">GitHub</a>
        <a href="https://www.npmjs.com/package/walla-page" target="_blank" rel="noreferrer" class="nav-link">npm</a>
      </nav>
    </header>

    <main>
      <section class="hero container">
        <div>
          <h1 class="hero-title">
            Let your agent speak, show you things, and update your display in real time.
          </h1>
          <p class="hero-support">
            Open source wall control for agents: send fullscreen HTML, speak through ElevenLabs, and keep one screen in sync from a CLI, script, or tool.
          </p>
          <div class="hero-actions">
            <div class="install-pill">
              <span class="install-command">$ npm install -g walla-page</span>
              <button
                type="button"
                class="install-copy"
                aria-label="Copy install command"
                data-copy-button
                data-copy-text="npm install -g walla-page"
              >
                <svg data-copy-icon viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.6"></rect>
                  <path d="M15 9V7C15 5.89543 14.1046 5 13 5H7C5.89543 5 5 5.89543 5 7V13C5 14.1046 5.89543 15 7 15H9" stroke="currentColor" stroke-width="1.6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="hero-media">
          <div class="hero-frame concentric-28 ring-border">
            <div class="hero-video">
              <div class="hero-iframe-wrap">
                <iframe data-demo-src="/examples/nebula" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="examples" class="container" style="padding:0 0 120px;">
        <h2 class="statement-copy" style="margin:0 0 48px;">
          Use Walla Page to turn your wall into a dashboard that gives executives deeper insights into <span>critical business functions</span>.
        </h2>
        <div class="demo-grid">
          ${demoLinks}
        </div>
      </section>

      <section id="docs" style="background:#fafafa; padding:140px 0; border-top: 1px solid var(--ring); border-bottom: 1px solid var(--ring);">
        <div class="container">
          <div class="section-heading">
            <div class="section-header-row">
              <div class="section-header-copy">
                <h2 class="section-title">How it works.</h2>
                <p style="font-size:20px; color:var(--muted); margin-top:20px; max-width:46ch; letter-spacing:-0.01em;">The core flow is simple: create a room, show something now, schedule something later, say something out loud, then delete the room when you are done.</p>
              </div>
              <a href="https://github.com/andheller/walla-page#readme" target="_blank" rel="noreferrer" class="section-cta">View Docs</a>
            </div>
          </div>
          <div class="docs-grid">
            ${[
              ["Create", "Start a room and get the display link for the wall.", "walla create"],
              ["Show", "Put an HTML scene on the wall right now.", "walla show wall.html"],
              ["Schedule", "Queue a scene to take over later.", "walla schedule wall.html --at +5m"],
              ["Say", "Speak a short message through the wall.", "walla say \"Dinner soon.\""],
              ["Delete", "Tear down the room and disconnect the wall.", "walla delete"]
            ].map(([action, copy, command]) => `
              <div class="docs-card concentric-24 ring-border">
                <div style="font-weight:850; font-size:24px; margin-bottom:16px; letter-spacing: -0.03em;">${action}</div>
                <p class="docs-copy">${copy}</p>
                <div class="docs-command-pill">
                  <span class="docs-command">$ ${command}</span>
                  <button
                    type="button"
                    class="docs-copy-button"
                    aria-label="Copy ${action.toLowerCase()} command"
                    data-copy-button
                    data-copy-text="${command}"
                  >
                    <svg data-copy-icon viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.6"></rect>
                      <path d="M15 9V7C15 5.89543 14.1046 5 13 5H7C5.89543 5 5 5.89543 5 7V13C5 14.1046 5.89543 15 7 15H9" stroke="currentColor" stroke-width="1.6"></path>
                    </svg>
                  </button>
                </div>
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
            <div style="width:32px; height:32px; background:var(--text); border-radius:8px; display:grid; place-items:center;">
              ${wallaLogoMark()}
            </div>
            <span style="font-weight:850; font-size:20px; letter-spacing:-0.04em;">Walla Page</span>
          </div>
          <p class="footer-copy">
            A wall for scenes, sound, and real-time room updates. Open source, hackable, and built for agents that need to show or say something now.
          </p>
        </div>
        <div style="display:grid; gap:16px;">
          <div class="eyebrow" style="margin-bottom:0; font-size:10px;">Documentation</div>
          <a href="https://github.com/andheller/walla-page" target="_blank" rel="noreferrer" style="font-weight:600; font-size:14px;">GitHub</a>
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
  return renderDemoDocument(
    `Walla Page Gallery / ${preset.label}`,
    `${markup}<style>html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }</style>`,
    preset.id
  );
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Not Found / Walla Page</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"/><link rel="stylesheet" href="https://rsms.me/inter/inter.css"><style>*{box-sizing:border-box;-webkit-font-smoothing:antialiased}body{margin:0}</style></head><body>${body}</body></html>`;
}

export function displayPage(roomId: string) {
  const body = `
    <main id="display-shell" style="min-height:100vh; display:grid; place-items:center; background:#050505; color:white; font-family:'Inter Variable', sans-serif;">
      <div id="display-card" style="text-align:center; max-width:560px; padding:48px 32px; width:calc(100% - 40px);">
        <div style="font-size:17px; font-weight:850; letter-spacing:-0.04em; color:rgba(255,255,255,0.4); margin-bottom:40px;">Walla Page</div>
        <h1 style="font-size:clamp(52px,6vw,80px); font-weight:850; margin:0 0 20px; letter-spacing:-0.05em; line-height:1.05;">Your room&rsquo;s<br>live display.</h1>
        <p style="color:rgba(255,255,255,0.4); font-size:clamp(16px,1.6vw,20px); line-height:1.6; margin:0 0 40px; max-width:32ch; margin-left:auto; margin-right:auto; text-wrap:balance;">When someone activates a scene, it appears here fullscreen. This display needs one click before it can play sound.</p>
        <p id="display-status" style="color:rgba(255,255,255,0.25); font-size:clamp(13px,1.2vw,16px); line-height:1.6; margin:0 0 28px;"></p>
        <button id="display-overlay" class="btn-primary" style="background:white; color:black; border:none; width:100%; font-size:clamp(15px,1.4vw,18px); font-weight:600; padding:16px 28px; border-radius:12px; cursor:pointer; font-family:inherit; letter-spacing:-0.01em;">Click to start wall</button>
      </div>
      <iframe id="scene-frame" sandbox="allow-scripts" style="position:fixed; inset:0; width:100%; height:100%; border:0; display:none;"></iframe>
    </main>
  `;
  return doc(`Walla Page`, body, { roomId }, "/app/display.js");
}
