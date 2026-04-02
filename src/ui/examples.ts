type AmbientExample = {
  id: string;
  label: string;
  description: string;
  accent: string;
  eyebrow: string;
  href: string;
};

export const ambientExamples: AmbientExample[] = [
  {
    id: "wallaboard",
    label: "WallaBoard",
    description: "Mechanical split-flap wallboard with grounded letter motion, restrained materials, and a clean ambient clock.",
    accent: "#e67e22",
    eyebrow: "Split-flap display",
    href: "/examples/wallaboard"
  },
  {
    id: "nebula",
    label: "Walla Nebula",
    description: "High-impact WebGL nebula scene with a single oversized clock for large-format ambient display walls.",
    accent: "#00d2ff",
    eyebrow: "WebGL scene",
    href: "/examples/nebula"
  },
  {
    id: "mosaic",
    label: "Walla Mosaic",
    description: "A dense 30x60 generative tile field that evolves into vibrant color mosaics across the entire display surface.",
    accent: "#9b59b6",
    eyebrow: "Generative grid",
    href: "/examples/mosaic"
  },
  {
    id: "dot-matrix",
    label: "Walla Matrix",
    description: "Classic red LED dot-matrix display for urgent signal-style updates and retro-hacker aesthetics.",
    accent: "#ff0000",
    eyebrow: "LED Display",
    href: "/examples/dot-matrix"
  },
  {
    id: "station-board",
    label: "Station Board",
    description: "Airport-style arrivals board for life updates with mechanical-style jitter and high legibility.",
    accent: "#f47a18",
    eyebrow: "Transit Board",
    href: "/examples/station-board"
  },
  {
    id: "ticker",
    label: "Market Ticker",
    description: "Sleek, high-contrast ambient stream of statuses and metrics with market-green glows.",
    accent: "#4cd964",
    eyebrow: "Ambient Ticker",
    href: "/examples/ticker"
  },
  {
    id: "transit-map",
    label: "Transit Map",
    description: "Workflow visualizer that shows state through route progression and glowing path-finding.",
    accent: "#3b82f6",
    eyebrow: "Workflow Map",
    href: "/examples/transit-map"
  },
  {
    id: "dinner-bell",
    label: "Dinner Bell",
    description: "Premium animated SVG gold bell with a smooth ringing motion and industrial background.",
    accent: "#ffd700",
    eyebrow: "Signal Bell",
    href: "/examples/dinner-bell"
  },
  {
    id: "campfire",
    label: "Campfire",
    description: "High-fidelity WebGL fire shader for ambient relaxation and deep-focus room treatments.",
    accent: "#ff7a18",
    eyebrow: "WebGL Shader",
    href: "/examples/campfire"
  }
];

export function ambientExamplePage(id: string) {
  if (id === "wallaboard") return wallaboardPage();
  if (id === "nebula") return nebulaPage();
  if (id === "mosaic") return mosaicPage();
  // These are handled by the /examples/:id route reading the .html files directly in index.ts
  // But we can add shells here if we want them rendered through this logic.
  // For now, index.ts handles /examples/*.html
  return null;
}

