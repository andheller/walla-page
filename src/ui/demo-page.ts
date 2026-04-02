type DemoAudioConfig = {
  badge: string;
  src: string;
};

const DEMO_AUDIO: Record<string, DemoAudioConfig> = {
  campfire: {
    badge: "Ambient fire",
    src: "/audio/campfire-demo.mp3"
  }
};

function audioConfigForDemo(demoId: string) {
  return DEMO_AUDIO[demoId] ?? null;
}

export function renderDemoDocument(title: string, body: string, demoId: string) {
  const audio = audioConfigForDemo(demoId);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>${title}</title>
    ${audio ? `<style>
      .demo-audio-ui {
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px 8px 14px;
        border-radius: 999px;
        background: rgba(10, 10, 10, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(14px);
        font-family: Inter, system-ui, sans-serif;
        color: rgba(255, 255, 255, 0.92);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24);
      }
      .demo-audio-badge {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        white-space: nowrap;
        color: rgba(255, 255, 255, 0.58);
      }
      .demo-audio-toggle {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        color: white;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        padding: 9px 14px;
        cursor: pointer;
      }
      .demo-audio-toggle[data-active="true"] {
        background: rgba(255, 255, 255, 0.92);
        color: #080808;
      }
      @media (max-width: 640px) {
        .demo-audio-ui {
          top: auto;
          right: 12px;
          bottom: 12px;
          left: 12px;
          justify-content: space-between;
        }
        .demo-audio-badge {
          letter-spacing: 0.12em;
        }
      }
    </style>` : ""}
  </head>
  <body>
    ${body}
    ${audio ? `<script>
      (() => {
        if (window.top !== window.self) return;

        const audioConfig = ${JSON.stringify(audio)};
        const panel = document.createElement("div");
        panel.className = "demo-audio-ui";
        panel.innerHTML = '<span class="demo-audio-badge">' + audioConfig.badge + '</span><button type="button" class="demo-audio-toggle" data-active="false">Enable sound</button>';
        document.body.appendChild(panel);

        const button = panel.querySelector(".demo-audio-toggle");
        const player = new Audio(audioConfig.src);
        player.loop = true;
        player.preload = "auto";
        let enabled = false;

        async function setEnabled(nextEnabled) {
          enabled = nextEnabled;
          button.dataset.active = enabled ? "true" : "false";
          button.textContent = enabled ? "Mute sound" : "Enable sound";
          if (!enabled) {
            player.pause();
            player.currentTime = 0;
            return;
          }
          await player.play();
        }

        button.addEventListener("click", async () => {
          try {
            await setEnabled(!enabled);
          } catch {}
        });

        document.addEventListener("visibilitychange", () => {
          if (document.hidden) {
            player.pause();
            return;
          }
          if (enabled) {
            void player.play().catch(() => {});
          }
        });
      })();
    </script>` : ""}
  </body>
</html>`;
}
