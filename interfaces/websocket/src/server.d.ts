import type { WebSocketEvent, WebSocketServerEventHandler, WorkspaceWebSocketServerConfig, WebSocketServer } from './types';
export declare class WorkspaceWebSocketServerImpl implements WebSocketServer {
    readonly port: number;
    private readonly path;
    private readonly hub;
    private readonly autoSnapshotOnConnect;
    private readonly emitter;
    private readonly externalServer?;
    private httpServer;
    private connections;
    private hubUnsubscribe;
    private running;
    constructor(config: WorkspaceWebSocketServerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    broadcast(event: string, data?: unknown, error?: string, requestId?: string): void;
    send(clientId: string, event: string, data?: unknown, error?: string, requestId?: string): void;
    on(event: WebSocketEvent, handler: WebSocketServerEventHandler): void;
    getClients(): string[];
    isRunning(): boolean;
    private handleClientMessage;
    private sendToRecord;
}
export declare function createWorkspaceWebSocketServer(config: WorkspaceWebSocketServerConfig): WebSocketServer;
//# sourceMappingURL=server.d.ts.map