function shell(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>${body}</body>
</html>`;
}

function wallaboardPage() {
  return shell("WallaBoard", `
    <style>
      :root {
        --bg: #070707;
        --panel: #141414;
        --frame: #0f0f0f;
        --flap: #1f1f1f;
        --flap-top: #262626;
        --flap-bottom: #1d1d1d;
        --hinge: #0b0b0b;
        --text: #f4f4f4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 20%, rgba(255,255,255,0.05), transparent 32%),
          linear-gradient(180deg, #0b0b0b, #030303 70%);
        font-family: Inter, system-ui, sans-serif;
        color: white;
      }
      .shell {
        position: relative;
        width: min(92vw, 1260px);
        padding: 52px;
        border-radius: 32px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
        box-shadow:
          0 40px 120px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.04);
      }
      .board {
        display: grid;
        gap: 6px;
        padding: 18px;
        background: linear-gradient(180deg, #1a1a1a, #111);
        border-radius: 20px;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.04),
          inset 0 0 40px rgba(0,0,0,0.6);
      }
      .row {
        display: grid;
        grid-template-columns: repeat(22, minmax(0, 1fr));
        gap: 4px;
      }
      .flap {
        position: relative;
        aspect-ratio: 2 / 3;
        min-width: 0;
        border-radius: 4px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.15));
        overflow: hidden;
        box-shadow:
          0 2px 6px rgba(0,0,0,0.35),
          inset 0 1px 0 rgba(255,255,255,0.03);
        perspective: 500px;
      }
      .flap::before {
        content: "";
        position: absolute;
        inset: 0 0 50% 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
        z-index: 3;
        pointer-events: none;
      }
      .flap::after {
        content: "";
        position: absolute;
        top: calc(50% - 0.5px);
        left: 0;
        right: 0;
        height: 1px;
        background: var(--hinge);
        box-shadow: 0 1px 0 rgba(255,255,255,0.05);
        z-index: 4;
      }
      .flap-half,
      .flap-flip {
        position: absolute;
        inset-inline: 0;
        overflow: hidden;
      }
      .flap-half {
        display: flex;
        justify-content: center;
      }
      .flap-top,
      .flap-flip-current,
      .flap-flip-next {
        top: 0;
        height: 50%;
        align-items: flex-end;
        background: linear-gradient(180deg, var(--flap-top), var(--flap));
      }
      .flap-bottom {
        bottom: 0;
        height: 50%;
        align-items: flex-start;
        background: linear-gradient(180deg, var(--flap), var(--flap-bottom));
      }
      .flap-flip {
        z-index: 2;
        backface-visibility: hidden;
        transform-style: preserve-3d;
        pointer-events: none;
      }
      .flap-flip-current {
        transform-origin: bottom;
      }
      .flap-flip-next {
        transform-origin: top;
        transform: rotateX(90deg);
      }
      .flap.flipping .flap-flip-current {
        animation: topFlip 210ms cubic-bezier(0.45, 0, 0.2, 1) forwards;
      }
      .flap.flipping .flap-flip-next {
        animation: bottomFlip 230ms cubic-bezier(0.2, 0.8, 0.2, 1) 210ms forwards;
      }
      .flap-char {
        position: absolute;
        left: 0;
        width: 100%;
        height: 200%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(14px, 1.5vw, 34px);
        line-height: 1;
        font-weight: 800;
        color: var(--text);
        text-transform: uppercase;
        text-align: center;
      }
      .flap-top .flap-char {
        top: 0;
      }
      .flap-bottom .flap-char {
        top: -100%;
      }
      .flap-flip-current .flap-char {
        top: 0;
      }
      .flap-flip-next .flap-char {
        top: -100%;
      }
      @keyframes topFlip {
        0% { transform: rotateX(0deg); }
        100% { transform: rotateX(-90deg); }
      }
      @keyframes bottomFlip {
        0% { transform: rotateX(90deg); }
        100% { transform: rotateX(0deg); }
      }
      @media (max-width: 1100px) {
        .shell { width: 98vw; padding: 20px 14px; }
      }
    </style>
    <main class="shell">
      <div class="board" id="board"></div>
    </main>
    <script>
      const ROWS = 6;
      const COLS = 22;
      const BLANK = " ";
      const board = document.getElementById("board");
      const cells = [];

      function makeCell() {
        const flap = document.createElement("div");
        flap.className = "flap";
        flap.innerHTML = [
          '<div class="flap-half flap-top"><div class="flap-char"></div></div>',
          '<div class="flap-half flap-bottom"><div class="flap-char"></div></div>',
          '<div class="flap-flip flap-flip-current"><div class="flap-char"></div></div>',
          '<div class="flap-flip flap-flip-next"><div class="flap-char"></div></div>'
        ].join("");
        flap.dataset.char = BLANK;
        paintCell(flap, BLANK);
        return flap;
      }

      function paintCell(flap, value) {
        const char = (value || BLANK).slice(0, 1);
        flap.dataset.char = char;
        flap.querySelector(".flap-top .flap-char").textContent = char;
        flap.querySelector(".flap-bottom .flap-char").textContent = char;
      }

      for (let row = 0; row < ROWS; row += 1) {
        const rowEl = document.createElement("div");
        rowEl.className = "row";
        const rowCells = [];
        for (let col = 0; col < COLS; col += 1) {
          const flap = makeCell();
          rowEl.appendChild(flap);
          rowCells.push(flap);
        }
        board.appendChild(rowEl);
        cells.push(rowCells);
      }

      function writeCell(flap, value) {
        const next = (value || BLANK).slice(0, 1);
        const prev = flap.dataset.char || BLANK;
        if (prev === next) {
          return;
        }
        flap.querySelector(".flap-flip-current .flap-char").textContent = prev;
        flap.querySelector(".flap-flip-next .flap-char").textContent = next;
        flap.classList.remove("flipping");
        void flap.offsetWidth;
        flap.classList.add("flipping");
        setTimeout(() => {
          paintCell(flap, next);
          flap.classList.remove("flipping");
        }, 460);
      }

      function center(text) {
        const raw = (text || "").toUpperCase().slice(0, COLS);
        const padding = Math.max(0, Math.floor((COLS - raw.length) / 2));
        return (BLANK.repeat(padding) + raw).padEnd(COLS, BLANK).slice(0, COLS);
      }

      function frameForClock() {
        const now = new Date();
        const hh = now.getHours().toString().padStart(2, "0");
        const mm = now.getMinutes().toString().padStart(2, "0");
        return [
          center(""),
          center("WALLABOARD"),
          center(""),
          center(hh + ":" + mm),
          center(""),
          center("")
        ];
      }

      function render(lines) {
        cells.forEach((rowCells, row) => {
          rowCells.forEach((flap, col) => {
            const char = lines[row]?.[col] || " ";
            setTimeout(() => writeCell(flap, char), Math.random() * 180);
          });
        });
      }

      render(frameForClock());
      setInterval(() => {
        render(frameForClock());
      }, 1000);
    </script>
  `);
}

function nebulaPage() {
  return shell("Walla Nebula", `
    <style>
      :root { --accent: #00d2ff; }
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #050508; color: white; font-family: Inter, system-ui, sans-serif; }
      canvas { display: block; width: 100%; height: 100%; }
      .ui-overlay {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 48px 56px;
        box-sizing: border-box;
      }
      .clock { font-size: clamp(76px, 12vw, 120px); font-weight: 200; letter-spacing: -0.02em; opacity: 0.85; text-shadow: 0 0 40px rgba(0, 210, 255, 0.3); }
      .scanline {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 3;
        opacity: 0.2;
        background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%);
        background-size: 100% 4px;
      }
    </style>
    <div class="scanline"></div>
    <div class="ui-overlay">
      <div class="clock" id="clock">00:00</div>
    </div>
    <canvas id="nebula"></canvas>
    <script>
      const canvas = document.getElementById("nebula");
      const gl = canvas.getContext("webgl");
      if (!gl) {
        document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;color:white;font-family:Inter,sans-serif;">WebGL not supported</div>';
      } else {
        const vsSource = 'attribute vec4 aVertexPosition; void main(){ gl_Position = aVertexPosition; }';
        const fsSource = 'precision highp float; uniform float uTime; uniform vec2 uResolution; vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); } float snoise(vec2 v){ const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439); vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx); vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0); vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.0); vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0)); vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m; vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 a0=x-floor(x+0.5); m*=1.79284291400159-0.85373472095314*(a0*a0+h*h); vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g);} void main(){ vec2 uv=gl_FragCoord.xy/uResolution.xy; float time=uTime*0.15; vec2 p=uv*2.0-1.0; p.x*=uResolution.x/uResolution.y; float n=snoise(p*0.5+time*0.2); n+=0.5*snoise(p*1.2-time*0.1); n+=0.25*snoise(p*2.5+time*0.3); vec3 color1=vec3(0.0,0.05,0.15); vec3 color2=vec3(0.0,0.4,0.6); vec3 color3=vec3(0.4,0.1,0.5); vec3 finalColor=mix(color1,color2,n); finalColor=mix(finalColor,color3,snoise(p*0.8+time*0.05)*0.5+0.5); float stars=pow(snoise(uv*100.0),20.0); finalColor+=stars*0.8; float vignette=1.0-length(p*0.5); finalColor*=vignette; gl_FragColor=vec4(finalColor,1.0); }';
        function createShader(type, source) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          return shader;
        }
        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,1,1,-1,-1,1,-1]), gl.STATIC_DRAW);
        const positionAttributeLocation = gl.getAttribLocation(program, "aVertexPosition");
        const timeUniformLocation = gl.getUniformLocation(program, "uTime");
        const resolutionUniformLocation = gl.getUniformLocation(program, "uResolution");
        function updateClock() {
          const now = new Date();
          document.getElementById("clock").textContent = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
        }
        function render(time) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.useProgram(program);
          gl.enableVertexAttribArray(positionAttributeLocation);
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
          gl.uniform1f(timeUniformLocation, time * 0.001);
          gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          updateClock();
          requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
      }
    </script>
  `);
}

function mosaicPage() {
  return shell("Walla Mosaic", `
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), transparent 30%),
          #050505;
        display: grid;
        place-items: center;
      }
      #mosaic {
        display: grid;
        gap: 2px;
        padding: 12px;
        background: #111;
        border-radius: 8px;
        box-shadow: 0 0 70px rgba(0,0,0,0.9);
      }
      .tile {
        width: min(1.4vw, 15px);
        height: min(1.4vw, 15px);
        min-width: 8px;
        min-height: 8px;
        background: #222;
        border-radius: 1px;
        transition: background 500ms ease;
      }
      .controls {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255,255,255,0.25);
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 10px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }
    </style>
    <div id="mosaic"></div>
    <div class="controls">Generative Mosaic // Active</div>
    <script>
      const ROWS = 30;
      const COLS = 60;
      const mosaic = document.getElementById("mosaic");
      const tiles = [];
      mosaic.style.gridTemplateColumns = 'repeat(' + COLS + ', 1fr)';
      const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#d35400', '#c0392b', '#8e44ad', '#2980b9'];
      for (let i = 0; i < ROWS * COLS; i += 1) {
        const tile = document.createElement("div");
        tile.className = "tile";
        mosaic.appendChild(tile);
        tiles.push(tile);
      }
      function update() {
        const time = Date.now() * 0.001;
        tiles.forEach((tile, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const noise = Math.sin(c * 0.1 + time) * Math.cos(r * 0.1 - time * 0.5);
          const noise2 = Math.sin((c + r) * 0.05 + time * 0.2);
          const value = noise + noise2;
          if (value > 0.8) {
            const color = colors[Math.floor((noise + 1) * 5) % colors.length];
            tile.style.background = color;
            tile.style.boxShadow = '0 0 10px ' + color + '44';
          } else if (value > 0.4) {
            tile.style.background = '#333';
            tile.style.boxShadow = 'none';
          } else {
            tile.style.background = '#111';
            tile.style.boxShadow = 'none';
          }
        });
        requestAnimationFrame(update);
      }
      update();
    </script>
  `);
}
