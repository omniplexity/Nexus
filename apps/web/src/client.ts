import type { WorkspaceServerMessage, WorkspaceSnapshot } from '@nexus/websocket';

import { renderWorkspaceMarkup } from './render';

type WorkspaceClientConfig = {
  title: string;
  apiBaseUrl: string;
  wsUrl: string;
};

type WorkspaceUiState = {
  snapshot: WorkspaceSnapshot | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage?: string;
  error?: string;
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

const state: WorkspaceUiState = {
  snapshot: null,
  connectionStatus: 'connecting',
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

function render(): void {
  const config = getConfig();
  const root = appRoot();
  const snapshot: WorkspaceSnapshot = state.snapshot ?? {
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
    metrics: { totalTasks: 0, runningTasks: 0, completedTasks: 0, failedTasks: 0, totalLogs: 0, activeConnections: 0 },
    connections: { active: 0 },
  };

  root.innerHTML = renderWorkspaceMarkup(snapshot, {
    title: config.title,
    apiBaseUrl: config.apiBaseUrl,
    wsUrl: config.wsUrl,
    connectionStatus: state.connectionStatus,
    lastMessage: state.lastMessage,
    error: state.error,
  });

  const refreshButton = root.querySelector<HTMLButtonElement>('[data-action="refresh"]');
  refreshButton?.addEventListener('click', () => {
    void refreshSnapshot();
  });
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

function connectWebSocket(): void {
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

function boot(): void {
  render();
  void refreshSnapshot().finally(() => {
    connectWebSocket();
  });
}

window.addEventListener('DOMContentLoaded', boot);
