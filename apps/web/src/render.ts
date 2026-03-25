import type { ChatPlan, ChatToolRun } from '@nexus/interfaces/contracts/chat';
import type { WorkspaceSnapshot } from '@nexus/websocket';

import type { CapabilityCatalog, CapabilityDescriptor } from './capabilities';

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

function formatList(values: string[]): string {
  return values.join(' · ');
}

function renderPill(label: string, value: string, tone?: string): string {
  return `<span class="pill${tone ? ` pill--${tone}` : ''}"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></span>`;
}

function renderChip(label: string, tone: CapabilityDescriptor['tone'] = 'accent'): string {
  return `<span class="chip chip--${tone}">${escapeHtml(label)}</span>`;
}

function getSelectedCapability(
  catalog: CapabilityCatalog,
  selectedCapabilityId: string
): CapabilityDescriptor | undefined {
  return catalog.capabilities.find((capability) => capability.id === selectedCapabilityId)
    ?? catalog.capabilities[0];
}

function getTaskConversationId(task: WorkspaceSnapshot['tasks'][number]): string | undefined {
  const metadata = task.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const conversationId = (metadata as Record<string, unknown>).conversationId;
  return typeof conversationId === 'string' ? conversationId : undefined;
}

function getChatMetadata(task: WorkspaceSnapshot['tasks'][number]): {
  request?: { message?: string };
  plan?: ChatPlan;
  toolRuns?: ChatToolRun[];
  finalAnswer?: string;
  model?: string;
} {
  const metadata = task.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const chat = (metadata as Record<string, unknown>).chat;
  if (!chat || typeof chat !== 'object' || Array.isArray(chat)) {
    return {};
  }

  return chat as {
    request?: { message?: string };
    plan?: ChatPlan;
    toolRuns?: ChatToolRun[];
    finalAnswer?: string;
    model?: string;
  };
}

