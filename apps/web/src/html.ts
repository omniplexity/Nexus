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
    <meta name="theme-color" content="#050814" />
    <title>${escapeHtml(config.title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #050814;
        --surface: rgba(10, 16, 31, 0.88);
        --surface-strong: rgba(13, 20, 38, 0.96);
        --line: rgba(148, 163, 184, 0.16);
        --text: #edf2ff;
        --muted: #97a6bf;
        --accent: #7dd3fc;
        --good: #34d399;
        --warn: #fbbf24;
        --bad: #fb7185;
        --shadow: 0 28px 90px rgba(2, 6, 23, 0.46);
        --display: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
        --body: "Segoe UI", "Aptos", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        --mono: "Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        background:
          radial-gradient(circle at 18% 20%, rgba(125, 211, 252, 0.14), transparent 24%),
          radial-gradient(circle at 84% 18%, rgba(52, 211, 153, 0.11), transparent 20%),
          radial-gradient(circle at 52% 78%, rgba(251, 191, 36, 0.06), transparent 26%),
          linear-gradient(180deg, #050814 0%, #03050b 100%);
        color: var(--text);
        font-family: var(--body);
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
        background-size: 48px 48px;
        mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.84), transparent 92%);
      }
      button, input, select, textarea { font: inherit; }
      button {
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(25, 32, 52, 0.96), rgba(14, 20, 36, 0.96));
        color: var(--text);
        padding: 0.8rem 1rem;
        border-radius: 999px;
        cursor: pointer;
        transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
      }
      button:hover {
        transform: translateY(-1px);
        border-color: rgba(125, 211, 252, 0.28);
      }
      .button--secondary { background: linear-gradient(180deg, rgba(32, 40, 62, 0.96), rgba(18, 24, 40, 0.96)); }
      .app {
        width: min(1600px, calc(100vw - 24px));
        margin: 0 auto;
        padding: 18px 0 28px;
      }
      .topbar, .panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--surface);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        margin-bottom: 18px;
        padding: 18px 20px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }
      .brand__mark {
        width: 14px;
        height: 38px;
        border-radius: 999px;
        background: linear-gradient(180deg, var(--accent), rgba(52, 211, 153, 0.85));
        box-shadow: 0 0 28px rgba(125, 211, 252, 0.26);
        flex: none;
      }
      .eyebrow {
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 0.72rem;
        color: var(--muted);
      }
      .eyebrow--small { margin-bottom: 6px; }
      h1, h2, h3, h4 {
        margin: 0;
        font-family: var(--display);
        line-height: 1.05;
      }
      h1 { font-size: clamp(1.5rem, 2.8vw, 2.2rem); }
      h2 { font-size: 0.96rem; letter-spacing: 0.14em; text-transform: uppercase; }
      h3 { font-size: 1.1rem; }
      h4 { font-size: 1rem; }
      .topbar__meta, .panel__header-actions, .message__meta, .message__foot, .summary-card__top, .compact-item__top, .graph-node, .log-entry__meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .topbar__meta { justify-content: flex-end; }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0.48rem 0.78rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(10, 16, 30, 0.9);
        font-size: 0.84rem;
      }
      .pill b { font-size: 0.68rem; letter-spacing: 0.09em; text-transform: uppercase; }
      .pill span { color: var(--muted); }
      .pill--accent { border-color: rgba(125, 211, 252, 0.28); }
      .pill--good { border-color: rgba(52, 211, 153, 0.28); }
      .pill--warn { border-color: rgba(251, 191, 36, 0.28); }
      .workspace-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(340px, 0.72fr);
        gap: 18px;
        align-items: start;
      }
      .workspace-rail {
        display: grid;
        gap: 16px;
        position: sticky;
        top: 18px;
      }
      .panel { overflow: hidden; }
      .panel__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 18px 0;
      }
      .panel__body { padding: 18px; }
      .conversation-shell {
        display: grid;
        gap: 18px;
      }
      .thread {
        display: grid;
        gap: 14px;
        min-height: 540px;
      }
      .thread-group { display: grid; gap: 12px; }
      .message {
        max-width: min(820px, 92%);
        padding: 16px 18px;
        border-radius: 22px;
        border: 1px solid var(--line);
        background: rgba(9, 14, 25, 0.82);
      }
      .message--assistant {
        background: linear-gradient(180deg, rgba(14, 20, 34, 0.98), rgba(9, 13, 23, 0.98));
      }
      .message--plan {
        border-color: rgba(125, 211, 252, 0.24);
      }
      .message--tool {
        margin-left: 18px;
        max-width: min(760px, 88%);
        background: rgba(7, 11, 20, 0.86);
      }
      .message--result {
        border-color: rgba(52, 211, 153, 0.22);
        background:
          radial-gradient(circle at 14% 12%, rgba(125, 211, 252, 0.1), transparent 34%),
          linear-gradient(180deg, rgba(10, 18, 30, 0.98), rgba(8, 12, 22, 0.98));
      }
      .message--user {
        margin-left: auto;
        background: linear-gradient(180deg, rgba(6, 46, 72, 0.66), rgba(8, 22, 36, 0.88));
        border-color: rgba(125, 211, 252, 0.24);
      }
      .message--system {
        max-width: none;
        border-style: dashed;
        background: rgba(8, 12, 22, 0.62);
      }
      .message--intro {
        max-width: none;
        background:
          radial-gradient(circle at 12% 12%, rgba(125, 211, 252, 0.12), transparent 36%),
          rgba(8, 12, 22, 0.8);
      }
      .message__meta {
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        color: var(--muted);
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .message__body {
        color: #e8eefc;
        line-height: 1.7;
        white-space: pre-wrap;
      }
      .message__body p { margin: 0 0 8px; }
      .message__body p:last-child { margin-bottom: 0; }
      .plan-steps {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }
      .plan-step {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(8, 12, 22, 0.72);
        border: 1px solid var(--line);
      }
      .plan-step strong {
        color: var(--text);
        font-size: 0.92rem;
      }
      .plan-step span {
        color: var(--muted);
        line-height: 1.5;
      }
      .composer {
        display: grid;
        gap: 14px;
        position: sticky;
        bottom: 14px;
        z-index: 2;
      }
      .composer__bar {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: end;
      }
      .composer__toggle {
        width: 44px;
        height: 44px;
        padding: 0;
        border-radius: 14px;
        font-size: 1.2rem;
        line-height: 1;
      }
      .composer__toggle--open {
        border-color: rgba(125, 211, 252, 0.38);
        box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.08);
      }
      .field {
        display: grid;
        gap: 8px;
      }
      .field > span {
        color: var(--muted);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
      }
      .field input, .field select, .field textarea {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--surface-strong);
        color: var(--text);
        padding: 0.92rem 1rem;
        outline: none;
      }
      .field textarea {
        min-height: 110px;
        resize: vertical;
        line-height: 1.65;
      }
      .field input:focus, .field select:focus, .field textarea:focus {
        border-color: rgba(125, 211, 252, 0.42);
        box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.08);
      }
      .composer-drawer {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(8, 12, 22, 0.76);
      }
      .drawer-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .drawer-note {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
        font-size: 0.84rem;
      }
      .quick-tool {
        padding: 12px 14px;
        text-align: left;
        display: grid;
        gap: 4px;
        border-radius: 18px;
        cursor: pointer;
      }
      .quick-tool strong { color: var(--text); }
      .quick-tool span, .summary-card__lede, .compact-item__meta, .log-entry__message, .stat span, .message--system .message__body {
        color: var(--muted);
      }
      .quick-tool--selected {
        border-color: rgba(125, 211, 252, 0.36);
        background: rgba(6, 47, 73, 0.62);
        box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.08);
      }
      .summary-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(13, 20, 36, 0.98), rgba(8, 12, 22, 0.96));
      }
      .summary-card__body { display: grid; gap: 10px; }
      .summary-metric span {
        display: block;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.68rem;
        margin-bottom: 5px;
      }
      .summary-metric strong { display: block; line-height: 1.6; font-size: 0.9rem; }
      .composer__footer {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: end;
      }
      .composer__advanced {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 140px));
        gap: 12px;
      }
      .composer__actions {
        display: grid;
        justify-items: end;
        gap: 10px;
      }
      .composer__status {
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(8, 12, 22, 0.74);
        color: var(--muted);
        max-width: 260px;
        line-height: 1.5;
      }
      .composer__status--sending { border-color: rgba(125, 211, 252, 0.32); color: #d7f4ff; }
      .composer__status--success { border-color: rgba(52, 211, 153, 0.32); color: #d9faea; }
      .composer__status--error { border-color: rgba(251, 113, 133, 0.38); color: #ffe4e6; }
      .composer__hint {
        color: var(--muted);
        font-size: 0.8rem;
        letter-spacing: 0.02em;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .stat, .compact-item, .log-entry, .graph-node {
        padding: 14px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(8, 12, 22, 0.72);
      }
      .stat strong { display: block; font-size: 1.3rem; margin-top: 4px; }
      .compact-item__top, .graph-node, .log-entry__meta { justify-content: space-between; align-items: center; }
      .compact-item__meta, .graph-edge { font-size: 0.8rem; line-height: 1.5; color: var(--muted); }
      .graph-list, .graph-edges, .compact-list { display: grid; gap: 10px; }
      .graph-node__label { display: grid; gap: 4px; }
      .graph-node__label span { color: var(--muted); font-size: 0.8rem; }
      .graph-edge { font-family: var(--mono); }
      .log-entry { display: grid; gap: 8px; }
      .log-entry__meta {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.7rem;
      }
      .log-entry__details {
        color: #d5def5;
        font-family: var(--mono);
        font-size: 0.78rem;
        white-space: pre-wrap;
      }
      .empty-state {
        padding: 18px;
        border-radius: 18px;
        border: 1px dashed rgba(148, 163, 184, 0.28);
        color: var(--muted);
        background: rgba(8, 12, 22, 0.58);
      }
      .empty-state strong { display: block; color: var(--text); margin-bottom: 6px; }
      .empty-state p { margin: 0; line-height: 1.6; }
      .empty-state--conversation {
        min-height: 180px;
        display: grid;
        place-items: center;
        text-align: center;
      }
      .footer {
        margin-top: 16px;
        padding: 0 4px;
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.6;
      }
      .footer__error { color: var(--bad); }
      code { font-family: var(--mono); }
      @media (max-width: 1180px) {
        .workspace-layout { grid-template-columns: 1fr; }
        .workspace-rail { position: static; }
      }
      @media (max-width: 900px) {
        .topbar, .composer__footer, .composer__bar { flex-direction: column; align-items: stretch; }
        .composer__bar { grid-template-columns: 1fr; }
        .topbar__meta, .composer__actions { justify-content: flex-start; justify-items: flex-start; }
        .drawer-grid, .stats { grid-template-columns: 1fr; }
        .app { width: min(100vw - 16px, 1600px); padding-top: 10px; }
      }
    </style>
  </head>
  <body>
    <div id="app" class="app">
      <header class="topbar">
        <div class="brand">
          <div class="brand__mark"></div>
          <div>
            <p class="eyebrow eyebrow--small">Nexus Workspace</p>
            <h1>${escapeHtml(config.title)}</h1>
          </div>
        </div>
        <div class="topbar__meta">
          <span class="pill pill--accent"><b>API</b><span>${escapeHtml(config.apiBaseUrl)}</span></span>
          <span class="pill pill--accent"><b>WS</b><span>${escapeHtml(config.wsUrl)}</span></span>
          <span class="pill pill--warn"><b>Status</b><span>Loading workspace</span></span>
        </div>
      </header>
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow eyebrow--small">Loading</p>
            <h2>Preparing the chat surface</h2>
          </div>
          <span class="pill pill--accent"><b>Ready</b><span>Hydrating</span></span>
        </div>
        <div class="panel__body">
          <div class="message message--assistant message--intro">
            <div class="message__meta"><span>Nexus</span><span>Booting</span></div>
            <div class="message__body">The assistant interface will load here with a master chat in the center and supporting context in the side rail.</div>
          </div>
        </div>
      </section>
    </div>
    <script>
      window.__NEXUS_WORKSPACE_CONFIG__ = ${JSON.stringify(config)};
    </script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`;
}
