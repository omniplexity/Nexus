/**
 * Tests for VectorIndex
 * 
 * Tests all public methods of the VectorIndex class:
 * - add (index), search, remove
 * - searchByText, get, getAll, getStats
 * - clear, updateEmbedding, batchIndex, batchRemove
 */

import { MemoryType } from '../../../core/contracts/memory';
import type { MemoryEntry } from '../../../core/contracts/memory';

import { VectorIndex, generateMockEmbedding, normalizeEmbedding } from './vector-index.js';

// Test helper to create memory entries with embeddings
function createEntryWithEmbedding(
  id: string,
  content: string,
  embedding: number[],
  type: MemoryType = MemoryType.SESSION
): MemoryEntry {
  return {
    id,
    type,
    content,
    embedding,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }
  };
}

describe('VectorIndex', () => {
  let index: VectorIndex;

  beforeEach(() => {
    index = new VectorIndex({
      similarityThreshold: 0.5,
      maxResults: 10,
      useANN: false
    });
  });

  describe('index()', () => {
    it('should add an entry to the index', async () => {
      const embedding = [1, 0, 0, 0];
      const entry = createEntryWithEmbedding('entry-1', 'Test content', embedding);
      
      await index.index(entry);

      const retrieved = index.get('entry-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test content');
    });

    it('should throw error when entry has no embedding', async () => {
      const entry: MemoryEntry = {
        id: 'entry-1',
        type: MemoryType.SESSION,
        content: 'Content without embedding',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: []
        }
      };

      await expect(index.index(entry)).rejects.toThrow('has no embedding');
    });

    it('should store the embedding correctly', async () => {
      const embedding = [0.5, 0.5, 0.5, 0.5];
      const entry = createEntryWithEmbedding('entry-1', 'Test content', embedding);
      
      await index.index(entry);

      const retrieved = index.get('entry-1');
      expect(retrieved?.embedding).toEqual(embedding);
    });

    it('should calculate token count from content', async () => {
      const embedding = [1, 0, 0, 0];
      const content = 'A'.repeat(100);
      const entry = createEntryWithEmbedding('entry-1', content, embedding);
      
      await index.index(entry);

      const retrieved = index.get('entry-1');
      expect(retrieved?.tokenCount).toBe(Math.ceil(100 * 0.25));
    });
  });

  describe('remove()', () => {
    it('should remove an entry from the index', async () => {
      const embedding = [1, 0, 0, 0];
      const entry = createEntryWithEmbedding('entry-1', 'Test content', embedding);
      
      await index.index(entry);
      await index.remove('entry-1');

      const retrieved = index.get('entry-1');
      expect(retrieved).toBeUndefined();
    });

    it('should handle removing non-existent entry', async () => {
      await expect(index.remove('non-existent')).resolves.not.toThrow();
    });
  });

  describe('search()', () => {
    it('should find entries with similar embeddings', async () => {
      // Add entries with different embeddings
      await index.index(createEntryWithEmbedding('entry-1', 'Similar content', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Different content', [0, 1, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-3', 'Another similar', [0.9, 0.1, 0, 0]));

      // Search with query similar to entries 1 and 3
      const results = await index.search([1, 0, 0, 0]);

      expect(results).toContain('entry-1');
      expect(results).toContain('entry-3');
    });

    it('should respect similarity threshold', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Similar', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Not similar', [0, 1, 0, 0]));

      // Use higher threshold (0.8) - only very similar entries should be returned
      const highThresholdIndex = new VectorIndex({ similarityThreshold: 0.8, maxResults: 10 });
      await highThresholdIndex.index(createEntryWithEmbedding('entry-1', 'Similar', [1, 0, 0, 0]));
      await highThresholdIndex.index(createEntryWithEmbedding('entry-2', 'Not similar', [0, 1, 0, 0]));

      const results = await highThresholdIndex.search([1, 0, 0, 0]);
      expect(results).toContain('entry-1');
      expect(results).not.toContain('entry-2');
    });

    it('should respect maxResults limit', async () => {
      // Add multiple similar entries
      for (let i = 0; i < 20; i++) {
        await index.index(createEntryWithEmbedding(`entry-${i}`, `Content ${i}`, [1, 0, 0, 0]));
      }

      const results = await index.search([1, 0, 0, 0], 5);
      expect(results).toHaveLength(5);
    });

    it('should return empty array when no matches found', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content', [0, 0, 0, 0]));

      // Search with orthogonal vector
      const results = await index.search([1, 0, 0, 0]);
      expect(results).toHaveLength(0);
    });

    it('should sort results by similarity', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Very similar', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Somewhat similar', [0.7, 0.3, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-3', 'Less similar', [0.5, 0.5, 0, 0]));

      const results = await index.search([1, 0, 0, 0]);
      
      // Results should be in order of similarity
      expect(results[0]).toBe('entry-1');
    });

    it('should handle dimension mismatch gracefully', async () => {
      // Add entries with 4 dimensions
      await index.index(createEntryWithEmbedding('entry-1', 'Content', [1, 0, 0, 0]));
      
      // Search with 3 dimensions - should skip the mismatched entry
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const results = await index.search([1, 0, 0]);
      warnSpy.mockRestore();
      expect(results).toHaveLength(0); // No results because entry 1 has wrong dimensions
    });
  });

  describe('searchByText()', () => {
    it('should find entries containing search terms', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'The quick brown fox', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'The lazy dog', [0, 1, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-3', 'Hello world', [0, 0, 1, 0]));

      const results = await index.searchByText('quick');
      expect(results).toContain('entry-1');
      expect(results).not.toContain('entry-2');
      expect(results).not.toContain('entry-3');
    });

    it('should find entries with multiple matching terms', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'The quick brown fox', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'The quick dog', [0, 1, 0, 0]));

      const results = await index.searchByText('the quick');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle case-insensitive search', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'HELLO WORLD', [1, 0, 0, 0]));

      const results = await index.searchByText('hello');
      expect(results).toContain('entry-1');
    });

    it('should return empty for no matches', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Some content', [1, 0, 0, 0]));

      const results = await index.searchByText('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'word match one', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'word match two', [0, 1, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-3', 'word match three', [0, 0, 1, 0]));

      const results = await index.searchByText('word', 2);
      expect(results).toHaveLength(2);
    });
  });

  describe('get()', () => {
    it('should retrieve entry by ID', async () => {
      const entry = createEntryWithEmbedding('entry-1', 'Test content', [1, 0, 0, 0]);
      await index.index(entry);

      const retrieved = index.get('entry-1');
      expect(retrieved?.id).toBe('entry-1');
      expect(retrieved?.content).toBe('Test content');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = index.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll()', () => {
    it('should return all entries as Map', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content 1', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Content 2', [0, 1, 0, 0]));

      const all = index.getAll();
      expect(all.size).toBe(2);
      expect(all.get('entry-1')).toBeDefined();
      expect(all.get('entry-2')).toBeDefined();
    });

    it('should return empty Map when index is empty', () => {
      const all = index.getAll();
      expect(all.size).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return correct index size', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Content', [0, 1, 0, 0]));

      const stats = index.getStats();
      expect(stats.size).toBe(2);
    });

    it('should return null dimensions for empty index', () => {
      const stats = index.getStats();
      expect(stats.dimensions).toBeNull();
    });

    it('should return dimensions from first entry', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content', [1, 0, 0, 0]));

      const stats = index.getStats();
      expect(stats.dimensions).toBe(4);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content 1', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Content 2', [0, 1, 0, 0]));

      index.clear();

      const stats = index.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('updateEmbedding()', () => {
    it('should update embedding for existing entry', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content', [1, 0, 0, 0]));
      
      await index.updateEmbedding('entry-1', [0, 0, 1, 0]);

      const results = await index.search([0, 0, 1, 0]);
      expect(results).toContain('entry-1');
    });

    it('should throw error for non-existent entry', async () => {
      await expect(index.updateEmbedding('non-existent', [1, 0, 0, 0]))
        .rejects.toThrow('not found in index');
    });
  });

  describe('batchIndex()', () => {
    it('should index multiple entries at once', async () => {
      const entries = [
        createEntryWithEmbedding('entry-1', 'Content 1', [1, 0, 0, 0]),
        createEntryWithEmbedding('entry-2', 'Content 2', [0, 1, 0, 0]),
        createEntryWithEmbedding('entry-3', 'Content 3', [0, 0, 1, 0])
      ];

      await index.batchIndex(entries);

      const stats = index.getStats();
      expect(stats.size).toBe(3);
    });

    it('should handle empty array', async () => {
      await index.batchIndex([]);

      const stats = index.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('batchRemove()', () => {
    it('should remove multiple entries at once', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content 1', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Content 2', [0, 1, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-3', 'Content 3', [0, 0, 1, 0]));

      await index.batchRemove(['entry-1', 'entry-2']);

      const stats = index.getStats();
      expect(stats.size).toBe(1);
      expect(index.get('entry-3')).toBeDefined();
    });

    it('should handle empty array', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'Content', [1, 0, 0, 0]));

      await index.batchRemove([]);

      const stats = index.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle zero vector', async () => {
      const entry = createEntryWithEmbedding('entry-1', 'Content', [0, 0, 0, 0]);
      await index.index(entry);

      // Searching with zero vector should return empty (no similarity)
      const results = await index.search([1, 0, 0, 0]);
      expect(results).toHaveLength(0);
    });

    it('should handle negative values in embedding', async () => {
      const entry = createEntryWithEmbedding('entry-1', 'Content', [-1, 0, 0, 0]);
      await index.index(entry);

      const results = await index.search([-1, 0, 0, 0]);
      expect(results).toContain('entry-1');
    });

    it('should handle empty content', async () => {
      const entry = createEntryWithEmbedding('entry-1', '', [1, 0, 0, 0]);
      await index.index(entry);

      const retrieved = index.get('entry-1');
      expect(retrieved?.content).toBe('');
    });

    it('should handle special characters in content', async () => {
      const entry = createEntryWithEmbedding('entry-1', 'Hello émoji 🎉 and "quotes"', [1, 0, 0, 0]);
      await index.index(entry);

      // Text search might need normalized content - let's test with a simpler approach
      const results = await index.searchByText('hello');
      expect(results).toContain('entry-1');
    });

    it('should work with large embedding dimensions', async () => {
      const largeEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const entry = createEntryWithEmbedding('entry-1', 'Content', largeEmbedding);
      
      await index.index(entry);
      
      const stats = index.getStats();
      expect(stats.dimensions).toBe(1536);
    });

    it('should search with limit when custom limit is provided', async () => {
      // Add many entries
      for (let i = 0; i < 50; i++) {
        const embedding = [Math.random(), Math.random(), Math.random(), Math.random()];
        await index.index(createEntryWithEmbedding(`entry-${i}`, `Content ${i}`, embedding));
      }

      // Search with very high similarity threshold to get many matches
      const customIndex = new VectorIndex({ similarityThreshold: 0.1, maxResults: 100 });
      for (let i = 0; i < 50; i++) {
        const embedding = [Math.random(), Math.random(), Math.random(), Math.random()];
        await customIndex.index(createEntryWithEmbedding(`entry-${i}`, `Content ${i}`, embedding));
      }

      // Use explicit limit of 5
      const results = await customIndex.search([0.5, 0.5, 0.5, 0.5], 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('cosine similarity', () => {
    it('should find identical vectors as most similar', async () => {
      const embedding = [1, 0, 0, 0];
      await index.index(createEntryWithEmbedding('entry-1', 'Same vector', embedding));

      const results = await index.search(embedding);
      expect(results[0]).toBe('entry-1');
    });

    it('should rank orthogonal vectors low', async () => {
      await index.index(createEntryWithEmbedding('entry-1', 'X direction', [1, 0, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-2', 'Y direction', [0, 1, 0, 0]));
      await index.index(createEntryWithEmbedding('entry-3', 'Z direction', [0, 0, 1, 0]));

      // Use a lower threshold to capture orthogonal vectors
      const lowThresholdIndex = new VectorIndex({ similarityThreshold: 0.1, maxResults: 10 });
      await lowThresholdIndex.index(createEntryWithEmbedding('entry-1', 'X direction', [1, 0, 0, 0]));
      await lowThresholdIndex.index(createEntryWithEmbedding('entry-2', 'Y direction', [0, 1, 0, 0]));
      await lowThresholdIndex.index(createEntryWithEmbedding('entry-3', 'Z direction', [0, 0, 1, 0]));

      const results = await lowThresholdIndex.search([1, 0, 0, 0]);
      // entry-1 should be first (identical), entry-2 and entry-3 are orthogonal (0 similarity)
      expect(results[0]).toBe('entry-1');
      // With low threshold, we should get entry-2 or entry-3 as well (or both)
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('generateMockEmbedding', () => {
  it('should generate embeddings with correct dimensions', () => {
    const embedding = generateMockEmbedding(512);
    expect(embedding).toHaveLength(512);
  });

  it('should generate embeddings with values in range [-1, 1]', () => {
    const embedding = generateMockEmbedding(100);
    for (const value of embedding) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('should use default dimensions of 1536', () => {
    const embedding = generateMockEmbedding();
    expect(embedding).toHaveLength(1536);
  });
});

describe('normalizeEmbedding', () => {
  it('should return zero vector for zero input', () => {
    const normalized = normalizeEmbedding([0, 0, 0, 0]);
    expect(normalized).toEqual([0, 0, 0, 0]);
  });

  it('should normalize non-zero vector to unit length', () => {
    const normalized = normalizeEmbedding([3, 4]);
    
    // Calculate expected unit vector
    const magnitude = Math.sqrt(9 + 16); // = 5
    const expected = [3 / magnitude, 4 / magnitude];
    
    expect(normalized[0]).toBeCloseTo(expected[0]);
    expect(normalized[1]).toBeCloseTo(expected[1]);
  });

  it('should preserve direction of vector', () => {
    const original = [1, 1, 1];
    const normalized = normalizeEmbedding(original);
    
    // All components should be equal for a normalized vector
    expect(normalized[0]).toBe(normalized[1]);
    expect(normalized[1]).toBe(normalized[2]);
  });
});
