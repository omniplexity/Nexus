/**
 * WebSocket Interface Contracts for Nexus
 * 
 * Defines the WebSocket interface contracts.
 */

/**
 * WebSocket message type
 */
export type WebSocketMessageType = 'text' | 'binary' | 'ping' | 'pong' | 'close';

/**
 * Workspace control surface message type
 */
export type WorkspaceMessageType =
  | 'workspace:subscribe'
  | 'workspace:request-snapshot'
  | 'workspace:snapshot'
  | 'workspace:update'
  | 'workspace:ping'
  | 'workspace:pong'
  | 'workspace:error'
  | 'workspace:connected'
  | 'task:create'
  | 'task:update'
  | 'task:cancel'
  | 'task:status'
  | 'log:append'
  | 'status:update'
  | 'graph:update';

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: Date;
}

/**
 * Workspace graph node
 */
export interface WorkspaceGraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
  description?: string;
}

/**
 * Workspace graph edge
 */
export interface WorkspaceGraphEdge {
  sourceId: string;
  targetId: string;
  condition?: string;
}

/**
 * Workspace execution graph
 */
export interface WorkspaceGraph {
  id: string;
  nodes: WorkspaceGraphNode[];
  edges: WorkspaceGraphEdge[];
  activeTaskId?: string | null;
}

/**
 * Workspace task record
 */
export interface WorkspaceTaskRecord {
  taskId: string;
  type: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  inputPreview?: string;
  outputPreview?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  graph?: WorkspaceGraph;
}

/**
 * Workspace log entry
 */
export interface WorkspaceLogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  scope: string;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Workspace status snapshot
 */
export interface WorkspaceStatusSnapshot {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  uptime: number;
  lastUpdated: string;
}

/**
 * Workspace model record
 */
export interface WorkspaceModelRecord {
  id: string;
  name: string;
  role: string;
  contextWindow?: number;
  maxOutputTokens?: number;
}

/**
 * Workspace metrics snapshot
 */
export interface WorkspaceMetricsSnapshot {
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalLogs: number;
  activeConnections: number;
}

/**
 * Workspace snapshot
 */
export interface WorkspaceSnapshot {
  version: string;
  generatedAt: string;
  status: WorkspaceStatusSnapshot;
  tasks: WorkspaceTaskRecord[];
  graph: WorkspaceGraph;
  logs: WorkspaceLogEntry[];
  models: WorkspaceModelRecord[];
  metrics: WorkspaceMetricsSnapshot;
  connections: {
    active: number;
    lastConnectedAt?: string;
    lastDisconnectedAt?: string;
  };
}

/**
 * WebSocket event
 */
export type WebSocketEvent = 
  | 'connection'
  | 'disconnect'
  | 'message'
  | 'error'
  | 'open'
  | 'close';

/**
 * WebSocket client message
 */
export interface WebSocketClientMessage {
  event: string;
  data?: unknown;
}

/**
 * WebSocket server message
 */
export interface WebSocketServerMessage {
  event: string;
  data?: unknown;
  error?: string;
}

/**
 * Workspace client message
 */
export interface WorkspaceClientMessage {
  event: WorkspaceMessageType;
  data?: unknown;
  requestId?: string;
}

/**
 * Workspace server message
 */
export interface WorkspaceServerMessage {
  event: WorkspaceMessageType;
  data?: unknown;
  error?: string;
  requestId?: string;
}

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed'
}

/**
 * WebSocket client interface
 */
export interface WebSocketClient {
  /** Unique client identifier */
  id: string;
  
  /** Current connection state */
  state: WebSocketState;
  
  /**
   * Connect to WebSocket server
   */
  connect(url: string): Promise<void>;
  
  /**
   * Disconnect from server
   */
  disconnect(): Promise<void>;
  
  /**
   * Send a message
   */
  send(event: string, data?: unknown): void;
  
  /**
   * Subscribe to an event
   */
  on(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  /**
   * Unsubscribe from an event
   */
  off(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  /**
   * Check if connected
   */
  isConnected(): boolean;
}

/**
 * WebSocket event handler
 */
export type WebSocketEventHandler = (data?: unknown) => void;

/**
 * WebSocket server interface
 */
export interface WebSocketServer {
  /** Server port */
  port: number;
  
  /**
   * Start the server
   */
  start(): Promise<void>;
  
  /**
   * Stop the server
   */
  stop(): Promise<void>;
  
  /**
   * Broadcast to all clients
   */
  broadcast(event: string, data?: unknown): void;
  
  /**
   * Send to specific client
   */
  send(clientId: string, event: string, data?: unknown): void;
  
  /**
   * Register event handler
   */
  on(event: WebSocketEvent, handler: WebSocketServerEventHandler): void;
  
  /**
   * Get connected clients
   */
  getClients(): string[];
  
  /**
   * Check if server is running
   */
  isRunning(): boolean;
}

/**
 * WebSocket server event handler
 */
export type WebSocketServerEventHandler = (
  clientId: string,
  data?: unknown
) => void;

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  port: number;
  path?: string;
  pingInterval?: number;
  pingTimeout?: number;
  maxPayload?: number;
}

/**
 * Workspace control surface configuration
 */
export interface WorkspaceWebSocketConfig extends WebSocketConfig {
  workspaceId?: string;
  autoSnapshotOnConnect?: boolean;
}
