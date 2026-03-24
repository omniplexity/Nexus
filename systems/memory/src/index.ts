/**
 * Memory System - Main Exports
 * 
 * Provides memory storage, retrieval, and management for the context engine.
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

// Re-export internal types
export type {
  InternalMemoryEntry,
  MemoryIndexes,
  MemoryStoreConfig,
  InternalSearchOptions,
  MemoryStoreStats,
  ArchiveConfig,
  ArchiveRecord,
  VectorIndexConfig
} from './types.js';

// Export implementations
export { InMemoryStore, createMemoryStore } from './store.js';
export { VectorIndex, createVectorIndex, generateMockEmbedding, normalizeEmbedding } from './vector-index.js';
export { ArchiveManager, createArchiveManager, ArchiveStatus } from './archive.js';
export type { Embedding } from './vector-index.js';

// Default configuration
export const DEFAULT_MEMORY_CONFIG = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7,
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7
} as const;