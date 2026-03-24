import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import type {
  WorkspaceEvent,
  WorkspaceEventListener,
  WorkspaceGraph,
  WorkspaceGraphEdge,
  WorkspaceGraphNode,
  WorkspaceHub,
  WorkspaceHubOptions,
  WorkspaceLogEntry,
  WorkspaceMetricsSnapshot,
  WorkspaceModelRecord,
  WorkspaceSnapshot,
  WorkspaceStatusSnapshot,
  WorkspaceTaskRecord,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringifyPreview(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.length > 280 ? `${value.slice(0, 277)}...` : value;
  }

  try {
    const json = JSON.stringify(value);
    return json.length > 280 ? `${json.slice(0, 277)}...` : json;
  } catch {
    return String(value);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createDefaultGraph(task?: WorkspaceTaskRecord): WorkspaceGraph {
  if (!task) {
    return {
      id: 'workspace-graph',
      nodes: [],
      edges: [],
      activeTaskId: null,
    };
  }

  return {
    id: task.graph?.id ?? `task-${task.taskId}`,
    nodes: task.graph?.nodes ?? [
      {
        id: task.taskId,
        label: task.type,
        type: task.type,
        status: task.status,
        description: task.inputPreview,
      },
    ],
    edges: task.graph?.edges ?? [],
    activeTaskId: task.taskId,
  };
}

function normalizeGraphNode(nodeId: string, value: unknown, fallbackStatus: string): WorkspaceGraphNode {
  if (!isRecord(value)) {
    return {
      id: nodeId,
      label: nodeId,
      type: 'unknown',
      status: fallbackStatus,
    };
  }

  const metadata = isRecord(value.metadata) ? value.metadata : undefined;

  return {
    id: nodeId,
    label: typeof value.name === 'string' ? value.name : nodeId,
    type: typeof value.type === 'string' ? value.type : 'unknown',
    status: typeof value.status === 'string' ? value.status : fallbackStatus,
    description: typeof metadata?.description === 'string' ? metadata.description : undefined,
  };
}

function normalizeGraphEdge(value: unknown): WorkspaceGraphEdge | null {
  if (!isRecord(value)) {
    return null;
  }

  const sourceId = typeof value.sourceId === 'string' ? value.sourceId : undefined;
  const targetId = typeof value.targetId === 'string' ? value.targetId : undefined;

  if (!sourceId || !targetId) {
    return null;
  }

  return {
    sourceId,
    targetId,
    condition: typeof value.condition === 'string' ? value.condition : undefined,
  };
}

function deriveGraphFromTask(task: WorkspaceTaskRecord): WorkspaceGraph {
  const dag = task.metadata && isRecord(task.metadata.dag) ? task.metadata.dag : null;

  if (!dag) {
    return createDefaultGraph(task);
  }

  const nodes: WorkspaceGraphNode[] = [];
  const edges: WorkspaceGraphEdge[] = [];

  if (Array.isArray(dag.nodes)) {
    for (const node of dag.nodes) {
      if (isRecord(node) && typeof node.id === 'string') {
        nodes.push(normalizeGraphNode(node.id, node, task.status));
      }
    }
  } else if (isRecord(dag.nodes)) {
    for (const [nodeId, node] of Object.entries(dag.nodes)) {
      nodes.push(normalizeGraphNode(nodeId, node, task.status));
    }
  }

  if (Array.isArray(dag.edges)) {
    for (const edge of dag.edges) {
      const normalized = normalizeGraphEdge(edge);
      if (normalized) {
        edges.push(normalized);
      }
    }
  }

  return {
    id: typeof dag.id === 'string' ? dag.id : `task-${task.taskId}`,
    nodes: nodes.length > 0 ? nodes : createDefaultGraph(task).nodes,
    edges,
    activeTaskId: task.taskId,
  };
}

export class DefaultWorkspaceHub implements WorkspaceHub {
  public readonly workspaceId: string;
  private readonly emitter = new EventEmitter();
  private readonly startedAt = Date.now();
  private status: WorkspaceStatusSnapshot;
  private models: WorkspaceModelRecord[];
  private graph: WorkspaceGraph;
  private logs: WorkspaceLogEntry[];
  private tasks = new Map<string, WorkspaceTaskRecord>();
  private activeConnections = 0;
  private lastConnectedAt?: string;
  private lastDisconnectedAt?: string;
  private eventHistory: WorkspaceEvent[] = [];
  private readonly maxLogs: number;
  private readonly maxEvents: number;

  constructor(options: WorkspaceHubOptions = {}) {
    this.workspaceId = options.workspaceId ?? 'nexus-workspace';
    this.maxLogs = 200;
    this.maxEvents = 200;
    this.models = options.models ? clone(options.models) : [];
    this.graph = options.graph ? clone(options.graph) : createDefaultGraph();
    this.logs = options.logs ? clone(options.logs) : [];
    this.status = {
      status: options.status ?? 'healthy',
      version: options.version ?? '0.0.1',
      environment: options.environment ?? 'development',
      uptime: 0,
      lastUpdated: new Date().toISOString(),
    };

    for (const task of options.tasks ?? []) {
      this.tasks.set(task.taskId, clone(task));
    }

    this.activeConnections = options.activeConnections ?? 0;
  }

  subscribe(listener: WorkspaceEventListener): () => void {
    this.emitter.on('workspace', listener);
    return () => this.emitter.off('workspace', listener);
  }

  snapshot(): WorkspaceSnapshot {
    return {
      version: this.status.version,
      generatedAt: new Date().toISOString(),
      status: {
        ...this.status,
        uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      },
      tasks: Array.from(this.tasks.values()).map((task) => clone(task)),
      graph: clone(this.graph),
      logs: this.logs.map((log) => clone(log)),
      models: this.models.map((model) => clone(model)),
      metrics: this.calculateMetrics(),
      connections: {
        active: this.activeConnections,
        lastConnectedAt: this.lastConnectedAt,
        lastDisconnectedAt: this.lastDisconnectedAt,
      },
    };
  }

  getTask(taskId: string): WorkspaceTaskRecord | null {
    return this.tasks.get(taskId) ? clone(this.tasks.get(taskId) as WorkspaceTaskRecord) : null;
  }

  listTasks(): WorkspaceTaskRecord[] {
    return Array.from(this.tasks.values()).map((task) => clone(task));
  }

  upsertTask(task: WorkspaceTaskRecord): WorkspaceTaskRecord {
    const normalized: WorkspaceTaskRecord = {
      ...task,
      inputPreview: task.inputPreview ?? stringifyPreview(task.metadata?.input ?? task.metadata?.prompt ?? task.metadata?.query),
      outputPreview: task.outputPreview ?? stringifyPreview(task.metadata?.output),
      graph: task.graph ?? deriveGraphFromTask(task),
    };

    this.tasks.set(task.taskId, clone(normalized));
    this.graph = normalized.graph ?? createDefaultGraph(normalized);
    this.recordEvent({
      event: 'task:update',
      timestamp: new Date().toISOString(),
      data: normalized,
      source: 'workspace-hub',
    });

    return clone(normalized);
  }

  patchTask(taskId: string, patch: Partial<WorkspaceTaskRecord>): WorkspaceTaskRecord | null {
    const existing = this.tasks.get(taskId);
    if (!existing) {
      return null;
    }

    const merged: WorkspaceTaskRecord = {
      ...existing,
      ...patch,
      metadata: {
        ...(existing.metadata ?? {}),
        ...(patch.metadata ?? {}),
      },
    };

    return this.upsertTask(merged);
  }

  removeTask(taskId: string): boolean {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      this.recordEvent({
        event: 'task:update',
        timestamp: new Date().toISOString(),
        data: { taskId, status: 'cancelled' },
        source: 'workspace-hub',
      });
    }
    return removed;
  }

  appendLog(entry: Omit<WorkspaceLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): WorkspaceLogEntry {
    const normalized: WorkspaceLogEntry = {
      id: entry.id ?? randomUUID(),
      timestamp: entry.timestamp ?? new Date().toISOString(),
      level: entry.level,
      scope: entry.scope,
      message: entry.message,
      details: entry.details,
    };

    this.logs = [...this.logs, normalized].slice(-this.maxLogs);
    this.recordEvent({
      event: 'log:append',
      timestamp: normalized.timestamp,
      data: normalized,
      source: 'workspace-hub',
    });

    return clone(normalized);
  }

  setModels(models: WorkspaceModelRecord[]): WorkspaceModelRecord[] {
    this.models = models.map((model) => clone(model));
    this.recordEvent({
      event: 'workspace:update',
      timestamp: new Date().toISOString(),
      data: { kind: 'models', models: this.models },
      source: 'workspace-hub',
    });
    return this.models.map((model) => clone(model));
  }

  setGraph(graph: WorkspaceGraph): WorkspaceGraph {
    this.graph = clone(graph);
    this.recordEvent({
      event: 'graph:update',
      timestamp: new Date().toISOString(),
      data: this.graph,
      source: 'workspace-hub',
    });
    return clone(this.graph);
  }

  updateStatus(patch: Partial<WorkspaceStatusSnapshot>): WorkspaceStatusSnapshot {
    this.status = {
      ...this.status,
      ...patch,
      lastUpdated: new Date().toISOString(),
    };
    this.recordEvent({
      event: 'status:update',
      timestamp: this.status.lastUpdated,
      data: this.status,
      source: 'workspace-hub',
    });
    return { ...this.status, uptime: Math.floor((Date.now() - this.startedAt) / 1000) };
  }

  setConnectionState(activeConnections: number, timestamps?: { connectedAt?: string; disconnectedAt?: string }): void {
    this.activeConnections = Math.max(0, activeConnections);
    if (timestamps?.connectedAt) {
      this.lastConnectedAt = timestamps.connectedAt;
    }
    if (timestamps?.disconnectedAt) {
      this.lastDisconnectedAt = timestamps.disconnectedAt;
    }
    this.recordEvent({
      event: 'workspace:update',
      timestamp: new Date().toISOString(),
      data: {
        kind: 'connections',
        active: this.activeConnections,
        lastConnectedAt: this.lastConnectedAt,
        lastDisconnectedAt: this.lastDisconnectedAt,
      },
      source: 'workspace-hub',
    });
  }

  recordEvent(event: WorkspaceEvent): void {
    this.eventHistory = [...this.eventHistory, event].slice(-this.maxEvents);
    this.emitter.emit('workspace', event);
  }

  private calculateMetrics(): WorkspaceMetricsSnapshot {
    const tasks = Array.from(this.tasks.values());
    return {
      totalTasks: tasks.length,
      runningTasks: tasks.filter((task) => task.status === 'running').length,
      completedTasks: tasks.filter((task) => task.status === 'completed').length,
      failedTasks: tasks.filter((task) => task.status === 'failed').length,
      totalLogs: this.logs.length,
      activeConnections: this.activeConnections,
    };
  }
}

export function createWorkspaceHub(options?: WorkspaceHubOptions): WorkspaceHub {
  return new DefaultWorkspaceHub(options);
}
