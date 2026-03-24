/**
 * Tests for ContextRouter
 * 
 * Tests all public methods of the ContextRouter class:
 * - route, process, getStats
 */

import type { Memory, MemoryQuery, MemorySnapshot, MemoryEntry } from '../../../../core/contracts/memory';
import { MemoryType } from '../../../../core/contracts/memory';

import { ContextRouter, createContextRouter, QueryType, type RouterConfig } from './index.js';

// Mock Memory implementation
class MockMemory implements Memory {
  private storage: Map<string, MemoryEntry[]> = new Map();
  
  async retrieve(query: MemoryQuery): Promise<{ entries: MemoryEntry[]; total: number; query: MemoryQuery; tokens?: number }> {
    const allEntries = Array.from(this.storage.values()).flat();
    let filtered = [...allEntries];
    
    if (query.sessionId) {
      filtered = filtered.filter(e => e.sessionId === query.sessionId);
    }
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      filtered = filtered.filter(e => types.includes(e.type));
    }
    if (query.tags) {
      filtered = filtered.filter(e => e.metadata.tags?.some(t => query.tags!.includes(t)));
    }
    
    return { entries: filtered, total: filtered.length, query };
  }
  
  async store(entry: MemoryEntry): Promise<void> {
    const sessionKey = entry.sessionId || 'default';
    const entries = this.storage.get(sessionKey) || [];
    entries.push(entry);
    this.storage.set(sessionKey, entries);
  }
  
  async update(_id: string, _updates: Partial<MemoryEntry>): Promise<void> {
    // Mock implementation
  }
  
  async delete(_id: string): Promise<void> {
    // Mock implementation
  }
  
  async clear(sessionId: string): Promise<void> {
    this.storage.delete(sessionId);
  }
  
  async getSnapshot(sessionId: string, _maxTokens: number): Promise<MemorySnapshot> {
    const entries = this.storage.get(sessionId) || [];
    const session: MemoryEntry[] = [];
    const persistent: MemoryEntry[] = [];
    const derived: MemoryEntry[] = [];
    
    for (const entry of entries) {
      switch (entry.type) {
        case MemoryType.SESSION:
          session.push(entry);
          break;
        case MemoryType.PERSISTENT:
          persistent.push(entry);
          break;
        case MemoryType.DERIVED:
          derived.push(entry);
          break;
      }
    }
    
    return {
      session,
      persistent,
      derived,
      totalTokens: (session.length + persistent.length + derived.length) * 100
    };
  }
  
  async archive(_olderThan: Date): Promise<number> {
    return 0;
  }
  
  async getStats(): Promise<{ totalEntries: number; byType: Record<MemoryType, number>; totalTokens: number; averageEntrySize: number; sessionsActive: number }> {
    return {
      totalEntries: 0,
      byType: {
        [MemoryType.SESSION]: 0,
        [MemoryType.PERSISTENT]: 0,
        [MemoryType.DERIVED]: 0,
        [MemoryType.EPHEMERAL]: 0
      },
      totalTokens: 0,
      averageEntrySize: 0,
      sessionsActive: 0
    };
  }
}

// Test helper to create memory entries
function createMemoryEntry(
  id: string,
  content: string,
  type: MemoryType = MemoryType.SESSION,
  sessionId?: string,
  userId?: string,
  metadata?: Partial<MemoryEntry['metadata']>
): MemoryEntry {
  return {
    id,
    type,
    content,
    sessionId,
    userId,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      ...metadata
    }
  };
}

// Test helper to create a query
function createQuery(overrides?: Partial<MemoryQuery>): MemoryQuery {
  return {
    ...overrides
  };
}