function renderCapabilitySummary(capability: CapabilityDescriptor): string {
  return `
    <div class="summary-card summary-card--${escapeHtml(capability.tone)}">
      <div class="summary-card__top">
        ${renderPill('Suggested tool', capability.title, capability.tone)}
        ${renderPill('Route', capability.route, 'accent')}
      </div>
      <p class="summary-card__lede">${escapeHtml(capability.summary)}</p>
      <div class="summary-card__body">
        <div class="summary-metric">
          <span>Access</span>
          <strong>${escapeHtml(formatList(capability.access))}</strong>
        </div>
        <div class="summary-metric">
          <span>Example</span>
          <strong>${escapeHtml(capability.example)}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderCapabilityDrawer(catalog: CapabilityCatalog, selectedCapabilityId: string): string {
  const selectedCapability = getSelectedCapability(catalog, selectedCapabilityId);
  if (!selectedCapability) {
    throw new Error('No capability selected');
  }

  return `
    <div class="composer-drawer">
      ${renderCapabilitySummary(selectedCapability)}
      <div class="drawer-grid">
        ${catalog.capabilities.map((capability) => `
          <button type="button" class="quick-tool${capability.id === selectedCapability.id ? ' quick-tool--selected' : ''}" data-action="load-capability" data-capability-id="${escapeHtml(capability.id)}">
            <strong>${escapeHtml(capability.title)}</strong>
            <span>${escapeHtml(capability.summary)}</span>
          </button>
        `).join('')}
      </div>
      <p class="drawer-note">These tools are helpers. The assistant will pick the right one automatically unless you want to seed the prompt.</p>
    </div>
  `;
}

function renderModelOptions(snapshot: WorkspaceSnapshot, selectedModelId: string): string {
  const models = snapshot.models.length > 0
    ? snapshot.models
    : [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ];

  return models.map((model) => {
    const modelId = model.id ?? model.name;
    const label = model.name ?? model.id;
    const selected = modelId === selectedModelId ? ' selected' : '';
    return `<option value="${escapeHtml(modelId)}"${selected}>${escapeHtml(label)}</option>`;
  }).join('');
}

function renderGraph(snapshot: WorkspaceSnapshot): string {
  if (snapshot.graph.nodes.length === 0) {
    return `
      <div class="empty-state">
        <strong>No execution graph yet.</strong>
        <p>Send a prompt that triggers planning or tool use to populate the graph.</p>
      </div>
    `;
  }

  return `
    <div class="graph-list">
      ${snapshot.graph.nodes.map((node) => `
        <div class="graph-node">
          <div class="graph-node__label">
            <strong>${escapeHtml(node.label)}</strong>
            <span>${escapeHtml(node.id)} · ${escapeHtml(node.type)}</span>
          </div>
          ${renderPill(node.status, node.status, node.status === 'completed' ? 'good' : node.status === 'failed' ? 'warn' : 'accent')}
        </div>
      `).join('')}
    </div>
    ${snapshot.graph.edges.length > 0 ? `
      <div class="graph-edges">
        ${snapshot.graph.edges.map((edge) => `
          <div class="graph-edge">${escapeHtml(edge.sourceId)} → ${escapeHtml(edge.targetId)}${edge.condition ? ` · ${escapeHtml(edge.condition)}` : ''}</div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

function renderLogs(snapshot: WorkspaceSnapshot): string {
  if (snapshot.logs.length === 0) {
    return `
      <div class="empty-state">
        <strong>Waiting for activity.</strong>
        <p>Planning, tool use, and execution events appear here as they happen.</p>
      </div>
    `;
  }

  return snapshot.logs.slice(-6).reverse().map((entry) => `
    <article class="log-entry log-entry--${escapeHtml(entry.level)}">
      <div class="log-entry__meta">
        <span>${escapeHtml(entry.scope)}</span>
        <span>${escapeHtml(entry.timestamp)}</span>
      </div>
      <div class="log-entry__message">${escapeHtml(entry.message)}</div>
      ${entry.details ? `<div class="log-entry__details">${escapeHtml(JSON.stringify(entry.details))}</div>` : ''}
    </article>
  `).join('');
}

function renderModels(snapshot: WorkspaceSnapshot): string {
  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow eyebrow--small">Models</p>
          <h2>Model access</h2>
        </div>
        ${renderPill('Catalog', formatCount(snapshot.models.length), 'accent')}
      </div>
      <div class="panel__body compact-list">
        ${snapshot.models.length === 0 ? `
          <div class="empty-state">
            <strong>No models loaded.</strong>
            <p>Refresh model data from the API to populate the catalog.</p>
          </div>
        ` : snapshot.models.map((model) => `
          <article class="compact-item">
            <div class="compact-item__top">
              <strong>${escapeHtml(model.name)}</strong>
              ${renderPill(model.role, model.role, 'accent')}
            </div>
            <div class="compact-item__meta">${escapeHtml(model.id)}${model.contextWindow ? ` · context ${formatCount(model.contextWindow)}` : ''}${model.maxOutputTokens ? ` · output ${formatCount(model.maxOutputTokens)}` : ''}</div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderConversationCard(
  task: WorkspaceSnapshot['tasks'][number]
): string {
  const chat = getChatMetadata(task);
  const plan = chat.plan;
  const toolRuns = chat.toolRuns ?? [];
  const prompt = chat.request?.message ?? task.inputPreview ?? task.type;
  const finalAnswer = chat.finalAnswer ?? task.outputPreview ?? task.error ?? 'Waiting for the assistant to finish.';
  const statusTone = task.status === 'completed' ? 'good' : task.status === 'failed' ? 'warn' : 'accent';
  const statusLabel = task.status === 'completed'
    ? 'Complete'
    : task.status === 'failed'
      ? 'Failed'
      : task.status === 'running'
        ? 'Running'
        : 'Queued';

  return `
    <div class="thread-group">
      <article class="message message--user">
        <div class="message__meta">
          <span>You</span>
          <span>${escapeHtml(task.createdAt)}</span>
        </div>
        <div class="message__body">${escapeHtml(prompt)}</div>
      </article>
      <article class="message message--assistant message--plan">
        <div class="message__meta">
          <span>Nexus</span>
          ${renderPill(statusLabel, task.taskId, statusTone)}
        </div>
        <div class="message__body">
          <p>${escapeHtml(plan?.summary ?? 'Planning the request.')}</p>
          ${plan?.selectedTools?.length ? `<p>${escapeHtml(`Selected tools: ${formatList(plan.selectedTools)}`)}</p>` : '<p>Selected tools: none</p>'}
        </div>
        ${plan?.steps?.length ? `
          <div class="plan-steps">
            ${plan.steps.map((step) => `
              <div class="plan-step">
                <strong>${escapeHtml(step.title)}</strong>
                <span>${escapeHtml(step.description)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </article>
      ${toolRuns.map((run) => `
        <article class="message message--tool">
          <div class="message__meta">
            <span>Tool</span>
            ${renderPill(run.status, run.toolName, run.status === 'completed' ? 'good' : 'warn')}
          </div>
          <div class="message__body">
            <p>${escapeHtml(run.toolId)}</p>
            <p>${escapeHtml(typeof run.output === 'string' ? run.output : JSON.stringify(run.output ?? run.error ?? {}, null, 2))}</p>
          </div>
          <div class="message__foot">
            ${run.durationMs !== undefined ? renderChip(`${formatCount(run.durationMs)} ms`, 'accent') : ''}
            ${run.error ? renderChip('Error', 'warn') : ''}
          </div>
        </article>
      `).join('')}
      <article class="message message--assistant message--result">
        <div class="message__meta">
          <span>Nexus</span>
          ${renderPill('Result', task.taskId, statusTone)}
        </div>
        <div class="message__body">${escapeHtml(finalAnswer)}</div>
        <div class="message__foot">
          ${chat.model ? renderChip(chat.model, 'good') : ''}
          ${toolRuns.length ? renderChip(`${toolRuns.length} tool${toolRuns.length === 1 ? '' : 's'}`, 'accent') : renderChip('No tools', 'warn')}
        </div>
      </article>
    </div>
  `;
}

function renderConversation(snapshot: WorkspaceSnapshot, conversationId: string): string {
  const conversationTasks = snapshot.tasks.filter((task) => {
    const taskConversationId = getTaskConversationId(task);
    if (!taskConversationId) {
      return false;
    }
    return taskConversationId === conversationId;
  });

  if (conversationTasks.length === 0) {
    return `
      <div class="empty-state empty-state--conversation">
        <strong>Start a conversation.</strong>
        <p>Ask Nexus anything. It will decide whether to plan, inspect files, list directories, or fetch a URL before answering.</p>
      </div>
    `;
  }

  return conversationTasks.slice(-8).map((task) => renderConversationCard(task)).join('');
}

function renderComposer(
  snapshot: WorkspaceSnapshot,
  catalog: CapabilityCatalog,
  selectedCapability: CapabilityDescriptor,
  message: string,
  modelId: string,
  temperature: string,
  submissionState: string,
  drawerOpen: boolean,
  submissionMessage?: string
): string {
  return `
    <section class="panel panel--composer">
      <div class="panel__header">
        <div>
          <p class="eyebrow eyebrow--small">Composer</p>
          <h2>Ask Nexus anything</h2>
        </div>
        ${renderPill('Queue', `${formatCount(snapshot.metrics.totalTasks)} tasks`, 'accent')}
      </div>
      <div class="panel__body">
        <form class="composer" data-form="chat-composer">
          <div class="composer__bar">
            <button type="button" class="composer__toggle${drawerOpen ? ' composer__toggle--open' : ''}" data-action="toggle-tools" aria-expanded="${drawerOpen ? 'true' : 'false'}" aria-label="Toggle tools">
              +
            </button>
            <label class="field field--prompt">
              <span>Message</span>
              <textarea name="message" rows="4" placeholder="Ask Nexus to inspect the workspace, plan a change, read source, or fetch reference material.">${escapeHtml(message)}</textarea>
            </label>
            <button type="submit">Send</button>
          </div>
          ${drawerOpen ? renderCapabilityDrawer(catalog, selectedCapability.id) : ''}
          <div class="composer__footer">
            <div class="composer__advanced">
              <label class="field">
                <span>Model</span>
                <select name="modelId">
                  ${renderModelOptions(snapshot, modelId)}
                </select>
              </label>
              <label class="field">
                <span>Temp</span>
                <input name="temperature" type="number" min="0" max="2" step="0.1" value="${escapeHtml(temperature)}" />
              </label>
            </div>
            <div class="composer__actions">
              <div class="composer__status composer__status--${escapeHtml(submissionState)}">
                ${submissionMessage ? escapeHtml(submissionMessage) : escapeHtml(submissionState === 'sending' ? 'Sending…' : 'Ready')}
              </div>
              <div class="composer__hint">Nexus will pick tools automatically when they help.</div>
            </div>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderSnapshotHeader(
  title: string,
  snapshot: WorkspaceSnapshot,
  connectionStatus: string,
  apiBaseUrl: string,
  wsUrl: string,
  lastMessage?: string,
  error?: string
): string {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand__mark"></div>
        <div>
          <p class="eyebrow eyebrow--small">Nexus Workspace</p>
          <h1>${escapeHtml(title)}</h1>
        </div>
      </div>
      <div class="topbar__meta">
        ${renderPill('API', apiBaseUrl, 'accent')}
        ${renderPill('WS', wsUrl, 'accent')}
        ${renderPill('Connection', connectionStatus, connectionStatus === 'connected' ? 'good' : connectionStatus === 'error' ? 'warn' : 'accent')}
        ${renderPill('Tasks', formatCount(snapshot.metrics.totalTasks), 'accent')}
        ${renderPill('Event', lastMessage ?? error ?? 'Waiting', error ? 'warn' : 'accent')}
        <button type="button" data-action="refresh">Refresh</button>
        <button type="button" class="button--secondary" data-action="new-chat">New chat</button>
      </div>
    </header>
  `;
}

function renderWorkspaceSidebar(snapshot: WorkspaceSnapshot): string {
  return `
    <aside class="workspace-rail">
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow eyebrow--small">Runtime</p>
            <h2>Workspace state</h2>
          </div>
          ${renderPill('Live', snapshot.connections.active > 0 ? `${formatCount(snapshot.connections.active)} connections` : 'idle', snapshot.connections.active > 0 ? 'good' : 'warn')}
        </div>
        <div class="panel__body stats">
          <div class="stat">
            <span>Running</span>
            <strong>${formatCount(snapshot.metrics.runningTasks)}</strong>
          </div>
          <div class="stat">
            <span>Completed</span>
            <strong>${formatCount(snapshot.metrics.completedTasks)}</strong>
          </div>
          <div class="stat">
            <span>Failed</span>
            <strong>${formatCount(snapshot.metrics.failedTasks)}</strong>
          </div>
          <div class="stat">
            <span>Logs</span>
            <strong>${formatCount(snapshot.metrics.totalLogs)}</strong>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow eyebrow--small">Graph</p>
            <h2>Execution map</h2>
          </div>
          ${renderPill('Nodes', formatCount(snapshot.graph.nodes.length), 'accent')}
        </div>
        <div class="panel__body compact-list">
          ${renderGraph(snapshot)}
        </div>
      </section>
      ${renderModels(snapshot)}
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow eyebrow--small">Activity</p>
            <h2>Latest events</h2>
          </div>
          ${renderPill('Logs', formatCount(snapshot.logs.length), 'accent')}
        </div>
        <div class="panel__body compact-list">
          ${renderLogs(snapshot)}
        </div>
      </section>
    </aside>
  `;
}

export function renderWorkspaceMarkup(
  snapshot: WorkspaceSnapshot,
  state: {
    title: string;
    apiBaseUrl: string;
    wsUrl: string;
    connectionStatus: string;
    lastMessage?: string;
    error?: string;
    capabilities: CapabilityCatalog;
    selectedCapabilityId: string;
    message: string;
    modelId: string;
    temperature: string;
    submissionState: string;
    drawerOpen: boolean;
    conversationId: string;
    submissionMessage?: string;
  }
): string {
  const selectedCapability = getSelectedCapability(state.capabilities, state.selectedCapabilityId);
  if (!selectedCapability) {
    throw new Error('No capabilities available to render');
  }

  return `
    ${renderSnapshotHeader(state.title, snapshot, state.connectionStatus, state.apiBaseUrl, state.wsUrl, state.lastMessage, state.error)}
    <main class="workspace-layout">
      <section class="panel panel--conversation">
        <div class="panel__header">
          <div>
            <p class="eyebrow eyebrow--small">Conversation</p>
            <h2>Master chat</h2>
          </div>
          <div class="panel__header-actions">
            ${renderPill('Conversation', state.conversationId.slice(0, 8), 'accent')}
            ${renderPill('Model', state.modelId, 'accent')}
          </div>
        </div>
        <div class="panel__body conversation-shell">
          <div class="thread">
            <article class="message message--assistant message--intro">
              <div class="message__meta">
                <span>Nexus</span>
                ${renderPill('Ready', 'assistant', 'good')}
              </div>
              <div class="message__body">
                Ask anything. Nexus will plan the work, decide which tools are worth using, execute them, and return a result in the same thread.
              </div>
            </article>
            ${renderConversation(snapshot, state.conversationId)}
            ${state.submissionMessage ? `
              <article class="message message--system">
                <div class="message__meta">
                  <span>Status</span>
                  ${renderPill('Live', state.connectionStatus, state.connectionStatus === 'connected' ? 'good' : 'warn')}
                </div>
                <div class="message__body">${escapeHtml(state.submissionMessage)}</div>
              </article>
            ` : ''}
          </div>
          ${renderComposer(snapshot, state.capabilities, selectedCapability, state.message, state.modelId, state.temperature, state.submissionState, state.drawerOpen, state.submissionMessage)}
        </div>
      </section>
      ${renderWorkspaceSidebar(snapshot)}
    </main>
    <footer class="footer">
      ${snapshot.generatedAt ? `Snapshot generated at ${escapeHtml(snapshot.generatedAt)}.` : ''}
      ${state.lastMessage ? ` Latest event: ${escapeHtml(state.lastMessage)}.` : ''}
      ${state.error ? ` <span class="footer__error">${escapeHtml(state.error)}</span>` : ''}
    </footer>
  `;
}
