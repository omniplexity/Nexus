import { describe, expect, it } from 'vitest';

import { renderWorkspaceMarkup } from './render';

describe('renderWorkspaceMarkup', () => {
  it('renders snapshot and control state', () => {
    const markup = renderWorkspaceMarkup({
      version: '1.0.0',
      generatedAt: '2026-03-24T00:00:00.000Z',
      status: {
        status: 'healthy',
        version: '1.0.0',
        environment: 'test',
        uptime: 12,
        lastUpdated: '2026-03-24T00:00:00.000Z',
      },
      tasks: [],
      graph: { id: 'graph-1', nodes: [], edges: [], activeTaskId: null },
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
    }, {
      title: 'Nexus Workspace',
      apiBaseUrl: 'http://localhost:3000',
      wsUrl: 'ws://localhost:3000/ws',
      connectionStatus: 'connected',
      lastMessage: 'Snapshot hydrated',
    });

    expect(markup).toContain('Nexus Workspace');
    expect(markup).toContain('Snapshot hydrated');
    expect(markup).toContain('graph-1');
  });
});
