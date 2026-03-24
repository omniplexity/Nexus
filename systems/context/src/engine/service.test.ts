import type { ContextRequest } from '../../../../core/contracts/context-engine';
import { CompressionStrategy } from '../../../../core/contracts/context-engine';
import type { Memory, MemoryEntry, MemoryQuery, MemorySnapshot } from '../../../../core/contracts/memory';
import { MemoryType } from '../../../../core/contracts/memory';

import { DefaultContextEngineService } from './service.js';

function createMemoryEntry(id: string, content: string, sessionId: string): MemoryEntry {
  return {
    id,
    type: MemoryType.SESSION,
    content,
    sessionId,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }
  };
}

function createSnapshot(entries: MemoryEntry[]): MemorySnapshot {
  return {
    session: entries.filter(entry => entry.type === MemoryType.SESSION),
    persistent: entries.filter(entry => entry.type === MemoryType.PERSISTENT),
    derived: entries.filter(entry => entry.type === MemoryType.DERIVED),
    totalTokens: entries.reduce((total, entry) => total + Math.ceil(entry.content.length * 0.25), 0)
  };
}

describe('DefaultContextEngineService', () => {
  it('aggregates explicit sessionIds across multiple sessions', async () => {
    const sharedPersistent = {
      id: 'shared-persistent',
      type: MemoryType.PERSISTENT,
      content: 'Shared persistent content',
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: []
      }
    } satisfies MemoryEntry;

    const sessions = new Map<string, MemorySnapshot>([
      ['session-1', createSnapshot([
        createMemoryEntry('s1-entry', 'First session content', 'session-1'),
        sharedPersistent
      ])],
      ['session-2', createSnapshot([
        createMemoryEntry('s2-entry', 'Second session content', 'session-2'),
        sharedPersistent
      ])]
    ]);

    const memory: Memory = {
      retrieve: vi.fn().mockImplementation(async (query: MemoryQuery) => {
        const sessionIds = query.sessionIds ?? (query.sessionId ? [query.sessionId] : []);
        const entries = sessionIds.flatMap(sessionId => {
          const snapshot = sessions.get(sessionId);
          return snapshot ? [...snapshot.session, ...snapshot.persistent, ...snapshot.derived] : [];
        });

        return {
          entries,
          total: entries.length,
          query
        };
      }),
      store: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      getSnapshot: vi.fn().mockImplementation(async (sessionId: string) => {
        return sessions.get(sessionId) ?? createSnapshot([]);
      }),
      archive: vi.fn(),
      getStats: vi.fn().mockResolvedValue({
        totalEntries: 2,
        byType: {
          [MemoryType.EPHEMERAL]: 0,
          [MemoryType.SESSION]: 2,
          [MemoryType.PERSISTENT]: 0,
          [MemoryType.DERIVED]: 0
        },
        totalTokens: 10,
        averageEntrySize: 10,
        sessionsActive: 2
      })
    };

    const service = new DefaultContextEngineService(memory, undefined, {
      enableMultiSession: true
    });

    const request: ContextRequest = {
      sessionId: 'session-1',
      userId: 'user-1',
      sessionIds: ['session-1', 'session-2']
    };

    const slice = await service.prepareContext(request);

    expect(slice.memoryIds).toContain('session:s1-entry');
    expect(slice.memoryIds).toContain('session:s2-entry');
    expect(slice.memoryIds.filter(id => id === 'persistent:shared-persistent')).toHaveLength(1);
  });

  it('rebuilds router config after updateConfig', async () => {
    let capturedMaxTokens = 0;

    const memory: Memory = {
      retrieve: vi.fn().mockResolvedValue({ entries: [], total: 0, query: {} }),
      store: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      getSnapshot: vi.fn().mockImplementation(async (_sessionId: string, maxTokens: number) => {
        capturedMaxTokens = maxTokens;
        return createSnapshot([]);
      }),
      archive: vi.fn(),
      getStats: vi.fn().mockResolvedValue({
        totalEntries: 0,
        byType: {
          [MemoryType.EPHEMERAL]: 0,
          [MemoryType.SESSION]: 0,
          [MemoryType.PERSISTENT]: 0,
          [MemoryType.DERIVED]: 0
        },
        totalTokens: 0,
        averageEntrySize: 0,
        sessionsActive: 0
      })
    };

    const service = new DefaultContextEngineService(memory);
    service.updateConfig({
      simpleTokenBudget: 1234,
      compressionStrategy: CompressionStrategy.SUMMARIZE
    });

    await service.prepareContext({
      sessionId: 'session-1'
    });

    expect(capturedMaxTokens).toBe(1234);
  });
});
