/**
 * Context Engine - Main Exports
 * 
 * Provides context management including compression, caching,
 * prioritization, and routing.
 */

// Re-export from core contracts
export type {
  Memory,
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  MemorySnapshot,
  MemoryConfig,
  MemoryStats,
  MemoryType,
  MemoryStatus,
  MemoryMetadata,
  ContextSlice,
  ContextCompressor,
  MemoryIndex,
  MemoryValidator
} from '../../../core/contracts/memory';

// Export compressor
export * from './compressor/index.js';

// Export cache
export * from './cache/index.js';

// Export prioritizer
export * from './prioritizer/index.js';

// Export router
export * from './router/index.js';

/**
 * Default context engine configuration
 */
export const DEFAULT_CONTEXT_CONFIG = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7,
  similarityThreshold: 0.7,
  cache: {
    maxSize: 100,
    maxTokens: 50000,
    ttl: 3600000
  },
  compressor: {
    type: 'truncate' as const,
    sessionRatio: 0.4,
    persistentRatio: 0.4,
    derivedRatio: 0.2
  },
  prioritizer: {
    recency: 0.3,
    importance: 0.25,
    relevance: 0.25,
    frequency: 0.1,
    diversity: 0.1
  }
} as const;