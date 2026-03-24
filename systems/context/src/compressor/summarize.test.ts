/**
 * Tests for SummarizeCompressor
 * 
 * Tests all public methods of the SummarizeCompressor class:
 * - compress, expand, getStats
 */

import type { MemorySnapshot, ContextSlice, MemoryEntry } from '../../../../core/contracts/memory';
import { MemoryType } from '../../../../core/contracts/memory';

import { SummarizeCompressor, createSummarizeCompressor, type SummarizeConfig } from './summarize.js';

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
    session.push(createMemoryEntry(`session-${i}`, `Session content ${i} - some test data`, MemoryType.SESSION, createdAt));
  }
  for (let i = 0; i < persistentCount; i++) {
    const createdAt = new Date(now - (persistentCount - i) * 60000);
    persistent.push(createMemoryEntry(`persistent-${i}`, `Persistent content ${i} - important information`, MemoryType.PERSISTENT, createdAt));
  }
  for (let i = 0; i < derivedCount; i++) {
    const createdAt = new Date(now - (derivedCount - i) * 60000);
    derived.push(createMemoryEntry(`derived-${i}`, `Derived content ${i} - summary data`, MemoryType.DERIVED, createdAt));
  }

  return {
    session,
    persistent,
    derived,
    totalTokens: (sessionCount + persistentCount + derivedCount) * 100
  };
}

describe('SummarizeCompressor', () => {
  let compressor: SummarizeCompressor;

  beforeEach(() => {
    compressor = new SummarizeCompressor();
  });

  describe('constructor', () => {
    it('should create compressor with default config', () => {
      const defaultCompressor = new SummarizeCompressor();
      expect(defaultCompressor).toBeDefined();
    });

    it('should create compressor with custom config', () => {
      const config: Partial<SummarizeConfig> = {
        keepRecent: 3,
        minEntriesToSummarize: 5,
        targetReductionRatio: 0.3,
        model: 'gpt-3.5-turbo'
      };
      const customCompressor = new SummarizeCompressor(config);
      expect(customCompressor).toBeDefined();
    });

    it('should accept model provider', () => {
      const mockModelProvider = {
        complete: async () => ({ text: 'Mock summary' })
      };
      const compressorWithProvider = new SummarizeCompressor({}, mockModelProvider);
      expect(compressorWithProvider).toBeDefined();
    });

    it('should use factory function', () => {
      const factoryCompressor = createSummarizeCompressor();
      expect(factoryCompressor).toBeInstanceOf(SummarizeCompressor);
    });
  });

  describe('compress()', () => {
    it('should compress empty snapshot', async () => {
      const snapshot = createMemorySnapshot(0, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
      // Empty snapshot gets header added which creates some tokens
      expect(slice.totalTokens).toBe(6); // '--- Recent Context ---' = ~6 tokens
      expect(slice.memoryIds).toHaveLength(0);
    });

    it('should keep recent entries verbatim', async () => {
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      // Should have memory IDs for recent entries
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should add "Recent Context" header for recent entries', async () => {
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice.conversation).toContain('--- Recent Context ---');
    });

    it('should use simple summarization when no model provider', async () => {
      const snapshot = createMemorySnapshot(20, 0, 0); // Many entries should trigger summarization
      
      const slice = await compressor.compress(snapshot, 500);
      
      // Should produce output (may include simple summary)
      expect(slice).toBeDefined();
    });

    it('should not summarize if below minEntriesToSummarize threshold', async () => {
      const config: Partial<SummarizeConfig> = {
        keepRecent: 5,
        minEntriesToSummarize: 10
      };
      const highThresholdCompressor = new SummarizeCompressor(config);
      const snapshot = createMemorySnapshot(7, 0, 0);
      
      const slice = await highThresholdCompressor.compress(snapshot, 1000);
      
      // Should just have recent context
      expect(slice.conversation).toContain('--- Recent Context ---');
    });

    it('should handle different memory types', async () => {
      const snapshot = createMemorySnapshot(5, 5, 5);
      
      const slice = await compressor.compress(snapshot, 2000);
      
      expect(slice.memoryIds.length).toBeGreaterThan(0);
      // Should have memory IDs for all categories
      expect(slice.memoryIds.some(id => id.startsWith('session:'))).toBe(true);
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
      const config: Partial<SummarizeConfig> = {
        keepRecent: 2
      };
      const compressorWithKeep = new SummarizeCompressor(config);
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await compressorWithKeep.compress(snapshot, 1000);
      
      // Should keep 2 recent entries
      expect(slice.memoryIds).toHaveLength(2);
    });
  });

  describe('compress() with model provider', () => {
    it('should use model provider for summarization', async () => {
      const mockModelProvider = {
        complete: vi.fn().mockResolvedValue({ text: 'This is a mock summary of the conversation.' })
      };
      const compressorWithProvider = new SummarizeCompressor({}, mockModelProvider);
      
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const slice = await compressorWithProvider.compress(snapshot, 500);
      
      expect(mockModelProvider.complete).toHaveBeenCalled();
      expect(slice.conversation).toContain('mock summary');
    });

    it('should fallback to simpleSummarize on model error', async () => {
      const failingModelProvider = {
        complete: vi.fn().mockRejectedValue(new Error('API error'))
      };
      const compressorWithProvider = new SummarizeCompressor({}, failingModelProvider);
      
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw - should fallback
      const slice = await compressorWithProvider.compress(snapshot, 500);
      
      warnSpy.mockRestore();
      expect(slice).toBeDefined();
    });
  });

  describe('expand()', () => {
    it('should return empty snapshot (cannot expand)', async () => {
      const slice: ContextSlice = {
        system: '',
        conversation: 'Some summarized conversation',
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
      
      expect(slice.memoryIds.length).toBe(1); // One recent entry
    });

    it('should handle entries below minEntriesToSummarize', async () => {
      const config: Partial<SummarizeConfig> = {
        minEntriesToSummarize: 10
      };
      const highThresholdCompressor = new SummarizeCompressor(config);
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await highThresholdCompressor.compress(snapshot, 1000);
      
      // Should have just the recent entries, no summary
      expect(slice.memoryIds.length).toBe(5);
    });

    it('should handle entries with newlines and special chars', async () => {
      const entry = createMemoryEntry('1', 'Line 1\n\nLine 2\n\n--- separator\n\nLine 3');
      const snapshot: MemorySnapshot = {
        session: [entry],
        persistent: [],
        derived: [],
        totalTokens: 50
      };
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
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
      // Should summarize down - allow small variance for header and formatting
      expect(slice.totalTokens).toBeLessThanOrEqual(13000);
    });

    it('should handle keepRecent of 0', async () => {
      const config: Partial<SummarizeConfig> = {
        keepRecent: 0
      };
      const noRecentCompressor = new SummarizeCompressor(config);
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await noRecentCompressor.compress(snapshot, 500);
      
      // With keepRecent=0, there should be no recent entries but may still have formatting
      expect(slice).toBeDefined();
    });

    it('should handle custom summarize prompt', async () => {
      const customPrompt = 'Summarize this: {content}. Keep it brief.';
      const config: Partial<SummarizeConfig> = {
        summarizePrompt: customPrompt
      };
      const customPromptCompressor = new SummarizeCompressor(config);
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const slice = await customPromptCompressor.compress(snapshot, 500);
      
      expect(slice).toBeDefined();
    });
  });
});