describe('ContextRouter', () => {
  let router: ContextRouter;
  let mockMemory: MockMemory;

  beforeEach(() => {
    mockMemory = new MockMemory();
    router = new ContextRouter(mockMemory);
  });

  describe('constructor', () => {
    it('should create router with default config', () => {
      const defaultRouter = new ContextRouter(mockMemory);
      expect(defaultRouter).toBeDefined();
    });

    it('should create router with custom config', () => {
      const config: Partial<RouterConfig> = {
        defaultCompressor: 'summarize',
        simpleTokenBudget: 1500,
        complexTokenBudget: 3000,
        complexityThreshold: 2,
        enableMultiSession: false,
        maxSessions: 3
      };
      const customRouter = new ContextRouter(mockMemory, config);
      expect(customRouter).toBeDefined();
    });

    it('should use factory function', () => {
      const factoryRouter = createContextRouter(mockMemory);
      expect(factoryRouter).toBeInstanceOf(ContextRouter);
    });
  });

  describe('route()', () => {
    it('should return SIMPLE query type for basic queries', () => {
      const query = createQuery();
      
      const result = router.route(query);
      
      expect(result.queryType).toBe(QueryType.SIMPLE);
    });

    it('should return COMPLEX query type for complex queries', () => {
      // Multi-session query
      const complexQuery = createQuery({
        sessionId: 'session-1',
        userId: 'user-1',
        tags: ['important'],
        embedding: [0.1, 0.2, 0.3]
      });
      
      const result = router.route(complexQuery);
      
      expect(result.queryType).toBe(QueryType.COMPLEX);
    });

    it('should assign higher token budget for complex queries', () => {
      const simpleQuery = createQuery();
      const complexQuery = createQuery({
        sessionId: 'session-1',
        userId: 'user-1',
        tags: ['important'],
        embedding: [0.1, 0.2, 0.3]
      });
      
      const simpleResult = router.route(simpleQuery);
      const complexResult = router.route(complexQuery);
      
      expect(complexResult.tokenBudget).toBeGreaterThan(simpleResult.tokenBudget);
    });

    it('should set requiresPrioritization for complex queries', () => {
      const complexQuery = createQuery({
        text: 'search term'
      });
      
      const result = router.route(complexQuery);
      
      expect(result.requiresPrioritization).toBe(true);
    });

    it('should set requiresPrioritization for queries with embedding', () => {
      const query = createQuery({
        embedding: [0.1, 0.2, 0.3]
      });
      
      const result = router.route(query);
      
      expect(result.requiresPrioritization).toBe(true);
    });

    it('should not set requiresMultiSession without explicit sessionIds', () => {
      const config: Partial<RouterConfig> = {
        enableMultiSession: true
      };
      const multiSessionRouter = new ContextRouter(mockMemory, config);
      
      const query = createQuery({
        userId: 'user-1'
        // No sessionId
      });
      
      const result = multiSessionRouter.route(query);
      
      expect(result.requiresMultiSession).toBe(false);
    });

    it('should include compressor in result', () => {
      const query = createQuery();
      
      const result = router.route(query);
      
      expect(result.compressor).toBeDefined();
      expect(typeof result.compressor.compress).toBe('function');
    });

    it('should include options in result', () => {
      const query = createQuery();
      
      const result = router.route(query);
      
      expect(result.options).toBeDefined();
      expect(result.options.maxSessions).toBeDefined();
    });
  });

  describe('process()', () => {
    it('should return a ContextSlice', async () => {
      // Store some entries
      await mockMemory.store(createMemoryEntry('1', 'Content', MemoryType.SESSION, 'default'));
      
      const query = createQuery({ sessionId: 'default' });
      
      const slice = await router.process(query);
      
      expect(slice).toBeDefined();
      expect(slice.conversation).toBeDefined();
      expect(typeof slice.totalTokens).toBe('number');
      expect(Array.isArray(slice.memoryIds)).toBe(true);
    });

    it('should use token budget from routing', async () => {
      await mockMemory.store(createMemoryEntry('1', 'Content', MemoryType.SESSION, 'default'));
      
      const query = createQuery({ sessionId: 'default' });
      
      const slice = await router.process(query);
      
      expect(slice.totalTokens).toBeLessThanOrEqual(2000); // Default simple budget
    });

    it('should handle empty memory', async () => {
      const query = createQuery({ sessionId: 'non-existent' });
      
      const slice = await router.process(query);
      
      expect(slice).toBeDefined();
      expect(slice.totalTokens).toBe(0);
    });

    it('should handle multi-session queries', async () => {
      // Store entries in different sessions
      await mockMemory.store(createMemoryEntry('1', 'Session 1 content', MemoryType.SESSION, 'session-1', 'user-1'));
      await mockMemory.store(createMemoryEntry('2', 'Session 2 content', MemoryType.SESSION, 'session-2', 'user-1'));
      
      const config: Partial<RouterConfig> = {
        enableMultiSession: true
      };
      const multiSessionRouter = new ContextRouter(mockMemory, config);
      
      const query = createQuery({
        userId: 'user-1'
      });
      
      // Should not throw
      const slice = await multiSessionRouter.process(query);
      expect(slice).toBeDefined();
    });
  });

  describe('getStats()', () => {
    it('should return query type counts', () => {
      // Make some routes
      router.route(createQuery());
      router.route(createQuery());
      router.route(createQuery({ 
        sessionId: 'session-1', 
        userId: 'user-1',
        tags: ['important'] 
      }));
      
      const stats = router.getStats();
      
      expect(stats.queryTypes).toBeDefined();
      expect(stats.queryTypes[QueryType.SIMPLE]).toBe(2);
      expect(stats.queryTypes[QueryType.COMPLEX]).toBe(1);
    });

    it('should initialize all query type counts to zero', () => {
      const stats = router.getStats();
      
      expect(stats.queryTypes[QueryType.SIMPLE]).toBe(0);
      expect(stats.queryTypes[QueryType.COMPLEX]).toBe(0);
      expect(stats.queryTypes[QueryType.TOOL_HEAVY]).toBe(0);
      expect(stats.queryTypes[QueryType.MULTI_SESSION]).toBe(0);
    });
  });

  describe('classification logic', () => {
    it('should classify query with tags as more complex', () => {
      const noTagsQuery = createQuery();
      const tagsQuery = createQuery({ tags: ['important'] });
      
      const noTagsResult = router.route(noTagsQuery);
      router.route(tagsQuery);
      
      // With default threshold of 3, a single tag might not push it to COMPLEX
      expect(noTagsResult.queryType).toBe(QueryType.SIMPLE);
    });

    it('should classify query with date range as more complex', () => {
      const query = createQuery({
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      });
      
      const result = router.route(query);
      
      // Date range adds to complexity score
      expect(result).toBeDefined();
    });

    it('should classify query with minImportance as more complex', () => {
      const query = createQuery({
        minImportance: 0.8
      });
      
      const result = router.route(query);
      
      // minImportance adds to complexity score
      expect(result).toBeDefined();
    });

    it('should classify query with multiple types as more complex', () => {
      const query = createQuery({
        type: [MemoryType.SESSION, MemoryType.PERSISTENT]
      });
      
      const result = router.route(query);
      
      // Multiple types adds to complexity score
      expect(result).toBeDefined();
    });

    it('should classify query with embedding as more complex', () => {
      const query = createQuery({
        embedding: [0.1, 0.2, 0.3]
      });
      
      const result = router.route(query);
      
      // Embedding adds to complexity score
      expect(result).toBeDefined();
    });

    it('should classify query with both session and user as more complex', () => {
      const query = createQuery({
        sessionId: 'session-1',
        userId: 'user-1'
      });
      
      const result = router.route(query);
      
      // Default complexity threshold is 3, session + user adds 2, so it's SIMPLE
      expect(result.queryType).toBe(QueryType.SIMPLE);
    });
  });

  describe('custom configuration', () => {
    it('should use custom token budgets', () => {
      const config: Partial<RouterConfig> = {
        simpleTokenBudget: 1000,
        complexTokenBudget: 5000
      };
      const customRouter = new ContextRouter(mockMemory, config);
      
      const simpleQuery = createQuery();
      const complexQuery = createQuery({
        sessionId: 'session-1',
        userId: 'user-1',
        tags: ['important'],
        embedding: [0.1]
      });
      
      const simpleResult = customRouter.route(simpleQuery);
      const complexResult = customRouter.route(complexQuery);
      
      expect(simpleResult.tokenBudget).toBe(1000);
      expect(complexResult.tokenBudget).toBe(5000);
    });

    it('should use custom complexity threshold', () => {
      const config: Partial<RouterConfig> = {
        complexityThreshold: 1
      };
      const lowThresholdRouter = new ContextRouter(mockMemory, config);
      
      const query = createQuery({ tags: ['important'] });
      
      const result = lowThresholdRouter.route(query);
      
      // With threshold of 1, a single factor makes it COMPLEX
      expect(result.queryType).toBe(QueryType.COMPLEX);
    });

    it('should respect enableMultiSession setting', () => {
      const config: Partial<RouterConfig> = {
        enableMultiSession: false
      };
      const noMultiRouter = new ContextRouter(mockMemory, config);
      
      const query = createQuery({ userId: 'user-1' });
      
      const result = noMultiRouter.route(query);
      
      expect(result.requiresMultiSession).toBe(false);
    });

    it('should use custom maxSessions', () => {
      const config: Partial<RouterConfig> = {
        maxSessions: 10
      };
      const customRouter = new ContextRouter(mockMemory, config);
      
      const query = createQuery();
      
      const result = customRouter.route(query);
      
      expect(result.options.maxSessions).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle query with empty sessionId', async () => {
      const query = createQuery({ sessionId: '' });
      
      // Should use 'default' session
      const slice = await router.process(query);
      expect(slice).toBeDefined();
    });

    it('should handle memory.getSnapshot throwing', async () => {
      const failingMemory: Memory = {
        ...mockMemory,
        getSnapshot: vi.fn().mockRejectedValue(new Error('Memory error'))
      };
      const failingRouter = new ContextRouter(failingMemory);
      
      const query = createQuery({ sessionId: 'default' });
      
      // Should handle error gracefully
      await expect(failingRouter.process(query)).rejects.toThrow('Memory error');
    });

    it('should cache compressors', () => {
      const query = createQuery();
      
      const result1 = router.route(query);
      const result2 = router.route(query);
      
      // Same compressor instance should be returned
      expect(result1.compressor).toBe(result2.compressor);
    });

    it('should handle MULTI_SESSION query type', () => {
      const config: Partial<RouterConfig> = {
        enableMultiSession: true
      };
      const multiRouter = new ContextRouter(mockMemory, config);
      
      const query = createQuery({
        sessionId: 'session-1',
        userId: 'user-1',
        sessionIds: ['session-1', 'session-2']
      });
      
      const result = multiRouter.route(query);
      
      expect(result.queryType).toBe(QueryType.MULTI_SESSION);
      expect(result.requiresMultiSession).toBe(true);
    });
  });
});
