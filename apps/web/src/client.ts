import type { ChatResponse } from '@nexus/interfaces/contracts/chat';
import type { WorkspaceServerMessage, WorkspaceSnapshot } from '@nexus/websocket';

import { defaultCapabilityCatalog, type CapabilityCatalog, getCapabilityById } from './capabilities.js';
import { renderWorkspaceMarkup } from './render.js';

type WorkspaceClientConfig = {
  title: string;
  apiBaseUrl: string;
  wsUrl: string;
};

type ComposerState = {
  message: string;
  modelId: string;
  temperature: string;
  selectedCapabilityId: string;
  drawerOpen: boolean;
};

type WorkspaceUiState = {
  snapshot: WorkspaceSnapshot | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage?: string;
  error?: string;
  capabilities: CapabilityCatalog;
  composer: ComposerState;
  conversationId: string;
  submissionState: 'idle' | 'sending' | 'success' | 'error';
  submissionMessage?: string;
};

declare global {
  interface Window {
    __NEXUS_WORKSPACE_CONFIG__?: WorkspaceClientConfig;
  }
}

const defaultConfig: WorkspaceClientConfig = {
  title: 'Nexus Workspace',
  apiBaseUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000/ws',
};

function createConversationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `conversation-${Date.now()}`;
}

const state: WorkspaceUiState = {
  snapshot: null,
  connectionStatus: 'connecting',
  capabilities: defaultCapabilityCatalog,
  composer: {
    message: defaultCapabilityCatalog.capabilities[0]?.example ?? '',
    modelId: 'gpt-4o-mini',
    temperature: '0.3',
    selectedCapabilityId: defaultCapabilityCatalog.defaultCapabilityId,
    drawerOpen: false,
  },
  conversationId: createConversationId(),
  submissionState: 'idle',
};

let websocket: WebSocket | null = null;

function getConfig(): WorkspaceClientConfig {
  return window.__NEXUS_WORKSPACE_CONFIG__ ?? defaultConfig;
}

function appRoot(): HTMLElement {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Workspace root element not found');
  }
  return root;
}

function currentSnapshot(): WorkspaceSnapshot {
  return state.snapshot ?? {
    version: '0.0.1',
    generatedAt: new Date().toISOString(),
    status: {
      status: 'healthy',
      version: '0.0.1',
      environment: 'development',
      uptime: 0,
      lastUpdated: new Date().toISOString(),
    },
    tasks: [],
    graph: { id: 'workspace-graph', nodes: [], edges: [], activeTaskId: null },
    logs: [],
    models: [],
    metrics: {
      totalTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalLogs: 0,
      activeConnections: 0,
    },
    connections: { active: 0 },
  };
}

function currentCapabilityId(): string {
  return getCapabilityById(state.capabilities, state.composer.selectedCapabilityId)?.id
    ?? state.capabilities.defaultCapabilityId;
}

function render(): void {
  const config = getConfig();
  const root = appRoot();
  const snapshot = currentSnapshot();
  const selectedCapability = getCapabilityById(state.capabilities, currentCapabilityId())
    ?? state.capabilities.capabilities[0];

  if (!selectedCapability) {
    throw new Error('No capability catalog available');
  }

  root.innerHTML = renderWorkspaceMarkup(snapshot, {
    title: config.title,
    apiBaseUrl: config.apiBaseUrl,
    wsUrl: config.wsUrl,
    connectionStatus: state.connectionStatus,
    lastMessage: state.lastMessage,
    error: state.error,
    capabilities: state.capabilities,
    selectedCapabilityId: selectedCapability.id,
    message: state.composer.message,
    modelId: state.composer.modelId,
    temperature: state.composer.temperature,
    submissionState: state.submissionState,
    drawerOpen: state.composer.drawerOpen,
    conversationId: state.conversationId,
    submissionMessage: state.submissionMessage,
  });

  const refreshButton = root.querySelector<HTMLButtonElement>('[data-action="refresh"]');
  refreshButton?.addEventListener('click', () => {
    void refreshSnapshot();
  });

  const newChatButton = root.querySelector<HTMLButtonElement>('[data-action="new-chat"]');
  newChatButton?.addEventListener('click', () => {
    resetComposer();
  });

  const toggleToolsButton = root.querySelector<HTMLButtonElement>('[data-action="toggle-tools"]');
  toggleToolsButton?.addEventListener('click', () => {
    state.composer.drawerOpen = !state.composer.drawerOpen;
    render();
  });

  const taskForm = root.querySelector<HTMLFormElement>('[data-form="chat-composer"]');
  taskForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void queueChatFromForm(taskForm);
  });

  const messageField = root.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  messageField?.addEventListener('input', () => {
    state.composer.message = messageField.value;
  });

  const modelSelect = root.querySelector<HTMLSelectElement>('select[name="modelId"]');
  modelSelect?.addEventListener('change', () => {
    state.composer.modelId = modelSelect.value;
  });

  const temperatureInput = root.querySelector<HTMLInputElement>('input[name="temperature"]');
  temperatureInput?.addEventListener('input', () => {
    state.composer.temperature = temperatureInput.value;
  });

  root.querySelectorAll<HTMLButtonElement>('[data-action="load-capability"]').forEach((button) => {
    button.addEventListener('click', () => {
      const capabilityId = button.dataset.capabilityId;
      if (capabilityId) {
        applyCapability(capabilityId, true);
      }
    });
  });
}

