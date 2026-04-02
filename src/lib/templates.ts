import type { ScenePreset, SceneTemplateInput, SceneTemplateName } from "./types";

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sceneShell(inner: string, css: string, script = "") {
  return `<style>${css}</style>${inner}${script}`;
}

function buildCampfireMarkup() {
  const vsSource = "attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }";
  const fsSource = "precision highp float; uniform float u_time; uniform vec2 u_resolution; vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); } float snoise(vec2 v) { const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx); vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0); vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)); vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0); m = m*m; m = m*m; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 a0 = x - floor(x + 0.5); m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h); vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g); } void main() { vec2 uv = gl_FragCoord.xy / u_resolution.xy; uv.x -= 0.5; uv.x *= u_resolution.x / u_resolution.y; float fire_shape = 1.0 - smoothstep(0.0, 0.4, abs(uv.x) * (1.0 + uv.y * 1.5)); float n1 = snoise(vec2(uv.x * 3.0, uv.y * 2.0 - u_time * 1.5)) * 0.5 + 0.5; float n2 = snoise(vec2(uv.x * 6.0 + n1, uv.y * 4.0 - u_time * 2.5)) * 0.5 + 0.5; float n3 = snoise(vec2(uv.x * 12.0, uv.y * 8.0 - u_time * 4.0)) * 0.5 + 0.5; float noise = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2); float fire = fire_shape * noise * (1.0 - uv.y); fire = pow(fire, 1.5) * 2.5; vec3 color = vec3(0.0); color += vec3(1.0, 0.1, 0.0) * smoothstep(0.1, 0.5, fire); color += vec3(1.0, 0.6, 0.0) * smoothstep(0.4, 0.8, fire); color += vec3(1.0, 0.9, 0.4) * smoothstep(0.7, 1.0, fire); float blue_base = (1.0 - smoothstep(0.0, 0.2, uv.y)) * (1.0 - abs(uv.x) * 4.0); color += vec3(0.1, 0.4, 1.0) * max(0.0, blue_base) * 0.5; gl_FragColor = vec4(color, fire > 0.01 ? 1.0 : 0.0); }";

  return sceneShell(
    `<main class="ignis-shell">
      <div class="bg-glow"></div>
      <div class="fire-container">
        <canvas id="fire-canvas"></canvas>
        <div class="heat-distortion"></div>
        <div class="logs">
          <div class="log-a"></div>
          <div class="log-b"></div>
          <div class="embers"></div>
        </div>
      </div>
    </main>`,
    `
      body { margin: 0; overflow: hidden; background: #050201; }
      .ignis-shell { width: 100vw; height: 100vh; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .bg-glow { position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(45, 15, 0, 0.3), transparent 70%); animation: pulse 5s infinite ease-in-out; }
      @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }
      .fire-container { position: relative; width: 100%; max-width: 800px; height: 70vh; display: flex; align-items: center; justify-content: center; }
      #fire-canvas { width: 100%; height: 100%; filter: blur(2px) contrast(1.25) brightness(1.1); }
      .heat-distortion { position: absolute; inset: 0; background: linear-gradient(0deg, transparent, rgba(255, 100, 0, 0.05), transparent); opacity: 0.2; mix-blend-mode: overlay; pointer-events: none; }
      .logs { position: absolute; bottom: 0; width: 320px; height: 48px; display: flex; justify-content: center; }
      .log-a { position: absolute; bottom: 0; left: 0; width: 256px; height: 32px; background: #0a0502; border-radius: 99px; transform: rotate(-4deg); box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
      .log-b { position: absolute; bottom: 4px; right: 0; width: 224px; height: 28px; background: #080401; border-radius: 99px; transform: rotate(6deg); box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
      .embers { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 192px; height: 16px; background: rgba(100, 30, 0, 0.2); filter: blur(20px); border-radius: 50%; }
    `,
    `<script>
      (() => {
        const canvas = document.getElementById("fire-canvas");
        const gl = canvas.getContext("webgl", { alpha: true });
        if (!gl) return;
        const vsSource = "${vsSource}";
        const fsSource = "${fsSource}";
        function createShader(gl, type, source) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          return shader;
        }
        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(program);
        gl.useProgram(program);
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        const timeLoc = gl.getUniformLocation(program, "u_time");
        const resLoc = gl.getUniformLocation(program, "u_resolution");
        function render(time) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform1f(timeLoc, time * 0.001);
          gl.uniform2f(resLoc, canvas.width, canvas.height);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
      })();
    </script>`
  );
}

