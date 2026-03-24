import type { WorkspaceSnapshot } from '@nexus/websocket';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function renderPill(label: string, value: string, tone?: string): string {
  return `<span class="pill${tone ? ` pill--${tone}` : ''}"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`;
}

function renderGraph(snapshot: WorkspaceSnapshot): string {
  if (snapshot.graph.nodes.length === 0) {
    return '<div class="list-item"><strong>No graph data yet.</strong><div class="list-item__meta">Submit a task with DAG metadata or run a workflow to populate the canvas.</div></div>';
  }

  const nodes = snapshot.graph.nodes.map((node) => `
    <div class="graph-node">
      <div>
        <strong>${escapeHtml(node.label)}</strong>
        <span>${escapeHtml(node.id)} · ${escapeHtml(node.type)}</span>
      </div>
      <div class="pill"><b>${escapeHtml(node.status)}</b></div>
    </div>
  `).join('');

  const edges = snapshot.graph.edges.map((edge) => `
    <div class="edge-line">${escapeHtml(edge.sourceId)} → ${escapeHtml(edge.targetId)}${edge.condition ? ` · ${escapeHtml(edge.condition)}` : ''}</div>
  `).join('');

  return `
    <div class="graph-node-list">${nodes}</div>
    ${edges ? `<div class="list" style="margin-top: 12px;">${edges}</div>` : ''}
  `;
}

function renderTasks(snapshot: WorkspaceSnapshot): string {
  if (snapshot.tasks.length === 0) {
    return '<div class="list-item"><strong>No tasks queued.</strong><div class="list-item__meta">The workspace will list executions here as they are created.</div></div>';
  }

  return snapshot.tasks.slice().reverse().map((task) => `
    <div class="list-item">
      <div class="list-item__top">
        <strong>${escapeHtml(task.taskId)}</strong>
        <span class="pill"><b>${escapeHtml(task.status)}</b></span>
      </div>
      <div class="list-item__meta">${escapeHtml(task.type)} · ${escapeHtml(task.createdAt)}${task.completedAt ? ` · completed ${escapeHtml(task.completedAt)}` : ''}</div>
      ${task.inputPreview ? `<div class="list-item__meta" style="margin-top: 8px;">${escapeHtml(task.inputPreview)}</div>` : ''}
    </div>
  `).join('');
}

function renderLogs(snapshot: WorkspaceSnapshot): string {
  if (snapshot.logs.length === 0) {
    return '<div class="log-entry"><strong>Waiting for events.</strong><div class="list-item__meta">Task execution, workspace updates, and control actions will appear here.</div></div>';
  }

  return snapshot.logs.slice().reverse().map((entry) => `
    <div class="log-entry log-entry--${escapeHtml(entry.level)}">
      <div class="log-entry__meta">
        <span>${escapeHtml(entry.scope)}</span>
        <span>${escapeHtml(entry.timestamp)}</span>
      </div>
      <div><strong>${escapeHtml(entry.message)}</strong></div>
      ${entry.details ? `<div class="list-item__meta" style="margin-top: 6px;">${escapeHtml(JSON.stringify(entry.details))}</div>` : ''}
    </div>
  `).join('');
}

function renderModels(snapshot: WorkspaceSnapshot): string {
  if (snapshot.models.length === 0) {
    return '<div class="list-item"><strong>No models loaded.</strong><div class="list-item__meta">Refresh model data from the API to populate the catalog.</div></div>';
  }

  return snapshot.models.map((model) => `
    <div class="list-item">
      <div class="list-item__top">
        <strong>${escapeHtml(model.name)}</strong>
        <span class="pill"><b>${escapeHtml(model.role)}</b></span>
      </div>
      <div class="list-item__meta">${escapeHtml(model.id)}${model.contextWindow ? ` · context ${formatCount(model.contextWindow)}` : ''}${model.maxOutputTokens ? ` · output ${formatCount(model.maxOutputTokens)}` : ''}</div>
    </div>
  `).join('');
}

export function renderWorkspaceMarkup(snapshot: WorkspaceSnapshot, state: {
  title: string;
  apiBaseUrl: string;
  wsUrl: string;
  connectionStatus: string;
  lastMessage?: string;
  error?: string;
}): string {
  return `
    <div class="hero">
      <div>
        <p class="eyebrow">Nexus Phase 6</p>
        <h1>${escapeHtml(state.title)}</h1>
        <p class="subtitle">A live workspace for observing orchestration, task execution, and system state from the Phase 5 runtime.</p>
      </div>
      <div class="stack" style="justify-items: end;">
        <div class="status-row">
          ${renderPill('API', state.apiBaseUrl, 'accent')}
          ${renderPill('WS', state.wsUrl, 'accent')}
          ${renderPill('Connection', state.connectionStatus, state.connectionStatus === 'connected' ? 'good' : 'warn')}
        </div>
        <button data-action="refresh">Refresh snapshot</button>
      </div>
    </div>
    <div class="grid">
      <div class="stack">
        <section class="panel">
          <div class="panel__header">
            <h2>Execution Graph</h2>
            <span class="pill"><b>${escapeHtml(snapshot.graph.id)}</b></span>
          </div>
          <div class="panel__body graph">
            ${renderGraph(snapshot)}
          </div>
        </section>
        <section class="panel">
          <div class="panel__header">
            <h2>Task Timeline</h2>
            <span class="pill"><b>${formatCount(snapshot.metrics.totalTasks)} tasks</b></span>
          </div>
          <div class="panel__body list">
            ${renderTasks(snapshot)}
          </div>
        </section>
      </div>
      <div class="stack">
        <section class="panel">
          <div class="panel__header">
            <h2>Workspace Metrics</h2>
            <span class="pill"><b>${snapshot.status.status}</b></span>
          </div>
          <div class="panel__body metrics">
            <div class="metric"><label>Running</label><strong>${formatCount(snapshot.metrics.runningTasks)}</strong></div>
            <div class="metric"><label>Completed</label><strong>${formatCount(snapshot.metrics.completedTasks)}</strong></div>
            <div class="metric"><label>Failed</label><strong>${formatCount(snapshot.metrics.failedTasks)}</strong></div>
            <div class="metric"><label>Connections</label><strong>${formatCount(snapshot.metrics.activeConnections)}</strong></div>
          </div>
        </section>
        <section class="panel">
          <div class="panel__header">
            <h2>Models</h2>
            <span class="pill"><b>${formatCount(snapshot.models.length)}</b></span>
          </div>
          <div class="panel__body list">
            ${renderModels(snapshot)}
          </div>
        </section>
        <section class="panel">
          <div class="panel__header">
            <h2>Live Log</h2>
            <span class="pill"><b>${formatCount(snapshot.logs.length)}</b></span>
          </div>
          <div class="panel__body logs">
            ${renderLogs(snapshot)}
          </div>
        </section>
      </div>
    </div>
    <div class="footer">
      ${snapshot.generatedAt ? `Snapshot generated at ${escapeHtml(snapshot.generatedAt)}.` : ''}
      ${state.lastMessage ? ` Latest event: ${escapeHtml(state.lastMessage)}.` : ''}
      ${state.error ? ` <span style="color: var(--bad);">${escapeHtml(state.error)}</span>` : ''}
    </div>
  `;
}
