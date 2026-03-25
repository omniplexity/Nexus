export type WebSocketMessageType = 'text' | 'binary' | 'ping' | 'pong' | 'close';
export type WorkspaceMessageType = 'workspace:subscribe' | 'workspace:request-snapshot' | 'workspace:snapshot' | 'workspace:update' | 'workspace:ping' | 'workspace:pong' | 'workspace:error' | 'workspace:connected' | 'task:create' | 'task:update' | 'task:cancel' | 'task:status' | 'log:append' | 'status:update' | 'graph:update';
export interface WebSocketMessage {
    type: WebSocketMessageType;
    payload: unknown;
    timestamp: Date;
}
export interface WorkspaceGraphNode {
    id: string;
    label: string;
    type: string;
    status: string;
    description?: string;
}
export interface WorkspaceGraphEdge {
    sourceId: string;
    targetId: string;
    condition?: string;
}
export interface WorkspaceGraph {
    id: string;
    nodes: WorkspaceGraphNode[];
    edges: WorkspaceGraphEdge[];
    activeTaskId?: string | null;
}
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
export interface WorkspaceLogEntry {
    id: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    scope: string;
    message: string;
    timestamp: string;
    details?: Record<string, unknown>;
}
export interface WorkspaceStatusSnapshot {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    environment: string;
    uptime: number;
    lastUpdated: string;
}
export interface WorkspaceModelRecord {
    id: string;
    name: string;
    role: string;
    contextWindow?: number;
    maxOutputTokens?: number;
}
export interface WorkspaceMetricsSnapshot {
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalLogs: number;
    activeConnections: number;
}
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
export type WebSocketEvent = 'connection' | 'disconnect' | 'message' | 'error' | 'open' | 'close';
export interface WebSocketClientMessage {
    event: string;
    data?: unknown;
}
export interface WebSocketServerMessage {
    event: string;
    data?: unknown;
    error?: string;
}
export interface WorkspaceClientMessage {
    event: WorkspaceMessageType;
    data?: unknown;
    requestId?: string;
}
export interface WorkspaceServerMessage {
    event: WorkspaceMessageType;
    data?: unknown;
    error?: string;
    requestId?: string;
}
export declare enum WebSocketState {
    CONNECTING = "connecting",
    OPEN = "open",
    CLOSING = "closing",
    CLOSED = "closed"
}
export interface WebSocketClient {
    id: string;
    state: WebSocketState;
    connect(url: string): Promise<void>;
    disconnect(): Promise<void>;
    send(event: string, data?: unknown): void;
    on(event: WebSocketEvent, handler: WebSocketEventHandler): void;
    off(event: WebSocketEvent, handler: WebSocketEventHandler): void;
    isConnected(): boolean;
}
export type WebSocketEventHandler = (data?: unknown) => void;
export interface WebSocketServer {
    port: number;
    start(): Promise<void>;
    stop(): Promise<void>;
    broadcast(event: string, data?: unknown): void;
    send(clientId: string, event: string, data?: unknown): void;
    on(event: WebSocketEvent, handler: WebSocketServerEventHandler): void;
    getClients(): string[];
    isRunning(): boolean;
}
export type WebSocketServerEventHandler = (clientId: string, data?: unknown) => void;
export interface WebSocketConfig {
    port: number;
    path?: string;
    pingInterval?: number;
    pingTimeout?: number;
    maxPayload?: number;
}
export interface WorkspaceWebSocketConfig extends WebSocketConfig {
    workspaceId?: string;
    autoSnapshotOnConnect?: boolean;
}
//# sourceMappingURL=websocket.d.ts.map