function buildMonitoringMarkup(safe: any) {
  return sceneShell(
    `<main class="monitor-shell">
      <div id="globe-container"></div>
      <div class="overlay">
        <header class="monitor-header">
          <div class="status-group">
            <div class="badge">LIVE_SITUATION_REPORT</div>
            <div class="sys-id">REF: ${safe.kicker}</div>
          </div>
          <div class="time-group" id="current-time">00:00:00 UTC</div>
        </header>
        <div class="center-stage">
          <div class="label-box">SITUATION_ROOM</div>
          <h1 class="headline">${safe.headline}</h1>
          <p class="subline">${safe.body}</p>
        </div>
        <div class="data-grid">
          <div class="data-card">
            <div class="card-label">THREAT_LEVEL</div>
            <div class="card-value">NOMINAL</div>
          </div>
          <div class="data-card">
            <div class="card-label">SYNC_STATUS</div>
            <div class="card-value">ALIGNED</div>
          </div>
          <div class="data-card">
            <div class="card-label">WORKSPACE_ENGAGEMENT</div>
            <div class="card-value">OPTIMAL</div>
          </div>
        </div>
        <footer class="ticker">
          <div class="ticker-track">
            <span>EXECUTIVES_ALIGNED</span><span>CRITICAL_INSIGHT_DETECTED</span><span>SHAREHOLDER_VALUE_STABLE</span><span>ACTIONABLE_DATA_FLOWING</span>
            <span>EXECUTIVES_ALIGNED</span><span>CRITICAL_INSIGHT_DETECTED</span><span>SHAREHOLDER_VALUE_STABLE</span><span>ACTIONABLE_DATA_FLOWING</span>
          </div>
        </footer>
      </div>
      <div class="vignette"></div>
      <div class="scanlines"></div>
    </main>`,
    `
      :root { --accent: ${safe.accent}; --bg: #020408; }
      body { margin: 0; overflow: hidden; background: var(--bg); color: #fff; font-family: monospace; }
      .monitor-shell { width: 100vw; height: 100vh; position: relative; }
      #globe-container { position: absolute; inset: 0; opacity: 0.6; }
      .overlay { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 60px; box-sizing: border-box; }
      .monitor-header { display: flex; justify-content: space-between; align-items: flex-start; }
      .badge { background: var(--accent); color: var(--bg); padding: 4px 12px; font-weight: 800; font-size: 12px; border-radius: 4px; }
      .sys-id { color: rgba(255,255,255,0.4); font-size: 10px; margin-top: 8px; }
      .center-stage { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
      .label-box { color: var(--accent); font-size: 14px; letter-spacing: 0.4em; margin-bottom: 24px; }
      .headline { font-size: 6rem; font-weight: 900; margin: 0; letter-spacing: -0.04em; line-height: 0.85; text-transform: uppercase; }
      .subline { font-size: 1.5rem; color: rgba(255,255,255,0.6); max-width: 40ch; margin-top: 32px; }
      .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 60px; }
      .data-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px); }
      .card-label { color: rgba(255,255,255,0.4); font-size: 10px; letter-spacing: 0.1em; margin-bottom: 8px; }
      .card-value { font-size: 18px; font-weight: 700; color: var(--accent); }
      .ticker { position: absolute; bottom: 0; left: 0; width: 100%; height: 40px; background: rgba(0,0,0,0.5); display: flex; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
      .ticker-track { display: flex; gap: 60px; animation: ticker 30s linear infinite; white-space: nowrap; }
      .ticker-track span { color: rgba(255,255,255,0.4); font-size: 11px; }
      @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .vignette { position: absolute; inset: 0; background: radial-gradient(circle at center, transparent, rgba(0,0,0,0.8)); pointer-events: none; }
      .scanlines { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03)); background-size: 100% 2px, 3px 100%; }
    `,
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.162.0/three.min.js"></script>
    <script>
      (() => {
        const container = document.getElementById('globe-container');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        const geometry = new THREE.SphereGeometry(5, 64, 64);
        const material = new THREE.MeshPhongMaterial({ color: 0x112233, emissive: 0x001122, wireframe: true, transparent: true, opacity: 0.3 });
        const globe = new THREE.Mesh(geometry, material);
        scene.add(globe);
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.5 });
        const starVertices = [];
        for (let i = 0; i < 2000; i++) {
          starVertices.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
        }
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        scene.add(new THREE.Points(starGeometry, starMaterial));
        const light = new THREE.PointLight(0xffffff, 100, 100);
        light.position.set(10, 10, 10);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));
        camera.position.z = 12;
        function animate() {
          requestAnimationFrame(animate);
          globe.rotation.y += 0.002;
          globe.rotation.x += 0.001;
          renderer.render(scene, camera);
        }
        animate();
        setInterval(() => {
          document.getElementById('current-time').textContent = new Date().toUTCString().split(' ')[4] + ' UTC';
        }, 1000);
      })();
    </script>`
  );
}

function buildDashboardMarkup(safe: any) {
  return sceneShell(
    `<main class="bi-shell">
      <section class="main-content">
        <div class="dashboard-canvas">
          <header class="page-header">
            <div class="title-block">
              <div class="dashboard-title">KPI Dashboard</div>
              <div class="subtitle">Commercial operations snapshot / ${safe.kicker}</div>
            </div>
          </header>

          <section class="filters-row">
            <div class="filter"><label>Fiscal Year</label><span>FY2026</span></div>
            <div class="filter"><label>Business Unit</label><span>Core distribution</span></div>
            <div class="filter"><label>Market</label><span>Central region</span></div>
            <div class="filter"><label>Portfolio Lead</label><span>Operations council</span></div>
            <div class="filter"><label>Category</label><span>Managed accounts</span></div>
          </section>

          <section class="top-metrics">
            <div class="metric-panel">
              <div class="metric-title">Operating Cost vs. Budget = 97%</div>
              <div class="metric-subtitle">Budget Variance Threshold = 3%</div>
              <div class="bullet-chart">
                <div class="scale">
                  <span>0%</span><span>50%</span><span>110%</span>
                </div>
                <div class="track expense">
                  <div class="marker" style="left:78%"></div>
                </div>
                <div class="result">97%</div>
              </div>
            </div>

            <div class="metric-panel">
              <div class="metric-title">Gross Margin vs Prior Year = 109%</div>
              <div class="metric-subtitle">Target Margin Expansion = 106%</div>
              <div class="bullet-chart">
                <div class="scale">
                  <span>0%</span><span>50%</span><span>100%</span><span>140%</span>
                </div>
                <div class="track revenue">
                  <div class="marker" style="left:73%"></div>
                </div>
                <div class="result">109%</div>
              </div>
            </div>

            <div class="metric-panel">
              <div class="metric-title">Service Backlog at Risk = 18%</div>
              <div class="metric-subtitle">Backlog Risk Target = 15%</div>
              <div class="bullet-chart">
                <div class="scale">
                  <span>0%</span><span>15%</span><span>30%</span>
                </div>
                <div class="track overdue">
                  <div class="marker" style="left:60%"></div>
                </div>
                <div class="result">18%</div>
              </div>
            </div>
          </section>

          <section class="middle-grid">
            <div class="chart-panel">
              <div class="chart-title">Operating Spend by Cost Center</div>
              <div class="chart-subtitle">Total Spend = $31,842,110</div>
              <div class="donut-layout">
                <svg class="donut" viewBox="0 0 220 220" aria-hidden="true">
                  <circle cx="110" cy="110" r="54" class="donut-bg"></circle>
                  <circle cx="110" cy="110" r="54" class="slice salaries" stroke-dasharray="99.7 339.3" stroke-dashoffset="0"></circle>
                  <circle cx="110" cy="110" r="54" class="slice commission" stroke-dasharray="64.1 374.9" stroke-dashoffset="-99.7"></circle>
                  <circle cx="110" cy="110" r="54" class="slice lease" stroke-dasharray="18.7 420.3" stroke-dashoffset="-163.8"></circle>
                  <circle cx="110" cy="110" r="54" class="slice depreciation" stroke-dasharray="17.0 422.0" stroke-dashoffset="-182.5"></circle>
                  <circle cx="110" cy="110" r="54" class="slice vehicles" stroke-dasharray="11.2 427.8" stroke-dashoffset="-199.5"></circle>
                </svg>
                <div class="donut-labels">
                  <span>Field payroll 29.4%</span>
                  <span>Partner incentives 18.9%</span>
                  <span>Facility occupancy 5.5%</span>
                  <span>Equipment depreciation 5.1%</span>
                  <span>Fleet operations 3.4%</span>
                </div>
              </div>
              <div class="chart-note">* The data set contains negative or zero values that cannot be shown in this chart.</div>
            </div>

            <div class="chart-panel">
              <div class="chart-title">Contribution by Service Line</div>
              <div class="chart-subtitle">Total Contribution = $58,406,982</div>
              <div class="donut-layout">
                <svg class="donut" viewBox="0 0 220 220" aria-hidden="true">
                  <circle cx="110" cy="110" r="54" class="donut-bg"></circle>
                  <circle cx="110" cy="110" r="54" class="slice fresh-veg" stroke-dasharray="73.6 365.4" stroke-dashoffset="0"></circle>
                  <circle cx="110" cy="110" r="54" class="slice hot-dogs" stroke-dasharray="46.9 392.1" stroke-dashoffset="-73.6"></circle>
                  <circle cx="110" cy="110" r="54" class="slice fruit" stroke-dasharray="37.9 401.1" stroke-dashoffset="-120.5"></circle>
                  <circle cx="110" cy="110" r="54" class="slice frozen" stroke-dasharray="27.0 412.0" stroke-dashoffset="-158.4"></circle>
                  <circle cx="110" cy="110" r="54" class="slice sugar" stroke-dasharray="95.3 343.7" stroke-dashoffset="-185.4"></circle>
                </svg>
                <div class="donut-labels">
                  <span>Managed services 21.7%</span>
                  <span>Implementation 13.8%</span>
                  <span>Advisory 11.2%</span>
                  <span>Support retainers 8.6%</span>
                  <span>Project overage 6.1%</span>
                </div>
              </div>
            </div>

            <div class="chart-panel">
              <div class="chart-title">At-Risk Volume by Account Cluster</div>
              <div class="chart-subtitle">Total At-Risk Volume = $184,220</div>
              <div class="donut-layout">
                <svg class="donut" viewBox="0 0 220 220" aria-hidden="true">
                  <circle cx="110" cy="110" r="54" class="donut-bg"></circle>
                  <circle cx="110" cy="110" r="54" class="slice valley" stroke-dasharray="102.3 336.7" stroke-dashoffset="0"></circle>
                  <circle cx="110" cy="110" r="54" class="slice rfi" stroke-dasharray="53.0 386.0" stroke-dashoffset="-102.3"></circle>
                  <circle cx="110" cy="110" r="54" class="slice vendred" stroke-dasharray="21.4 417.6" stroke-dashoffset="-155.3"></circle>
                  <circle cx="110" cy="110" r="54" class="slice sifton" stroke-dasharray="18.1 420.9" stroke-dashoffset="-176.7"></circle>
                  <circle cx="110" cy="110" r="54" class="slice edp" stroke-dasharray="10.5 428.5" stroke-dashoffset="-194.8"></circle>
                </svg>
                <div class="donut-labels">
                  <span>North corridor 30.2%</span>
                  <span>Enterprise renewals 16.6%</span>
                  <span>Legacy accounts 6.5%</span>
                  <span>Mid-market portfolio 5.7%</span>
                  <span>Special projects 2.8%</span>
                </div>
              </div>
              <div class="chart-note">* The data set contains negative or zero values that cannot be shown in this chart.</div>
            </div>
          </section>

          <section class="bottom-grid">
            <div class="line-panel">
              <div class="chart-title">Labor Trend</div>
              <svg viewBox="0 0 320 140" class="line-chart" aria-hidden="true">
              <g class="line-grid">
                <line x1="0" y1="24" x2="320" y2="24"></line>
                <line x1="0" y1="64" x2="320" y2="64"></line>
                <line x1="0" y1="104" x2="320" y2="104"></line>
              </g>
              <g class="bars">
                <rect x="16" y="72" width="10" height="32" class="bar blue-light"></rect>
                <rect x="34" y="58" width="10" height="46" class="bar blue-light"></rect>
                <rect x="52" y="61" width="10" height="43" class="bar blue-light"></rect>
                <rect x="70" y="76" width="10" height="28" class="bar blue-light"></rect>
                <rect x="88" y="64" width="10" height="40" class="bar blue-light"></rect>
                <rect x="106" y="55" width="10" height="49" class="bar blue-light"></rect>
                <rect x="124" y="59" width="10" height="45" class="bar blue-light"></rect>
                <rect x="142" y="56" width="10" height="48" class="bar blue-light"></rect>
                <rect x="160" y="58" width="10" height="46" class="bar blue-light"></rect>
                <rect x="178" y="54" width="10" height="50" class="bar blue-light"></rect>
                <rect x="196" y="63" width="10" height="41" class="bar blue-light"></rect>
                <rect x="214" y="55" width="10" height="49" class="bar blue-light"></rect>
                <rect x="232" y="61" width="10" height="43" class="bar blue-light"></rect>
                <rect x="250" y="57" width="10" height="47" class="bar blue-light"></rect>
                <rect x="268" y="62" width="10" height="42" class="bar blue-light"></rect>
                <rect x="286" y="55" width="10" height="49" class="bar blue-light"></rect>
                <rect x="304" y="67" width="10" height="37" class="bar blue-light"></rect>
              </g>
                <g class="bar-values">
                  <text x="12" y="118">Jan $1.2M</text>
                  <text x="122" y="118">Q2 Avg $1.4M</text>
                  <text x="254" y="118">Jun $1.3M</text>
                </g>
              </svg>
            </div>

            <div class="line-panel">
              <div class="chart-title">Contribution Trend</div>
              <svg viewBox="0 0 320 140" class="line-chart" aria-hidden="true">
              <g class="line-grid">
                <line x1="0" y1="24" x2="320" y2="24"></line>
                <line x1="0" y1="64" x2="320" y2="64"></line>
                <line x1="0" y1="104" x2="320" y2="104"></line>
              </g>
              <g class="bars">
                <rect x="16" y="42" width="10" height="62" class="bar blue-mid"></rect>
                <rect x="34" y="60" width="10" height="44" class="bar blue-mid"></rect>
                <rect x="52" y="82" width="10" height="22" class="bar blue-mid"></rect>
                <rect x="70" y="78" width="10" height="26" class="bar blue-mid"></rect>
                <rect x="88" y="80" width="10" height="24" class="bar blue-mid"></rect>
                <rect x="106" y="58" width="10" height="46" class="bar blue-mid"></rect>
                <rect x="124" y="86" width="10" height="18" class="bar blue-mid"></rect>
                <rect x="142" y="55" width="10" height="49" class="bar blue-mid"></rect>
                <rect x="160" y="78" width="10" height="26" class="bar blue-mid"></rect>
                <rect x="178" y="63" width="10" height="41" class="bar blue-mid"></rect>
                <rect x="196" y="54" width="10" height="50" class="bar blue-mid"></rect>
                <rect x="214" y="70" width="10" height="34" class="bar blue-mid"></rect>
                <rect x="232" y="90" width="10" height="14" class="bar blue-mid"></rect>
                <rect x="250" y="84" width="10" height="20" class="bar blue-mid"></rect>
                <rect x="268" y="60" width="10" height="44" class="bar blue-mid"></rect>
                <rect x="286" y="90" width="10" height="14" class="bar blue-mid"></rect>
                <rect x="304" y="52" width="10" height="52" class="bar blue-mid"></rect>
              </g>
                <g class="bar-values">
                  <text x="12" y="118">Jan $8.4M</text>
                  <text x="122" y="118">Low $7.1M</text>
                  <text x="258" y="118">Peak $8.9M</text>
                </g>
              </svg>
            </div>

            <div class="line-panel">
              <div class="chart-title">Fulfillment Risk Trend</div>
              <svg viewBox="0 0 320 140" class="line-chart" aria-hidden="true">
              <g class="line-grid">
                <line x1="0" y1="24" x2="320" y2="24"></line>
                <line x1="0" y1="64" x2="320" y2="64"></line>
                <line x1="0" y1="104" x2="320" y2="104"></line>
              </g>
              <path d="M12 98 L28 98 L44 98 L60 96 L76 40 L92 58 L108 57 L124 51 L140 48 L156 50 L172 54 L188 60 L204 78 L220 50 L236 52 L252 38 L268 43 L284 47 L300 46 L316 60" class="line blue"></path>
                <g class="bar-values">
                  <text x="12" y="118">Baseline 12%</text>
                  <text x="130" y="118">High 18%</text>
                  <text x="264" y="118">Current 15%</text>
                </g>
              </svg>
            </div>
          </section>
        </div>
      </section>
    </main>`,
    `
      :root { --bg: #f8f8f8; --surface: #ffffff; --ink: #767676; --ink-strong: #5f5f5f; --line: #dddddd; --blue: #5b9bd5; }
      body { margin: 0; background: #efefef; font-family: Arial, Helvetica, sans-serif; color: var(--ink); overflow: hidden; }
      .bi-shell { min-height: 100vh; height: 100vh; box-sizing: border-box; }
      .main-content {
        background: var(--surface);
        border-top: 1px solid #d9d9d9;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 10px;
        overflow: auto;
      }
      .dashboard-canvas {
        width: min(1520px, 100%);
        display: grid;
        gap: 14px;
        margin: auto 0;
      }
      .page-header { display: flex; align-items: center; min-height: 28px; }
      .dashboard-title { font-size: 17px; color: #9b9b9b; }
      .subtitle { display: none; }
      .filters-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
      .filter { border: 1px solid var(--line); min-height: 38px; padding: 4px 8px; display: grid; align-content: center; background: #fff; }
      .filter label { font-size: 10px; color: var(--ink-strong); font-weight: 700; margin-bottom: 3px; }
      .filter span { font-size: 12px; color: #8a8a8a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .top-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
      .metric-panel { padding: 2px 0; }
      .metric-title { font-size: 11px; color: var(--ink-strong); font-weight: 700; margin-bottom: 2px; }
      .metric-subtitle { font-size: 10px; color: #9b9b9b; margin-bottom: 16px; }
      .bullet-chart { position: relative; padding-top: 14px; }
      .scale { display: flex; justify-content: space-between; font-size: 9px; color: #8f8f8f; margin-bottom: 6px; }
      .track { position: relative; height: 8px; border-radius: 0; }
      .track.expense { background: linear-gradient(90deg, #39c44a 0 20%, #9ad44d 20% 45%, #ffd84c 45% 70%, #ff9f2f 70% 85%, #ff4f35 85% 100%); }
      .track.revenue { background: linear-gradient(90deg, #ff4f35 0 20%, #ff9f2f 20% 35%, #ffd84c 35% 50%, #a4d045 50% 75%, #39c44a 75% 100%); }
      .track.overdue { background: linear-gradient(90deg, #39c44a 0 15%, #8fd148 15% 22%, #ffd84c 22% 30%, #ff9f2f 30% 58%, #ff4f35 58% 100%); }
      .marker { position: absolute; top: -5px; width: 2px; height: 18px; background: #666; }
      .marker::before, .marker::after { content: ""; position: absolute; left: -4px; width: 10px; height: 2px; background: #666; }
      .marker::before { top: 3px; }
      .marker::after { bottom: 3px; }
      .result { text-align: center; font-size: 10px; color: var(--ink-strong); margin-top: 5px; font-weight: 700; }
      .middle-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
      .chart-panel { min-width: 0; }
      .chart-title { font-size: 11px; color: var(--ink-strong); font-weight: 700; margin-bottom: 2px; }
      .chart-subtitle { font-size: 10px; color: #9b9b9b; margin-bottom: 10px; }
      .donut-layout { display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center; }
      .donut { width: 150px; height: 150px; }
      .donut-bg { fill: none; stroke: #f1f1f1; stroke-width: 24; }
      .slice { fill: none; stroke-width: 24; transform: rotate(-90deg); transform-origin: 110px 110px; }
      .slice.salaries, .slice.fresh-veg, .slice.valley { stroke: #214f85; }
      .slice.commission, .slice.hot-dogs, .slice.rfi { stroke: #3f78b5; }
      .slice.lease, .slice.fruit, .slice.vendred { stroke: #6ea2d4; }
      .slice.depreciation, .slice.frozen, .slice.sifton { stroke: #9fc0df; }
      .slice.vehicles, .slice.sugar, .slice.edp { stroke: #d7e4f1; }
      .donut-labels { display: grid; gap: 6px; font-size: 10px; color: var(--ink-strong); line-height: 1.2; }
      .chart-note { font-size: 10px; color: #9b9b9b; font-style: italic; margin-top: 8px; }
      .bottom-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
      .line-panel { min-width: 0; }
      .line-chart { width: 100%; height: auto; display: block; }
      .line-grid line { stroke: #e6e6e6; stroke-width: 1; }
      .line { fill: none; stroke-width: 2.5; stroke: var(--blue); }
      .bar { fill: var(--blue); }
      .bar.blue-light { fill: #7fb0db; }
      .bar.blue-mid { fill: #4f94cc; }
      .bar-values text { fill: #8a8a8a; font-size: 10px; font-family: Arial, Helvetica, sans-serif; }
    `
  );
}

function buildLofiMarkup(safe: any) {
  return sceneShell(
    `<main class="lofi-shell">
      <div class="lofi-bg"></div>
      <div class="grain"></div>
      <div class="layout">
        <header class="header">
          <div class="logo">VAL_STUDY</div>
          <div class="mode">POMODORO // ${safe.kicker}</div>
        </header>
        <div class="content">
          <div class="timer-area">
            <div id="lofi-timer" class="timer">25:00</div>
            <div class="timer-label">VALUE_CREATION_WINDOW</div>
          </div>
          <div class="copy-area">
            <h1 class="editorial-headline">${safe.headline}</h1>
            <p class="editorial-body">${safe.body}</p>
          </div>
        </div>
        <footer class="footer">
          <div class="now-playing">
            <div class="music-bars"><span></span><span></span><span></span></div>
            <span>Strategic Alignment Beats to Relax/Study To</span>
          </div>
          <div class="status">LIVE_ON_WALLA</div>
        </footer>
      </div>
    </main>`,
    `
      :root { --accent: ${safe.accent}; }
      body { margin: 0; overflow: hidden; background: #121212; font-family: sans-serif; color: #fff; }
      .lofi-shell { width: 100vw; height: 100vh; position: relative; }
      .lofi-bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1516116216624-53e697fedbea?q=80&w=2128') center/cover; filter: grayscale(0.4) contrast(0.8) brightness(0.5); }
      .grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.08; background-image: url('https://grainy-gradients.vercel.app/noise.svg'); }
      .layout { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 80px; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)); }
      .header { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px; }
      .logo { font-weight: 900; font-size: 14px; letter-spacing: 0.2em; }
      .mode { font-family: monospace; font-size: 10px; color: var(--accent); }
      .content { flex-grow: 1; display: flex; align-items: center; gap: 100px; }
      .timer { font-size: 12rem; font-weight: 800; letter-spacing: -0.05em; line-height: 0.8; margin-bottom: 16px; }
      .timer-label { font-family: monospace; font-size: 12px; color: rgba(255,255,255,0.4); letter-spacing: 0.3em; }
      .copy-area { max-width: 500px; }
      .editorial-headline { font-family: serif; font-style: italic; font-size: 4rem; font-weight: 400; margin: 0 0 24px; color: var(--accent); }
      .editorial-body { font-size: 1.25rem; line-height: 1.6; color: rgba(255,255,255,0.7); }
      .footer { display: flex; justify-content: space-between; align-items: flex-end; }
      .now-playing { display: flex; align-items: center; gap: 16px; font-size: 12px; color: rgba(255,255,255,0.5); }
      .music-bars { display: flex; gap: 3px; height: 12px; }
      .music-bars span { width: 2px; background: var(--accent); animation: bar 1s infinite alternate; }
      @keyframes bar { from { height: 4px; } to { height: 12px; } }
      .status { font-family: monospace; font-size: 10px; padding: 4px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 99px; }
    `,
    `<script>
      (() => {
        let secs = 25 * 60;
        setInterval(() => {
          if (secs > 0) {
            secs--;
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            document.getElementById('lofi-timer').textContent = m + ":" + s.toString().padStart(2, '0');
          }
        }, 1000);
      })();
    </script>`
  );
}

function buildAuroraMarkup(safe: any) {
  return sceneShell(
    `<main class="aurora-shell">
      <div class="blobs">
        <div class="blob a"></div>
        <div class="blob b"></div>
        <div class="blob c"></div>
      </div>
      <div class="editorial-layout">
        <header class="top-nav">
          <div class="walla-mark">W_</div>
          <div class="issue-tag">Morning Brief // ${safe.kicker}</div>
        </header>
        <section class="main-body">
          <div class="columns">
            <div class="col-left">
              <h1 class="brief-title">${safe.headline}</h1>
              <div class="brief-accent-line"></div>
            </div>
            <div class="col-right">
              <p class="brief-body">${safe.body}</p>
              <div class="brief-footer">
                <span class="source">${safe.title}</span>
                <span class="date">Morning Edition</span>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div class="glass-overlay"></div>
    </main>`,
    `
      :root { --accent: ${safe.accent}; }
      body { margin: 0; overflow: hidden; background: #fdfcf9; color: #1a1a1a; font-family: system-ui, sans-serif; }
      .aurora-shell { width: 100vw; height: 100vh; position: relative; display: grid; place-items: center; }
      .blobs { position: absolute; inset: 0; filter: blur(80px); opacity: 0.15; z-index: 0; }
      .blob { position: absolute; width: 60vw; height: 60vw; border-radius: 50%; }
      .blob.a { background: var(--accent); top: -20vh; left: -10vw; animation: drift 20s infinite alternate; }
      .blob.b { background: #0ce6b6; bottom: -20vh; right: -10vw; animation: drift 25s infinite alternate-reverse; }
      .blob.c { background: #3b82f6; top: 20vh; right: 10vw; width: 40vw; height: 40vw; animation: drift 18s infinite alternate; }
      @keyframes drift { from { transform: translate(0,0) scale(1); } to { transform: translate(10vw, 10vh) scale(1.2); } }
      .editorial-layout { position: relative; z-index: 10; width: 80vw; max-width: 1400px; }
      .top-nav { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 24px; margin-bottom: 80px; }
      .walla-mark { font-weight: 900; font-size: 32px; letter-spacing: -0.05em; }
      .issue-tag { font-family: monospace; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
      .columns { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 100px; align-items: flex-start; }
      .brief-title { font-family: serif; font-size: 8rem; font-weight: 900; margin: 0; line-height: 0.85; letter-spacing: -0.04em; }
      .brief-accent-line { width: 120px; height: 12px; background: var(--accent); margin-top: 40px; }
      .brief-body { font-size: 2.5rem; line-height: 1.2; font-weight: 400; color: #4a4a4a; margin: 0; }
      .brief-footer { margin-top: 60px; display: flex; flex-direction: column; gap: 8px; }
      .source { font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
      .date { font-family: serif; font-style: italic; font-size: 18px; color: #888; }
      .glass-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.01); backdrop-filter: contrast(1.02) saturate(1.05); pointer-events: none; }
    `
  );
}

export const scenePresets: ScenePreset[] = [
  {
    id: "monitoring-the-situation",
    label: "Global Operations",
    title: "Monitoring",
    template: "monitoring",
    headline: "GLOBAL OPERATIONS",
    body: "Regional sync active. Neural nodes at 98% efficiency.",
    accent: "#f4a447",
    kicker: "LIVE_v4",
    durationMs: 60_000,
    publicDescription: "High-end global status board for situational awareness."
  },
  {
    id: "executive-dashboard",
    label: "Executive Dashboard",
    title: "Performance",
    template: "dashboard",
    headline: "EXECUTIVE PERFORMANCE",
    body: "Strategic alignment complete. Quarterly targets exceeded.",
    accent: "#3b82f6",
    kicker: "BOARDROOM",
    durationMs: 45_000,
    publicDescription: "Professional executive dashboard with data visualizations."
  },
  {
    id: "morning-brief",
    label: "The Morning Brief",
    title: "Welcome",
    template: "aurora",
    headline: "The Morning Brief.",
    body: "Deep focus until noon. Sync at 2. Weather is clear.",
    accent: "#ff9966",
    kicker: "GOOD MORNING",
    durationMs: 22_000,
    publicDescription: "Editorial editorial welcome screen with layered color."
  },
  {
    id: "campfire",
    label: "Campfire",
    title: "Campfire",
    template: "campfire",
    headline: "",
    body: "",
    accent: "#ff7a18",
    kicker: "",
    durationMs: 45_000,
    publicDescription: "High-fidelity WebGL fire shader for ambient relaxation."
  }
];

export function getScenePreset(id: string) {
  return scenePresets.find((preset) => preset.id === id) ?? null;
}

export function buildTemplateMarkup(template: SceneTemplateName | string, input: SceneTemplateInput) {
  const safe = {
    title: esc(input.title),
    headline: esc(input.headline),
    body: esc(input.body),
    accent: input.accent || "#ff7a18",
    kicker: esc(input.kicker ?? "LIVE")
  };

  if (template === "campfire") {
    return buildCampfireMarkup();
  }
  if (template === "monitoring") {
    return buildMonitoringMarkup(safe);
  }
  if (template === "dashboard") {
    return buildDashboardMarkup(safe);
  }
  if (template === "lofi") {
    return buildLofiMarkup(safe);
  }
  if (template === "aurora") {
    return buildAuroraMarkup(safe);
  }

  if (template === "terminal") {
    const lines = input.body.split("\\n").map(l => `<div class="log-entry">${esc(l)}</div>`).join("");
    return sceneShell(
      `<div class="terminal-container">
        <div class="terminal-header">
          <span>${safe.headline}</span>
          <span>${safe.kicker}</span>
        </div>
        <div class="terminal-content" id="log">
          \${lines}
          <span class="cursor"></span>
        </div>
        <div class="scanline"></div>
      </div>`,
      `
        :root {
          --terminal-green: ${safe.accent};
          --terminal-bg: #0d0208;
          --terminal-dim: #003b00;
        }
        body {
          margin: 0;
          overflow: hidden;
          background-color: var(--terminal-bg);
          color: var(--terminal-green);
          font-family: "Courier New", Courier, monospace;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .terminal-container {
          width: 90vw;
          height: 80vh;
          border: 2px solid var(--terminal-green);
          padding: 20px;
          box-shadow: 0 0 20px var(--terminal-dim);
          position: relative;
          overflow: hidden;
        }
        .terminal-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: var(--terminal-green);
          color: var(--terminal-bg);
          padding: 2px 10px;
          font-weight: bold;
          font-size: 0.8rem;
          display: flex;
          justify-content: space-between;
        }
        .terminal-content {
          margin-top: 20px;
          font-size: 1.2rem;
          line-height: 1.4;
        }
        .cursor {
          display: inline-block;
          width: 10px;
          height: 1.2rem;
          background: var(--terminal-green);
          animation: blink 1s step-end infinite;
          vertical-align: middle;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: rgba(0, 255, 65, 0.1);
          opacity: 0.3;
          animation: scan 8s linear infinite;
          pointer-events: none;
        }
        @keyframes scan {
          from { top: 0; }
          to { top: 100%; }
        }
        .log-entry {
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeIn 0.3s forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `
    );
  }

  if (template === "aesthetic") {
    return sceneShell(
      `<div class="grid"></div>
      <div class="sun"></div>
      <div class="content">
        <h1>${safe.headline}</h1>
        <h2>${safe.body}</h2>
      </div>
      <div class="vhs-overlay"></div>
      <div class="scanline"></div>`,
      `
        :root {
          --vapor-pink: ${safe.accent};
          --vapor-blue: #01cdfe;
          --vapor-green: #05ffa1;
          --vapor-purple: #b967ff;
          --vapor-yellow: #fffb96;
          --vapor-dark: #241734;
        }

        body {
          margin: 0;
          overflow: hidden;
          background-color: var(--vapor-dark);
          color: white;
          font-family: sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          perspective: 1000px;
        }

        .grid {
          position: fixed;
          bottom: -50%;
          left: -50%;
          width: 200%;
          height: 100%;
          background-image: 
            linear-gradient(transparent 0%, var(--vapor-pink) 2%, transparent 3%),
            linear-gradient(90deg, transparent 0%, var(--vapor-pink) 2%, transparent 3%);
          background-size: 50px 50px;
          transform: rotateX(60deg);
          animation: grid-move 2s linear infinite;
          z-index: 1;
        }

        @keyframes grid-move {
          from { background-position: 0 0; }
          to { background-position: 0 50px; }
        }

        .sun {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -80%);
          width: 400px;
          height: 400px;
          background: linear-gradient(var(--vapor-yellow) 0%, var(--vapor-pink) 60%, var(--vapor-purple) 100%);
          border-radius: 50%;
          box-shadow: 0 0 80px var(--vapor-pink);
          z-index: 0;
        }

        .sun::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: repeating-linear-gradient(transparent 0%, transparent 10%, var(--vapor-dark) 10%, var(--vapor-dark) 12%);
          border-radius: 50%;
        }

        .content {
          position: relative;
          z-index: 2;
          text-align: center;
          text-shadow: 0 0 10px var(--vapor-blue), 0 0 20px var(--vapor-pink);
        }

        h1 {
          font-size: 8rem;
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.05em;
          background: linear-gradient(to bottom, var(--vapor-blue) 0%, var(--vapor-pink) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 15px rgba(255, 113, 206, 0.8));
          animation: glitch 1s infinite alternate;
        }

        h2 {
          font-size: 2rem;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: var(--vapor-green);
          margin-top: -10px;
        }

        .vhs-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
          z-index: 10;
          opacity: 0.4;
        }

        @keyframes glitch {
          0% { transform: skew(0deg); }
          20% { transform: skew(1deg); }
          40% { transform: skew(-1deg); }
          60% { transform: skew(0.5deg); }
          80% { transform: skew(-0.5deg); }
          100% { transform: skew(0deg); }
        }

        .scanline {
          width: 100%;
          height: 100px;
          z-index: 11;
          background: linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 0.2) 10%, rgba(0, 0, 0, 0.1) 100%);
          opacity: 0.1;
          position: absolute;
          bottom: 100%;
          animation: scanline 10s linear infinite;
        }

        @keyframes scanline {
          0% { bottom: 100%; }
          80% { bottom: 100%; }
          100% { bottom: -100px; }
        }
      `
    );
  }

  if (template === "focus") {
    return sceneShell(
      `<main class="focus-shell">
        <div class="focus-noise"></div>
        <section class="focus-card">
          <p class="focus-kicker">${safe.kicker}</p>
          <h1>${safe.headline}</h1>
          <p class="focus-body">${safe.body}</p>
          <footer>${safe.title}</footer>
        </section>
      </main>`,
      `
        :root { color-scheme: dark; }
        body { margin: 0; overflow: hidden; font-family: "Trebuchet MS", "Avenir Next", sans-serif; }
        .focus-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          color: white;
          background:
            radial-gradient(circle at 15% 10%, ${safe.accent}55, transparent 30%),
            radial-gradient(circle at 85% 20%, #2ee6a655, transparent 28%),
            linear-gradient(135deg, #07131f 0%, #10233b 45%, #07131f 100%);
          position: relative;
        }
        .focus-noise {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(transparent 0 96%, rgba(255,255,255,0.035) 96% 100%),
            radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 62%);
          background-size: 100% 11px, 100% 100%;
          opacity: 0.45;
          animation: drift 18s linear infinite;
        }
        .focus-card {
          width: min(88vw, 1100px);
          padding: 4rem 4.5rem;
          border-radius: 36px;
          background: rgba(4, 10, 18, 0.7);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 30px 80px rgba(0,0,0,0.38);
          backdrop-filter: blur(18px);
          position: relative;
        }
        .focus-kicker {
          margin: 0 0 1rem;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: ${safe.accent};
          font-size: 1rem;
        }
        h1 {
          margin: 0;
          font-size: clamp(4rem, 9vw, 8rem);
          line-height: 0.94;
          max-width: 11ch;
        }
        .focus-body {
          margin-top: 1.35rem;
          font-size: clamp(1.25rem, 2.5vw, 2.25rem);
          max-width: 30ch;
          color: rgba(255,255,255,0.82);
        }
        footer {
          margin-top: 2rem;
          color: rgba(255,255,255,0.55);
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }
        @keyframes drift {
          from { transform: translateY(0); }
          to { transform: translateY(-11px); }
        }
      `
    );
  }

  return sceneShell(
    `<main class="poster-shell">
      <div class="poster-bar"></div>
      <section>
        <p>${safe.kicker}</p>
        <h1>${safe.headline}</h1>
        <h2>${safe.body}</h2>
        <span>${safe.title}</span>
      </section>
    </main>`,
    `
      body { margin: 0; overflow: hidden; font-family: "Gill Sans", "Avenir Next", sans-serif; }
      .poster-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        color: white;
        background: linear-gradient(120deg, #0c1624 0%, #12253d 42%, #061018 100%);
        position: relative;
      }
      .poster-bar {
        position: absolute;
        inset: 0 auto 0 0;
        width: 18px;
        background: ${safe.accent};
        box-shadow: 0 0 40px ${safe.accent};
      }
      section {
        width: min(90vw, 1100px);
      }
      p {
        margin: 0;
        letter-spacing: 0.35em;
        text-transform: uppercase;
        color: ${safe.accent};
        font-size: 1rem;
      }
      h1 {
        margin: 1rem 0 0;
        font-size: clamp(4rem, 12vw, 10rem);
        line-height: 0.88;
        max-width: 8ch;
      }
      h2 {
        margin: 1.25rem 0 0;
        max-width: 18ch;
        font-size: clamp(1.5rem, 3vw, 2.8rem);
        font-weight: 400;
        color: rgba(255,255,255,0.78);
      }
      span {
        display: inline-block;
        margin-top: 2rem;
        font-size: 1rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.52);
      }
    `
  );
}

export function showcaseScenes(now: number) {
  return [
    { ...scenePresets[0], startAt: now + 5_000 },
    { ...scenePresets[1], startAt: now + 65_000 },
    { ...scenePresets[2], startAt: now + 110_000 },
    { ...scenePresets[3], startAt: now + 132_000 }
  ];
}
