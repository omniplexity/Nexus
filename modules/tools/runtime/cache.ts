import type { CacheStats, ToolCache } from '../contracts/registry.js';
import type { ToolExecutionResult } from '../contracts/tool.js';

interface CacheEntry {
  result: ToolExecutionResult;
  expiresAt?: number;
  sizeBytes: number;
}

export interface ToolCacheOptions {
  maxEntries?: number;
  defaultTtlMs?: number;
}

export class MemoryToolCache implements ToolCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs?: number;
  private hits = 0;
  private misses = 0;

  constructor(options: ToolCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 100;
    this.defaultTtlMs = options.defaultTtlMs;
  }

  get(key: string): ToolExecutionResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits += 1;
    return entry.result;
  }

  set(key: string, result: ToolExecutionResult, ttl?: number): void {
    const ttlMs = ttl ?? this.defaultTtlMs;
    const sizeBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, {
      result,
      expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
      sizeBytes
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
    }
  }

  invalidate(pattern: string): number {
    let deleted = 0;

    for (const key of Array.from(this.entries.keys())) {
      if (!key.includes(pattern)) {
        continue;
      }

      this.entries.delete(key);
      deleted += 1;
    }

    return deleted;
  }

  clear(): void {
    this.entries.clear();
  }

  getStats(): CacheStats {
    const totalLookups = this.hits + this.misses;
    const sizeBytes = Array.from(this.entries.values()).reduce((total, entry) => total + entry.sizeBytes, 0);

    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalLookups > 0 ? this.hits / totalLookups : 0,
      sizeBytes
    };
  }
}

export function createToolCache(options?: ToolCacheOptions): MemoryToolCache {
  return new MemoryToolCache(options);
}
