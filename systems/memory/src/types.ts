/**
 * Internal types for the memory system.
 * These types support the implementation and are not part of the public contracts.
 */

import type {
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  MemorySnapshot,
  MemoryConfig,
  MemoryStats,
  MemoryType,
  MemoryStatus,
  MemoryMetadata
} from '../../../core/contracts/memory';

/**
 * Extended memory entry with additional internal fields
 */
export interface InternalMemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  sessionId?: string;
  userId?: string;
  tokenCount: number;
  accessCount: number;
  lastAccessedAt: Date;
}

/**
 * Index structures for fast retrieval
 */
export interface MemoryIndexes {
  byId: Map<string, InternalMemoryEntry>;
  bySession: Map<string, Set<string>>;
  byType: Map<MemoryType, Set<string>>;
  byTag: Map<string, Set<string>>;
  byUser: Map<string, Set<string>>;
}

/**
 * Memory store configuration
 */
export interface MemoryStoreConfig extends MemoryConfig {
  tokensPerChar?: number;
  maintainIndexes?: boolean;
}

/**
 * Search options for internal retrieval
 */
export interface InternalSearchOptions {
  includeExpired?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'importance' | 'accessCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Memory store statistics
 */
export interface MemoryStoreStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  totalTokens: number;
  averageEntrySize: number;
  sessionsActive: number;
  totalTokenCount: number;
  cacheHits: number;
  cacheMisses: number;
  indexSizes: {
    byId: number;
    bySession: number;
    byType: number;
    byTag: number;
    byUser: number;
  };
}

/**
 * Archive configuration
 */
export interface ArchiveConfig {
  defaultSessionTTL: number;
  defaultEphemeralTTL: number;
  maxArchiveAge: number;
  preserveArchived: boolean;
}

/**
 * Archive record
 */
export interface ArchiveRecord {
  entryId: string;
  originalType: MemoryType;
  archivedAt: Date;
  expiresAt: Date;
  status: 'active' | 'archived' | 'expired' | 'deleted';
  metadata?: Record<string, unknown>;
}

/**
 * Vector index configuration
 */
export interface VectorIndexConfig {
  similarityThreshold: number;
  maxResults: number;
  useANN: boolean;
}

/**
 * Export re-exports
 */
export type {
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  MemorySnapshot,
  MemoryConfig,
  MemoryStats,
  MemoryType,
  MemoryStatus,
  MemoryMetadata
};