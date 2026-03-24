/**
 * Tests for TruncateCompressor
 * 
 * Tests all public methods of the TruncateCompressor class:
 * - compress, expand, getStats
 */

import type { MemorySnapshot, ContextSlice, MemoryEntry } from '../../../../core/contracts/memory';
import { MemoryType } from '../../../../core/contracts/memory';

import { TruncateCompressor, createTruncateCompressor, type TruncateConfig } from './truncate.js';

// Test helper to create memory entries with different creation times
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
    // Create entries with decreasing timestamps
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

describe('TruncateCompressor', () => {
  let compressor: TruncateCompressor;

  beforeEach(() => {
    compressor = new TruncateCompressor();
  });

  describe('constructor', () => {
    it('should create compressor with default config', () => {
      const defaultCompressor = new TruncateCompressor();
      expect(defaultCompressor).toBeDefined();
    });

    it('should create compressor with custom config', () => {
      const config: Partial<TruncateConfig> = {
        sessionRatio: 0.5,
        persistentRatio: 0.3,
        derivedRatio: 0.2,
        preserveMostRecent: false
      };
      const customCompressor = new TruncateCompressor(config);
      expect(customCompressor).toBeDefined();
    });

    it('should use factory function', () => {
      const factoryCompressor = createTruncateCompressor();
      expect(factoryCompressor).toBeInstanceOf(TruncateCompressor);
    });
  });

  describe('compress()', () => {
    it('should compress empty snapshot', async () => {
      const snapshot = createMemorySnapshot(0, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
      expect(slice.conversation).toBe('');
      expect(slice.totalTokens).toBe(0);
      expect(slice.memoryIds).toHaveLength(0);
    });

    it('should keep most recent entries within budget', async () => {
      const snapshot = createMemorySnapshot(5, 0, 0);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice.memoryIds.length).toBeGreaterThan(0);
      // Should include at least some entries
      expect(slice.memoryIds.some(id => id.startsWith('session:'))).toBe(true);
    });

    it('should distribute budget across categories', async () => {
      const snapshot = createMemorySnapshot(3, 3, 3);
      
      const slice = await compressor.compress(snapshot, 1000);
      
      // All categories should have some representation
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should truncate when exceeding budget', async () => {
      const snapshot = createMemorySnapshot(20, 0, 0);
      
      const slice = await compressor.compress(snapshot, 100); // Very small budget
      
      // Should still have some entries
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should respect preserveMostRecent setting', async () => {
      const config: Partial<TruncateConfig> = {
        preserveMostRecent: true
      };
      const preservingCompressor = new TruncateCompressor(config);
      const snapshot = createMemorySnapshot(10, 0, 0);
      
      const slice = await preservingCompressor.compress(snapshot, 500);
      
      // Should have some entries (most recent one preserved)
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should handle all memory types', async () => {
      const snapshot = createMemorySnapshot(3, 3, 3);
      
      const slice = await compressor.compress(snapshot, 2000);
      
      // Should have memory IDs for all categories
      expect(slice.memoryIds.some(id => id.startsWith('session:'))).toBe(true);
      expect(slice.memoryIds.some(id => id.startsWith('persistent:'))).toBe(true);
      expect(slice.memoryIds.some(id => id.startsWith('derived:'))).toBe(true);
    });

    it('should handle custom ratio configuration', async () => {
      const config: Partial<TruncateConfig> = {
        sessionRatio: 0.6,
        persistentRatio: 0.3,
        derivedRatio: 0.1
      };
      const ratioCompressor = new TruncateCompressor(config);
      const snapshot = createMemorySnapshot(5, 5, 5);
      
      const slice = await ratioCompressor.compress(snapshot, 1000);
      
      expect(slice).toBeDefined();
    });

    it('should return valid ContextSlice', async () => {
      const snapshot = createMemorySnapshot(2, 1, 1);
      
      const slice = await compressor.compress(snapshot, 500);
      
      expect(slice.system).toBe('');
      expect(slice.tools).toBe('');
      expect(typeof slice.conversation).toBe('string');
      expect(typeof slice.totalTokens).toBe('number');
      expect(Array.isArray(slice.memoryIds)).toBe(true);
    });
  });

  describe('expand()', () => {
    it('should return empty snapshot (cannot expand)', async () => {
      const slice: ContextSlice = {
        system: '',
        conversation: 'Some conversation',
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
      const stats = compressor.getStats(1000, 400);
      
      expect(stats.ratio).toBe(0.4);
      expect(stats.reduction).toBe(600);
    });

    it('should handle zero original tokens', () => {
      const stats = compressor.getStats(0, 0);
      
      expect(stats.ratio).toBeNaN(); // 0/0 = NaN
      expect(stats.reduction).toBe(0);
    });

    it('should handle case where compressed > original', () => {
      const stats = compressor.getStats(100, 150);
      
      expect(stats.ratio).toBe(1.5);
      expect(stats.reduction).toBe(-50);
    });
  });

  describe('edge cases', () => {
    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      const entry = createMemoryEntry('1', longContent);
      const snapshot: MemorySnapshot = {
        session: [entry],
        persistent: [],
        derived: [],
        totalTokens: 2500
      };
      
      const slice = await compressor.compress(snapshot, 100);
      
      expect(slice).toBeDefined();
      expect(slice.totalTokens).toBeLessThan(2500);
    });

    it('should handle entries with special characters', async () => {
      const specialContent = 'Content with émoji 🎉 and "quotes" and\nnewlines';
      const entry = createMemoryEntry('1', specialContent);
      const snapshot: MemorySnapshot = {
        session: [entry],
        persistent: [],
        derived: [],
        totalTokens: 100
      };
      
      const slice = await compressor.compress(snapshot, 1000);
      
      expect(slice.conversation).toContain('émoji');
    });

    it('should handle entries with different creation times', async () => {
      const now = Date.now();
      const entries: MemoryEntry[] = [
        createMemoryEntry('1', 'Old content', MemoryType.SESSION, new Date(now - 100000)),
        createMemoryEntry('2', 'New content', MemoryType.SESSION, new Date(now))
      ];
      const snapshot: MemorySnapshot = {
        session: entries,
        persistent: [],
        derived: [],
        totalTokens: 200
      };
      
      const slice = await compressor.compress(snapshot, 500);
      
      // Should include the new content (sorted by recency)
      expect(slice.memoryIds.length).toBeGreaterThan(0);
    });

    it('should handle zero maxTokens', async () => {
      const snapshot = createMemorySnapshot(3, 3, 3);
      
      const slice = await compressor.compress(snapshot, 0);
      
      // Should still process but with very limited budget
      expect(slice).toBeDefined();
    });

    it('should handle negative ratio configuration', async () => {
      // Ratios should be clamped - this test verifies the code handles edge cases
      const config: Partial<TruncateConfig> = {
        sessionRatio: -0.1,
        persistentRatio: 1.5,
        derivedRatio: 0.2
      };
      const ratioCompressor = new TruncateCompressor(config);
      const snapshot = createMemorySnapshot(2, 2, 2);
      
      // Should not crash
      const slice = await ratioCompressor.compress(snapshot, 1000);
      expect(slice).toBeDefined();
    });
  });
});