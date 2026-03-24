import { describe, expect, it } from 'vitest';

import { createWorkspaceHub } from './hub';

describe('createWorkspaceHub', () => {
  it('tracks tasks, logs, and metrics in snapshots', () => {
    const hub = createWorkspaceHub({
      version: '1.2.3',
      environment: 'test',
    });

    hub.upsertTask({
      taskId: 'task-1',
      type: 'analysis',
      status: 'running',
      createdAt: '2026-03-24T00:00:00.000Z',
      inputPreview: 'inspect workspace',
    });
    hub.appendLog({
      level: 'info',
      scope: 'test',
      message: 'workspace initialized',
    });

    const snapshot = hub.snapshot();

    expect(snapshot.version).toBe('1.2.3');
    expect(snapshot.status.environment).toBe('test');
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.metrics.totalTasks).toBe(1);
    expect(snapshot.metrics.runningTasks).toBe(1);
    expect(snapshot.logs).toHaveLength(1);
    expect(snapshot.graph.nodes.length).toBeGreaterThan(0);
  });

  it('broadcasts updates to subscribers', () => {
    const hub = createWorkspaceHub();
    const events: string[] = [];

    const unsubscribe = hub.subscribe((event) => {
      events.push(event.event);
    });

    hub.updateStatus({ status: 'degraded' });
    hub.setModels([{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', role: 'fast' }]);
    unsubscribe();

    expect(events).toContain('status:update');
    expect(events).toContain('workspace:update');
  });
});
