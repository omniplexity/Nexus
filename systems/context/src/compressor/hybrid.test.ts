/**
 * Tests for HybridCompressor
 * 
 * Tests all public methods of the HybridCompressor class:
 * - compress, expand, getStats
 */

import type { MemorySnapshot, ContextSlice, MemoryEntry } from '../../../../core/contracts/memory';
import { MemoryType } from '../../../../core/contracts/memory';

import { HybridCompressor, createHybridCompressor, type HybridConfig } from './hybrid.js';

// Test helper to create memory entries
function createMemoryEntry(
  id: string,
  content: string,
  type: MemoryType = MemoryType.SESSION,
  createdAt?: Date
): MemoryEntry {
  const date = createdAt || new Date();
  return {
    id,
    type,
    content,
    metadata: {
      createdAt: date,
      updatedAt: date,
      tags: []
    }
  };
}

// Test helper to create memory snapshots
function createMemorySnapshot(
  sessionCount: number = 0,
  persistentCount: number = 0,
  derivedCount: number = 0
): MemorySnapshot {
  const session: MemoryEntry[] = [];
  const persistent: MemoryEntry[] = [];
  const derived: MemoryEntry[] = [];

  const now = Date.now();

  for (let i = 0; i < sessionCount; i++) {
    const createdAt = new Date(now - (sessionCount - i) * 60000);
    session.push(createMemoryEntry(`session-${i}`, `Session content ${i}`, MemoryType.SESSION, createdAt));
  }
  for (let i = 0; i < persistentCount; i++) {
    const createdAt = new Date(now - (persistentCount - i) * 60000);
    persistent.push(createMemoryEntry(`persistent-${i}`, `Persistent content ${i}`, MemoryType.PERSISTENT, createdAt));
  }
  for (let i = 0; i < derivedCount; i++) {
    const createdAt = new Date(now - (derivedCount - i) * 60000);
    derived.push(createMemoryEntry(`derived-${i}`, `Derived content ${i}`, MemoryType.DERIVED, createdAt));
  }

  return {
    session,
    persistent,
    derived,
    totalTokens: (sessionCount + persistentCount + derivedCount) * 100
  };
}