function applyCapability(capabilityId: string, replaceMessage: boolean): void {
  const capability = getCapabilityById(state.capabilities, capabilityId);
  if (!capability) {
    return;
  }

  state.composer.selectedCapabilityId = capability.id;
  if (replaceMessage || state.composer.message.trim().length === 0) {
    state.composer.message = capability.example;
  }
  state.composer.drawerOpen = true;
  render();
}

function resetComposer(): void {
  state.composer.message = '';
  state.composer.drawerOpen = false;
  state.submissionState = 'idle';
  state.submissionMessage = undefined;
  state.error = undefined;
  state.conversationId = createConversationId();
  render();
}

async function refreshCapabilities(): Promise<void> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/capabilities`);
    if (!response.ok) {
      throw new Error(`Capabilities request failed with ${response.status}`);
    }

    state.capabilities = (await response.json()) as CapabilityCatalog;
    state.composer.selectedCapabilityId = getCapabilityById(state.capabilities, state.composer.selectedCapabilityId)?.id
      ?? state.capabilities.defaultCapabilityId;
    if (state.composer.message.trim().length === 0) {
      state.composer.message = getCapabilityById(state.capabilities, state.composer.selectedCapabilityId)?.example
        ?? state.capabilities.capabilities[0]?.example
        ?? '';
    }
    state.error = undefined;
    render();
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    render();
  }
}

async function refreshSnapshot(): Promise<void> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/workspace`);
    if (!response.ok) {
      throw new Error(`Snapshot request failed with ${response.status}`);
    }

    state.snapshot = (await response.json()) as WorkspaceSnapshot;
    state.error = undefined;
    state.lastMessage = 'Snapshot hydrated';
    render();
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    state.connectionStatus = 'error';
    render();
  }
}

async function queueChatFromForm(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const message = String(formData.get('message') ?? '').trim();
  const modelId = String(formData.get('modelId') ?? state.composer.modelId);
  const temperatureValue = Number.parseFloat(String(formData.get('temperature') ?? state.composer.temperature));

  state.composer.message = message;
  state.composer.modelId = modelId;
  state.composer.temperature = Number.isFinite(temperatureValue) ? String(temperatureValue) : state.composer.temperature;

  if (!message) {
    state.submissionState = 'error';
    state.submissionMessage = 'Enter a message before sending.';
    render();
    return;
  }

  const config = getConfig();

  state.submissionState = 'sending';
  state.submissionMessage = 'Sending master chat request…';
  render();

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        model: modelId,
        temperature: Number.isFinite(temperatureValue) ? temperatureValue : undefined,
        conversationId: state.conversationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Chat request failed with ${response.status}`);
    }

    const result = await response.json() as ChatResponse;
    state.conversationId = result.conversationId ?? state.conversationId;
    state.composer.drawerOpen = false;
    state.submissionState = 'success';
    state.submissionMessage = result.message;
    state.lastMessage = 'Chat submitted';
    state.error = undefined;
    await refreshSnapshot();
    await refreshCapabilities();
  } catch (error) {
    state.submissionState = 'error';
    state.submissionMessage = error instanceof Error ? error.message : String(error);
    state.error = state.submissionMessage;
    render();
  }
}

async function connectWebSocket(): Promise<void> {
  const config = getConfig();

  try {
    websocket?.close();
    websocket = new WebSocket(config.wsUrl);

    websocket.addEventListener('open', () => {
      state.connectionStatus = 'connected';
      state.error = undefined;
      state.lastMessage = 'WebSocket connected';
      render();
      websocket?.send(JSON.stringify({ event: 'workspace:subscribe' }));
    });

    websocket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as WorkspaceServerMessage;
        handleServerMessage(message);
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
        render();
      }
    });

    websocket.addEventListener('close', () => {
      state.connectionStatus = 'disconnected';
      state.lastMessage = 'WebSocket disconnected';
      render();
      window.setTimeout(connectWebSocket, 1500);
    });

    websocket.addEventListener('error', () => {
      state.connectionStatus = 'error';
      state.error = 'WebSocket connection error';
      render();
    });
  } catch (error) {
    state.connectionStatus = 'error';
    state.error = error instanceof Error ? error.message : String(error);
    render();
  }
}

function handleServerMessage(message: WorkspaceServerMessage): void {
  state.lastMessage = message.event;

  if (message.event === 'workspace:snapshot' && message.data) {
    state.snapshot = message.data as WorkspaceSnapshot;
    state.error = undefined;
    render();
    return;
  }

  if (message.event === 'workspace:pong') {
    return;
  }

  void refreshSnapshot();
}

async function boot(): Promise<void> {
  render();
  await refreshCapabilities();
  await refreshSnapshot();
  void connectWebSocket();
}

window.addEventListener('DOMContentLoaded', () => {
  void boot();
});
