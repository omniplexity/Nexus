export interface WorkspaceWebAppConfig {
  title: string;
  apiBaseUrl: string;
  wsUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderWorkspaceShell(config: WorkspaceWebAppConfig): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b1020" />
    <title>${escapeHtml(config.title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #070b16;
        --bg-soft: rgba(15, 23, 42, 0.72);
        --panel: rgba(10, 15, 30, 0.84);
        --panel-border: rgba(148, 163, 184, 0.18);
        --accent: #7dd3fc;
        --accent-2: #a78bfa;
        --good: #34d399;
        --warn: #fbbf24;
        --bad: #fb7185;
        --text: #e2e8f0;
        --muted: #94a3b8;
        --shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background:
        radial-gradient(circle at top left, rgba(125, 211, 252, 0.12), transparent 24%),
        radial-gradient(circle at bottom right, rgba(167, 139, 250, 0.12), transparent 28%),
        linear-gradient(180deg, #0a0f1c 0%, #050814 100%);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image: linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.8), transparent 95%);
      }
      a { color: var(--accent); text-decoration: none; }
      button {
        border: 1px solid var(--panel-border);
        background: rgba(15, 23, 42, 0.9);
        color: var(--text);
        padding: 0.7rem 1rem;
        border-radius: 999px;
        cursor: pointer;
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      }
      button:hover { transform: translateY(-1px); border-color: rgba(125, 211, 252, 0.45); }
      .app {
        position: relative;
        max-width: 1600px;
        margin: 0 auto;
        padding: 28px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 24px;
      }
      .eyebrow {
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 0.72rem;
        color: var(--muted);
      }
      h1 {
        margin: 0;
        font-size: clamp(2.2rem, 4vw, 4.4rem);
        line-height: 0.95;
      }
      .subtitle {
        margin: 12px 0 0;
        max-width: 58ch;
        color: var(--muted);
        font-size: 0.98rem;
      }
      .status-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0.55rem 0.85rem;
        border: 1px solid var(--panel-border);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.72);
        color: var(--text);
        font-size: 0.9rem;
      }
      .pill--accent {
        border-color: rgba(125, 211, 252, 0.35);
        background: rgba(8, 47, 73, 0.62);
      }
      .pill--good {
        border-color: rgba(52, 211, 153, 0.35);
        background: rgba(6, 78, 59, 0.62);
      }
      .pill--warn {
        border-color: rgba(251, 191, 36, 0.35);
        background: rgba(92, 59, 1, 0.62);
      }
      .pill b { font-weight: 700; }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.95fr);
        gap: 18px;
      }
      .stack {
        display: grid;
        gap: 18px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 24px;
        box-shadow: var(--shadow);
        overflow: hidden;
        backdrop-filter: blur(14px);
      }
      .panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 18px 20px 0;
      }
      .panel__header h2 {
        margin: 0;
        font-size: 1rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .panel__body {
        padding: 18px 20px 20px;
      }
      .layout {
        display: grid;
        gap: 18px;
      }
      .graph {
        display: grid;
        gap: 12px;
      }
      .graph-node-list {
        display: grid;
        gap: 10px;
      }
      .graph-node {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .graph-node strong { display: block; font-size: 0.95rem; }
      .graph-node span { color: var(--muted); font-size: 0.84rem; }
      .edge-line {
        color: var(--muted);
        font-size: 0.82rem;
        padding: 0 4px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .metric {
        padding: 14px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .metric label {
        display: block;
        color: var(--muted);
        font-size: 0.82rem;
        margin-bottom: 8px;
      }
      .metric strong {
        display: block;
        font-size: 1.55rem;
      }
      .list {
        display: grid;
        gap: 10px;
      }
      .list-item {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .list-item__top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      }
      .list-item__top strong { font-size: 0.95rem; }
      .list-item__meta {
        color: var(--muted);
        font-size: 0.82rem;
      }
      .logs {
        max-height: 520px;
        overflow: auto;
        display: grid;
        gap: 10px;
      }
      .log-entry {
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .log-entry--error { border-color: rgba(251, 113, 133, 0.35); }
      .log-entry--warn { border-color: rgba(251, 191, 36, 0.3); }
      .log-entry__meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 0.78rem;
        margin-bottom: 6px;
      }
      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 0.84rem;
      }
      @media (max-width: 1100px) {
        .grid { grid-template-columns: 1fr; }
        .hero { flex-direction: column; }
        .status-row { justify-content: flex-start; }
      }
    </style>
  </head>
  <body>
    <div id="app" class="app"></div>
    <script>
      window.__NEXUS_WORKSPACE_CONFIG__ = ${JSON.stringify(config)};
    </script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`;
}
