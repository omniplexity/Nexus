import type {
  WorkspaceClientMessage,
  WorkspaceGraph,
  WorkspaceGraphEdge,
  WorkspaceGraphNode,
  WorkspaceLogEntry,
  WorkspaceMessageType,
  WorkspaceMetricsSnapshot,
  WorkspaceModelRecord,
  WorkspaceServerMessage,
  WorkspaceSnapshot,
  WorkspaceStatusSnapshot,
  WorkspaceTaskRecord,
  WorkspaceWebSocketConfig,
  WebSocketClient,
  WebSocketConfig,
  WebSocketMessage,
  WebSocketServer,
  WebSocketServerMessage,
  WebSocketServerEventHandler,
  WebSocketEvent,
} from '@nexus/interfaces/contracts/websocket';

export type {
  WorkspaceClientMessage,
  WorkspaceGraph,
  WorkspaceGraphEdge,
  WorkspaceGraphNode,
  WorkspaceLogEntry,
  WorkspaceMessageType,
  WorkspaceMetricsSnapshot,
  WorkspaceModelRecord,
  WorkspaceServerMessage,
  WorkspaceSnapshot,
  WorkspaceStatusSnapshot,
  WorkspaceTaskRecord,
  WorkspaceWebSocketConfig,
  WebSocketClient,
  WebSocketConfig,
  WebSocketMessage,
  WebSocketServer,
  WebSocketServerMessage,
  WebSocketServerEventHandler,
  WebSocketEvent,
};

export type WorkspaceEventListener = (event: WorkspaceEvent) => void;

export interface WorkspaceEvent {
  event: WorkspaceMessageType;
  timestamp: string;
  data?: unknown;
  requestId?: string;
  source?: string;
}

export interface WorkspaceHubOptions {
  workspaceId?: string;
  version?: string;
  environment?: string;
  status?: WorkspaceStatusSnapshot['status'];
  models?: WorkspaceModelRecord[];
  graph?: WorkspaceGraph;
  logs?: WorkspaceLogEntry[];
  tasks?: WorkspaceTaskRecord[];
  activeConnections?: number;
}

export interface WorkspaceHub {
  readonly workspaceId: string;
  subscribe(listener: WorkspaceEventListener): () => void;
  snapshot(): WorkspaceSnapshot;
  getTask(taskId: string): WorkspaceTaskRecord | null;
  listTasks(): WorkspaceTaskRecord[];
  upsertTask(task: WorkspaceTaskRecord): WorkspaceTaskRecord;
  patchTask(taskId: string, patch: Partial<WorkspaceTaskRecord>): WorkspaceTaskRecord | null;
  removeTask(taskId: string): boolean;
  appendLog(entry: Omit<WorkspaceLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): WorkspaceLogEntry;
  setModels(models: WorkspaceModelRecord[]): WorkspaceModelRecord[];
  setGraph(graph: WorkspaceGraph): WorkspaceGraph;
  updateStatus(patch: Partial<WorkspaceStatusSnapshot>): WorkspaceStatusSnapshot;
  setConnectionState(activeConnections: number, timestamps?: { connectedAt?: string; disconnectedAt?: string }): void;
  recordEvent(event: WorkspaceEvent): void;
}

export interface WorkspaceWebSocketServerConfig {
  port: number;
  path?: string;
  server?: import('node:http').Server;
  hub: WorkspaceHub;
  autoSnapshotOnConnect?: boolean;
}

export interface WorkspaceBootstrapPayload {
  snapshot: WorkspaceSnapshot;
  wsUrl: string;
  apiUrl: string;
}

export interface WorkspaceCommandResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}
