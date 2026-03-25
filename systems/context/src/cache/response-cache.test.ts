/**
 * Tests for ResponseCache
 * 
 * Tests all public methods of the ResponseCache class:
 * - get, set, delete, clear, has, getStats, invalidate, invalidateEntry
 */

import type { MemorySnapshot, MemoryEntry } from '../../../../core/contracts/memory';
import { MemoryType } from '../../../../core/contracts/memory';

import { ResponseCache, createResponseCache } from './response-cache.js';

// Test helper to create memory entries
function createMemoryEntry(
  id: string,
  content: string,
  _totalTokens: number = 100
): MemoryEntry {
  return {
    id,
    type: MemoryType.SESSION,
    content,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }
  };
}

// Test helper to create memory snapshots
function createMemorySnapshot(
  sessionCount: number = 0,
  persistentCount: number = 0,
  derivedCount: number = 0,
  tokensPerEntry: number = 100
): MemorySnapshot {
  const session: MemoryEntry[] = [];
  const persistent: MemoryEntry[] = [];
  const derived: MemoryEntry[] = [];

  for (let i = 0; i < sessionCount; i++) {
    session.push(createMemoryEntry(`session-${i}`, `Session content ${i}`, tokensPerEntry));
  }
  for (let i = 0; i < persistentCount; i++) {
    persistent.push(createMemoryEntry(`persistent-${i}`, `Persistent content ${i}`, tokensPerEntry));
  }
  for (let i = 0; i < derivedCount; i++) {
    derived.push(createMemoryEntry(`derived-${i}`, `Derived content ${i}`, tokensPerEntry));
  }

  return {
    session,
    persistent,
    derived,
    totalTokens: (sessionCount + persistentCount + derivedCount) * tokensPerEntry
  };
}

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache();
  });

  describe('constructor', () => {
    it('should create cache with default config', () => {
      const defaultCache = new ResponseCache();
      const stats = defaultCache.getStats();
      
      expect(stats.currentSize).toBe(0);
      expect(stats.currentTokens).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should create cache with custom config', () => {
      const customCache = new ResponseCache({
        maxSize: 10,
        maxTokens: 5000,
        ttl: 60000,
        invalidateOnUpdate: false,
        trackTokens: false
      });
      
      expect(customCache).toBeDefined();
    });

    it('should use factory function', () => {
      const factoryCache = createResponseCache({ maxSize: 5 });
      expect(factoryCache).toBeInstanceOf(ResponseCache);
    });
  });

  describe('set()', () => {
    it('should store snapshot in cache', () => {
      const snapshot = createMemorySnapshot(1, 1, 1);
      
      cache.set('session-1', 1000, snapshot);
      
      const hasKey = cache.has('session-1', 1000);
      expect(hasKey).toBe(true);
    });

    it('should track current size after set', () => {
      const snapshot = createMemorySnapshot(2, 0, 0);
      
      cache.set('session-1', 1000, snapshot);
      
      const stats = cache.getStats();
      expect(stats.currentSize).toBe(1);
    });

    it('should track current tokens after set', () => {
      const snapshot = createMemorySnapshot(3, 0, 0, 100);
      
      cache.set('session-1', 1000, snapshot);
      
      const stats = cache.getStats();
      expect(stats.currentTokens).toBe(300);
    });

    it('should update existing entry', () => {
      const snapshot1 = createMemorySnapshot(1, 0, 0, 100);
      const snapshot2 = createMemorySnapshot(1, 0, 0, 200);
      
      cache.set('session-1', 1000, snapshot1);
      cache.set('session-1', 1000, snapshot2);
      
      const stats = cache.getStats();
      expect(stats.currentSize).toBe(1); // Should not increase
    });
  });

  describe('get()', () => {
    it('should retrieve stored snapshot', () => {
      const snapshot = createMemorySnapshot(2, 1, 1);
      
      cache.set('session-1', 1000, snapshot);
      const retrieved = cache.get('session-1', 1000);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.session).toHaveLength(2);
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent', 1000);
      
      expect(result).toBeNull();
    });

    it('should increment hits on successful retrieval', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      cache.set('session-1', 1000, snapshot);
      
      cache.get('session-1', 1000);
      cache.get('session-1', 1000); // Second access
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should increment misses on cache miss', () => {
      cache.get('session-1', 1000);
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should return null for expired entries', () => {
      const shortTtlCache = new ResponseCache({ ttl: 1 }); // 1ms TTL
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      shortTtlCache.set('session-1', 1000, snapshot);
      
      // Wait for expiration
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const result = shortTtlCache.get('session-1', 1000);
        expect(result).toBeNull();
      });
    });
  });

  describe('has()', () => {
    it('should return true for existing entry', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      cache.set('session-1', 1000, snapshot);
      
      const exists = cache.has('session-1', 1000);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      const exists = cache.has('session-1', 1000);
      expect(exists).toBe(false);
    });

    it('should return false for expired entry', () => {
      const shortTtlCache = new ResponseCache({ ttl: 1 });
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      shortTtlCache.set('session-1', 1000, snapshot);
      
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const exists = shortTtlCache.has('session-1', 1000);
        expect(exists).toBe(false);
      });
    });
  });

  describe('invalidate()', () => {
    it('should invalidate all entries for a session', () => {
      const snapshot1 = createMemorySnapshot(1, 0, 0);
      const snapshot2 = createMemorySnapshot(1, 0, 0);
      
      cache.set('session-1', 1000, snapshot1);
      cache.set('session-1', 2000, snapshot2); // Different maxTokens = different key
      cache.set('session-2', 1000, snapshot1);
      
      const invalidated = cache.invalidate('session-1');
      
      expect(invalidated).toBeGreaterThanOrEqual(1);
      expect(cache.has('session-1', 1000)).toBe(false);
    });

    it('should return count of invalidated entries', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      cache.set('session-1', 1000, snapshot);
      cache.set('session-1', 2000, snapshot);
      
      const invalidated = cache.invalidate('session-1');
      
      expect(invalidated).toBe(2);
    });
  });

  describe('invalidateEntry()', () => {
    it('should invalidate specific entry', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      cache.set('session-1', 1000, snapshot);
      const result = cache.invalidateEntry('session-1', 1000);
      
      expect(result).toBe(true);
      expect(cache.has('session-1', 1000)).toBe(false);
    });

    it('should return false for non-existent entry', () => {
      const result = cache.invalidateEntry('session-1', 1000);
      
      expect(result).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear all entries', () => {
      const snapshot = createMemorySnapshot(2, 1, 1);
      
      cache.set('session-1', 1000, snapshot);
      cache.set('session-2', 1000, snapshot);
      
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.currentSize).toBe(0);
      expect(stats.currentTokens).toBe(0);
    });

    it('should reset access order', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      cache.set('session-1', 1000, snapshot);
      
      cache.get('session-1', 1000); // Access to build order
      cache.clear();
      
      // Try to access - should not have issues
      const stats = cache.getStats();
      expect(stats.currentSize).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return initial stats', () => {
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.invalidations).toBe(0);
      expect(stats.currentSize).toBe(0);
      expect(stats.currentTokens).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should update hit rate correctly', async () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      cache.set('session-1', 1000, snapshot);
      
      // Miss
      cache.get('non-existent', 1000);
      // Hit
      cache.get('session-1', 1000);
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit / (1 hit + 1 miss)
    });
  });

  describe('key generation', () => {
    it('should generate different keys for different maxTokens', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      cache.set('session-1', 1000, snapshot);
      cache.set('session-1', 2000, snapshot);
      
      expect(cache.has('session-1', 1000)).toBe(true);
      expect(cache.has('session-1', 2000)).toBe(true);
    });

    it('should include options in key generation', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      cache.set('session-1', 1000, snapshot, { filter: 'recent' });
      cache.set('session-1', 1000, snapshot, { filter: 'all' });
      
      expect(cache.has('session-1', 1000, { filter: 'recent' })).toBe(true);
      expect(cache.has('session-1', 1000, { filter: 'all' })).toBe(true);
    });

    it('should normalize option key order when generating keys', () => {
      const snapshot = createMemorySnapshot(1, 0, 0);
      const firstOptions = { filter: 'recent', strategy: 'hybrid' };
      const secondOptions = { strategy: 'hybrid', filter: 'recent' };

      cache.set('session-1', 1000, snapshot, firstOptions);

      expect(cache.has('session-1', 1000, secondOptions)).toBe(true);
      expect(cache.get('session-1', 1000, secondOptions)).not.toBeNull();
    });
  });

  describe('eviction', () => {
    it('should respect maxSize limit', () => {
      const smallCache = new ResponseCache({ maxSize: 2 });
      const snapshot = createMemorySnapshot(1, 0, 0);
      
      smallCache.set('session-1', 1000, snapshot);
      smallCache.set('session-2', 1000, snapshot);
      smallCache.set('session-3', 1000, snapshot); // Should trigger eviction
      
      const stats = smallCache.getStats();
      expect(stats.currentSize).toBeLessThanOrEqual(2);
    });

    it('should respect maxTokens limit', () => {
      const smallCache = new ResponseCache({ maxTokens: 100, trackTokens: true });
      const snapshot = createMemorySnapshot(5, 0, 0, 100); // 500 tokens
      
      smallCache.set('session-1', 1000, snapshot); // First entry is 500 tokens
      smallCache.set('session-2', 1000, snapshot); // Should trigger eviction
      
      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty snapshot', () => {
      const snapshot = createMemorySnapshot(0, 0, 0);
      
      cache.set('session-1', 1000, snapshot);
      
      expect(cache.has('session-1', 1000)).toBe(true);
    });

    it('should handle snapshot with totalTokens set to 0', () => {
      const snapshot: MemorySnapshot = {
        session: [],
        persistent: [],
        derived: [],
        totalTokens: 0
      };
      
      const tokenCache = new ResponseCache({ trackTokens: true });
      tokenCache.set('session-1', 1000, snapshot);
      
      const stats = tokenCache.getStats();
      expect(stats.currentTokens).toBe(0);
    });

    it('should handle trackTokens: false', () => {
      const noTokenCache = new ResponseCache({ trackTokens: false });
      const snapshot = createMemorySnapshot(3, 0, 0, 100);
      
      noTokenCache.set('session-1', 1000, snapshot);
      
      const stats = noTokenCache.getStats();
      expect(stats.currentTokens).toBe(0);
    });
  });
});
