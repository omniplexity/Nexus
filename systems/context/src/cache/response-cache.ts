/**
 * Response Cache Implementation
 * 
 * LRU (Least Recently Used) cache for context snapshots
 * with TTL support and invalidation.
 */

import type { MemorySnapshot } from '../../../../core/contracts/memory';

/**
 * Cache entry
 */
interface CacheEntry {
  key: string;
  value: MemorySnapshot;
  tokens: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt?: Date;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /**
   * Maximum number of cached items
   */
  maxSize: number;
  
  /**
   * Maximum total tokens in cache
   */
  maxTokens: number;
  
  /**
   * Time to live in milliseconds
   */
  ttl: number;
  
  /**
   * Invalidate cache when memory is updated
   */
  invalidateOnUpdate: boolean;
  
  /**
   * Enable token tracking
   */
  trackTokens: boolean;
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  maxSize: 100,
  maxTokens: 50000,
  ttl: 3600000, // 1 hour
  invalidateOnUpdate: true,
  trackTokens: true
};

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  invalidations: number;
  currentSize: number;
  currentTokens: number;
  hitRate: number;
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`);
  return `{${entries.join(',')}}`;
}

/**
 * LRU Cache for context snapshots
 */
export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    invalidations: 0,
    currentSize: 0,
    currentTokens: 0,
    hitRate: 0
  };
  private accessOrder: string[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate cache key from session and parameters
   */
  private generateKey(sessionId: string, maxTokens: number, options?: Record<string, unknown>): string {
    const parts = [sessionId, maxTokens.toString()];
    if (options) {
      parts.push(stableStringify(options));
    }
    return parts.join(':');
  }

  /**
   * Estimate tokens for snapshot
   */
  private estimateTokens(snapshot: MemorySnapshot): number {
    return snapshot.totalTokens || 0;
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = new Date();
    if (entry.expiresAt && now > entry.expiresAt) {
      return true;
    }
    if (now.getTime() - entry.lastAccessedAt.getTime() > this.config.ttl) {
      return true;
    }
    return false;
  }

  /**
   * Evict entries to make room
   */
  private evict(tokensNeeded: number): void {
    // Sort by last accessed time (oldest first)
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime());

    let evicted = 0;
    let tokensFreed = 0;

    for (const entry of entries) {
      if (this.stats.currentTokens - tokensFreed + tokensNeeded <= this.config.maxTokens &&
          this.cache.size - evicted + 1 <= this.config.maxSize) {
        break;
      }

      this.cache.delete(entry.key);
      this.accessOrder = this.accessOrder.filter(k => k !== entry.key);
      evicted++;
      tokensFreed += entry.tokens;
      this.stats.evictions++;
    }

    this.stats.currentSize = this.cache.size;
    this.stats.currentTokens -= tokensFreed;
  }

  /**
   * Update access order for LRU
   */
  private updateAccess(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * Get value from cache
   */
  get(sessionId: string, maxTokens: number, options?: Record<string, unknown>): MemorySnapshot | null {
    const key = this.generateKey(sessionId, maxTokens, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats.currentSize = this.cache.size;
      this.stats.currentTokens -= entry.tokens;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.lastAccessedAt = new Date();
    entry.accessCount++;
    this.updateAccess(key);

    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(sessionId: string, maxTokens: number, snapshot: MemorySnapshot, options?: Record<string, unknown>): void {
    const key = this.generateKey(sessionId, maxTokens, options);
    const tokens = this.config.trackTokens ? this.estimateTokens(snapshot) : 0;

    // Check if we need to evict
    if (!this.cache.has(key)) {
      this.evict(tokens);
    }

    const now = new Date();
    const entry: CacheEntry = {
      key,
      value: snapshot,
      tokens,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      expiresAt: new Date(now.getTime() + this.config.ttl)
    };

    this.cache.set(key, entry);
    this.updateAccess(key);

    this.stats.currentSize = this.cache.size;
    this.stats.currentTokens += tokens;
  }

  /**
   * Invalidate cache for a session
   */
  invalidate(sessionId: string): number {
    const prefix = `${sessionId}:`;
    let invalidated = 0;

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      if (entry) {
        this.stats.currentTokens -= entry.tokens;
      }
      this.cache.delete(key);
      invalidated++;
    }

    this.accessOrder = this.accessOrder.filter(k => !k.startsWith(prefix));
    this.stats.currentSize = this.cache.size;
    this.stats.invalidations += invalidated;

    return invalidated;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateEntry(sessionId: string, maxTokens: number, options?: Record<string, unknown>): boolean {
    const key = this.generateKey(sessionId, maxTokens, options);
    const entry = this.cache.get(key);

    if (entry) {
      this.stats.currentTokens -= entry.tokens;
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats.currentSize = this.cache.size;
      this.stats.invalidations++;
      return true;
    }

    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.currentSize = 0;
    this.stats.currentTokens = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if cache has entry
   */
  has(sessionId: string, maxTokens: number, options?: Record<string, unknown>): boolean {
    const key = this.generateKey(sessionId, maxTokens, options);
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }
}

/**
 * Factory function to create response cache
 */
export function createResponseCache(config?: Partial<CacheConfig>): ResponseCache {
  return new ResponseCache(config);
}