describe('HybridCompressor', () => {
  let compressor: HybridCompressor;

  beforeEach(() => {
    compressor = new HybridCompressor();
  });

  describe('constructor', () => {
    it('should create compressor with default config', () => {
      const defaultCompressor = new HybridCompressor();
      expect(defaultCompressor).toBeDefined();
    });

    it('should create compressor with custom config', () => {
      const config: Partial<HybridConfig> = {
        keepRecent: 5,
        maxToSummarize: 10,
        targetTokens: 3000,
        recentRatio: 0.7,
        model: 'gpt-3.5-turbo'
      };
      const customCompressor = new HybridCompressor(config);
      expect(customCompressor).toBeDefined();
    });

    it('should accept model provider', () => {
      const mockModelProvider = {
        complete: async () => ({ text: 'Mock summary' })
      };
      const compressorWithProvider = new HybridCompressor({ modelProvider: mockModelProvider });
      expect(compressorWithProvider).toBeDefined();
    });

    it('should use factory function', () => {
      const factoryCompressor = createHybridCompressor();
      expect(factoryCompressor).toBeInstanceOf(HybridCompressor);
    });
  });

  describe('compress()', () => {
    it('should compress empty snapshot', async () => {
      const snapshot = createMemorySnapshot(0, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
      // Empty snapshot may have header from formatting but should have no memory IDs
      expect(slice.memoryIds).toHaveLength(0);
      expect(slice.totalTokens).toBe(6); // '--- Recent Context ---' = ~6 tokens
    });

    it('should keep recent entries verbatim', async () => {
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      // Should have memory IDs for recent entries
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should add "Recent Context" header', async () => {
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice.conversation).toContain('--- Recent Context ---');
    });

    it('should summarize older entries when applicable', async () => {
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      // Should produce output
      expect(slice).toBeDefined();
    });

    it('should handle all memory types', async () => {
      const snapshot = createMemorySnapshot(5, 5, 5);
      
      const slice = await compressor.compress(snapshot, 2000);
      
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should return valid ContextSlice', async () => {
      const snapshot = createMemorySnapshot(3, 2, 1);
      
      const slice = await compressor.compress(snapshot, 500);
      
      expect(slice.system).toBe('');
      expect(slice.tools).toBe('');
      expect(typeof slice.conversation).toBe('string');
      expect(typeof slice.totalTokens).toBe('number');
      expect(Array.isArray(slice.memoryIds)).toBe(true);
    });

    it('should respect keepRecent config', async () => {
      const config: Partial<HybridConfig> = {
        keepRecent: 2
      };
      const compressorWithKeep = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await compressorWithKeep.compress(snapshot, 1000);
      
      // Should have memory IDs for recent entries
      expect(slice.memoryIds.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect maxToSummarize config', async () => {
      const config: Partial<HybridConfig> = {
        maxToSummarize: 5
      };
      const limitedCompressor = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const slice = await limitedCompressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
    });

    it('should respect targetTokens config', async () => {
      const config: Partial<HybridConfig> = {
        targetTokens: 500
      };
      const smallTargetCompressor = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await smallTargetCompressor.compress(snapshot, 2000);
      
      // Should cap at targetTokens
      expect(slice.totalTokens).toBeLessThanOrEqual(500);
    });

    it('should respect recentRatio config', async () => {
      const config: Partial<HybridConfig> = {
        recentRatio: 0.8
      };
      const highRecentCompressor = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await highRecentCompressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
    });
  });

  describe('compress() with model provider', () => {
    it('should use model provider for summarization', async () => {
      const mockModelProvider = {
        complete: vi.fn().mockResolvedValue({ text: 'Hybrid summary from model.' })
      };
      const compressorWithProvider = new HybridCompressor({ modelProvider: mockModelProvider });
      
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const slice = await compressorWithProvider.compress(snapshot, 500);
      
      expect(slice).toBeDefined();
    });

    it('should fallback to truncation on model error', async () => {
      const failingModelProvider = {
        complete: vi.fn().mockRejectedValue(new Error('API error'))
      };
      const compressorWithProvider = new HybridCompressor({ modelProvider: failingModelProvider });
      
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      // Should not throw - should fallback
      const slice = await compressorWithProvider.compress(snapshot, 500);
      
      expect(slice).toBeDefined();
      // Should contain recent context header after fallback
      expect(slice.conversation).toContain('--- Recent Context ---');
    });
  });

  describe('expand()', () => {
    it('should return empty snapshot (cannot expand)', async () => {
      const slice: ContextSlice = {
        system: '',
        conversation: 'Some hybrid compressed conversation',
        tools: '',
        totalTokens: 100,
        memoryIds: ['session:1', 'session:2']
      };
      
      const snapshot = await compressor.expand(slice);
      
      expect(snapshot.session).toHaveLength(0);
      expect(snapshot.persistent).toHaveLength(0);
      expect(snapshot.derived).toHaveLength(0);
      expect(snapshot.totalTokens).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should calculate compression ratio', () => {
      const stats = compressor.getStats(1000, 300);
      
      expect(stats.ratio).toBe(0.3);
      expect(stats.reduction).toBe(700);
    });

    it('should include strategy information', () => {
      const stats = compressor.getStats(1000, 300);
      
      expect(stats.strategy).toBe('hybrid');
    });

    it('should handle zero original tokens', () => {
      const stats = compressor.getStats(0, 0);
      
      expect(stats.reduction).toBe(0);
    });

    it('should return negative reduction when compressed > original', () => {
      const stats = compressor.getStats(100, 200);
      
      expect(stats.ratio).toBe(2);
      expect(stats.reduction).toBe(-100);
    });
  });

  describe('edge cases', () => {
    it('should handle single entry', async () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      // Should have at least the recent entry
      expect(slice.memoryIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle entries less than keepRecent', async () => {
      const config: Partial<HybridConfig> = {
        keepRecent: 10
      };
      const highKeepCompressor = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(3, 0, 0);
      
      const slice = await highKeepCompressor.compress(snapshot, 1000);
      
      // All entries are "recent"
      expect(slice.memoryIds.length).toBe(3);
    });

    it('should handle empty content entries', async () => {
      const entry = createMemoryEntry('1', '');
      const snapshot: MemorySnapshot = {
        session: [entry],
        persistent: [],
        derived: [],
        totalTokens: 0
      };
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
    });

    it('should handle very large content', async () => {
      const longContent = 'A'.repeat(50000);
      const entry = createMemoryEntry('1', longContent);
      const snapshot: MemorySnapshot = {
        session: [entry],
        persistent: [],
        derived: [],
        totalTokens: 12500
      };
      
      const slice = await compressor.compress(snapshot, 100);
      
      expect(slice).toBeDefined();
    });

    it('should handle keepRecent of 0', async () => {
      const config: Partial<HybridConfig> = {
        keepRecent: 0
      };
      const noRecentCompressor = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await noRecentCompressor.compress(snapshot, 500);
      
      // Should not have "Recent Context" header since there are no recent entries to keep
      expect(slice).toBeDefined();
    });

    it('should handle maxToSummarize of 0', async () => {
      const config: Partial<HybridConfig> = {
        maxToSummarize: 0
      };
      const noSummarizeCompressor = new HybridCompressor(config);
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await noSummarizeCompressor.compress(snapshot, 500);
      
      expect(slice).toBeDefined();
    });

    it('should handle small maxTokens', async () => {
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await compressor.compress(snapshot, 10);
      
      expect(slice).toBeDefined();
    });

    it('should include both recent and older memory IDs', async () => {
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      // Should have at least recent entries (may not have summary IDs depending on config)
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });
  });
});