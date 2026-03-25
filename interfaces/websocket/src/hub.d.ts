import type { WorkspaceEvent, WorkspaceEventListener, WorkspaceGraph, WorkspaceHub, WorkspaceHubOptions, WorkspaceLogEntry, WorkspaceModelRecord, WorkspaceSnapshot, WorkspaceStatusSnapshot, WorkspaceTaskRecord } from './types';
export declare class DefaultWorkspaceHub implements WorkspaceHub {
    readonly workspaceId: string;
    private readonly emitter;
    private readonly startedAt;
    private status;
    private models;
    private graph;
    private logs;
    private tasks;
    private activeConnections;
    private lastConnectedAt?;
    private lastDisconnectedAt?;
    private eventHistory;
    private readonly maxLogs;
    private readonly maxEvents;
    constructor(options?: WorkspaceHubOptions);
    subscribe(listener: WorkspaceEventListener): () => void;
    snapshot(): WorkspaceSnapshot;
    getTask(taskId: string): WorkspaceTaskRecord | null;
    listTasks(): WorkspaceTaskRecord[];
    upsertTask(task: WorkspaceTaskRecord): WorkspaceTaskRecord;
    patchTask(taskId: string, patch: Partial<WorkspaceTaskRecord>): WorkspaceTaskRecord | null;
    removeTask(taskId: string): boolean;
    appendLog(entry: Omit<WorkspaceLogEntry, 'id' | 'timestamp'> & {
        id?: string;
        timestamp?: string;
    }): WorkspaceLogEntry;
    setModels(models: WorkspaceModelRecord[]): WorkspaceModelRecord[];
    setGraph(graph: WorkspaceGraph): WorkspaceGraph;
    updateStatus(patch: Partial<WorkspaceStatusSnapshot>): WorkspaceStatusSnapshot;
    setConnectionState(activeConnections: number, timestamps?: {
        connectedAt?: string;
        disconnectedAt?: string;
    }): void;
    recordEvent(event: WorkspaceEvent): void;
    private calculateMetrics;
}
export declare function createWorkspaceHub(options?: WorkspaceHubOptions): WorkspaceHub;
//# sourceMappingURL=hub.d.ts.map