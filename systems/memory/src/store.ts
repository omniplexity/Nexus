/**
 * Memory Store Implementation
 * 
 * In-memory implementation of the Memory interface from core contracts.
 * Provides persistent and ephemeral storage for memory entries.
 */

import {
  Memory,
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  MemorySnapshot,
  MemoryStats,
  MemoryType
} from '../../../core/contracts/memory';

import type {
  InternalMemoryEntry,
  MemoryIndexes,
  MemoryStoreConfig,
  MemoryStoreStats
} from './types.js';

// Default configuration
const DEFAULT_CONFIG: Required<MemoryStoreConfig> = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7, // 7 days in seconds
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7,
  tokensPerChar: 0.25,
  maintainIndexes: true
};

/**
 * Estimate token count from text content
 * Uses a simple character-based estimation
 */
function estimateTokens(content: string, tokensPerChar: number = 0.25): number {
  return Math.ceil(content.length * tokensPerChar);
}

/**
 * Check if a memory entry has expired based on TTL
 */
function isExpired(entry: InternalMemoryEntry, defaultTTL: number): boolean {
  if (entry.metadata.expiresAt) {
    return new Date() > entry.metadata.expiresAt;
  }
  // Default TTL based on memory type
  const ttlByType: Record<MemoryType, number> = {
    [MemoryType.EPHEMERAL]: 3600,        // 1 hour
    [MemoryType.SESSION]: defaultTTL,    // 7 days
    [MemoryType.PERSISTENT]: Infinity,   // Never expires
    [MemoryType.DERIVED]: defaultTTL * 2 // 14 days
  };
  const ttl = ttlByType[entry.type] || defaultTTL;
  const expiresAt = new Date(entry.metadata.createdAt.getTime() + ttl * 1000);
  return new Date() > expiresAt;
}

/**
 * In-memory memory store implementation
 */
export class InMemoryStore implements Memory {
  private entries: Map<string, InternalMemoryEntry> = new Map();
  private indexes: MemoryIndexes = {
    byId: new Map(),
    bySession: new Map(),
    byType: new Map(),
    byTag: new Map(),
    byUser: new Map()
  };
  private config: Required<MemoryStoreConfig>;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(config: MemoryStoreConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update indexes when an entry is added
   */
  private addToIndexes(entry: InternalMemoryEntry): void {
    if (!this.config.maintainIndexes) return;

    // Session index
    if (entry.sessionId) {
      let sessionSet = this.indexes.bySession.get(entry.sessionId);
      if (!sessionSet) {
        sessionSet = new Set();
        this.indexes.bySession.set(entry.sessionId, sessionSet);
      }
      sessionSet.add(entry.id);
    }

    // Type index
    let typeSet = this.indexes.byType.get(entry.type);
    if (!typeSet) {
      typeSet = new Set();
      this.indexes.byType.set(entry.type, typeSet);
    }
    typeSet.add(entry.id);

    // Tag index
    if (entry.metadata.tags) {
      for (const tag of entry.metadata.tags) {
        let tagSet = this.indexes.byTag.get(tag);
        if (!tagSet) {
          tagSet = new Set();
          this.indexes.byTag.set(tag, tagSet);
        }
        tagSet.add(entry.id);
      }
    }

    // User index
    if (entry.userId) {
      let userSet = this.indexes.byUser.get(entry.userId);
      if (!userSet) {
        userSet = new Set();
        this.indexes.byUser.set(entry.userId, userSet);
      }
      userSet.add(entry.id);
    }
  }

  /**
   * Remove entry from indexes
   */
  private removeFromIndexes(entryId: string): void {
    if (!this.config.maintainIndexes) return;

    const entry = this.entries.get(entryId);
    if (!entry) return;

    // Remove from session index
    if (entry.sessionId) {
      const sessionSet = this.indexes.bySession.get(entry.sessionId);
      sessionSet?.delete(entryId);
    }

    // Remove from type index
    const typeSet = this.indexes.byType.get(entry.type);
    typeSet?.delete(entryId);

    // Remove from tag index
    if (entry.metadata.tags) {
      for (const tag of entry.metadata.tags) {
        const tagSet = this.indexes.byTag.get(tag);
        tagSet?.delete(entryId);
      }
    }

    // Remove from user index
    if (entry.userId) {
      const userSet = this.indexes.byUser.get(entry.userId);
      userSet?.delete(entryId);
    }
  }

  /**
   * Convert MemoryEntry to InternalMemoryEntry with computed fields
   */
  private toInternal(entry: MemoryEntry): InternalMemoryEntry {
    return {
      ...entry,
      tokenCount: estimateTokens(entry.content, this.config.tokensPerChar),
      accessCount: 0,
      lastAccessedAt: new Date()
    };
  }

  /**
   * Convert InternalMemoryEntry back to MemoryEntry
   * Note: accessCount is intentionally exposed in metadata for:
   * - Client-side observability
   * - Relevance scoring
   * - Cache optimization decisions
   */
  private toExternal(entry: InternalMemoryEntry): MemoryEntry {
    const { accessCount: _accessCount, lastAccessedAt, tokenCount: _tokenCount, ...rest } = entry;
    return {
      ...rest,
      metadata: {
        ...rest.metadata,
        accessedAt: lastAccessedAt,
        // Include access count for observability - cast needed for external interface
        accessCount: _accessCount
      }
    };
  }

  /**
   * Retrieve memories matching the query
   */
  async retrieve(query: MemoryQuery): Promise<MemoryResult> {
    let candidateIds: Set<string>;

    // Use indexes for fast lookup when possible
    if (query.sessionId && !query.embedding && !query.text) {
      candidateIds = this.indexes.bySession.get(query.sessionId) || new Set();
    } else if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      candidateIds = new Set();
      for (const type of types) {
        const typeSet = this.indexes.byType.get(type);
        if (typeSet) {
          for (const id of typeSet) {
            candidateIds.add(id);
          }
        }
      }
    } else if (query.tags && query.tags.length > 0) {
      candidateIds = new Set();
      for (const tag of query.tags) {
        const tagSet = this.indexes.byTag.get(tag);
        if (tagSet) {
          for (const id of tagSet) {
            candidateIds.add(id);
          }
        }
      }
    } else {
      // Fall back to scanning all entries
      candidateIds = new Set(this.entries.keys());
    }

    // Filter candidates
    const results: InternalMemoryEntry[] = [];
    for (const id of candidateIds) {
      const entry = this.entries.get(id);
      if (!entry) {
        this.cacheMisses++;
        continue;
      }

      // Check expiration
      if (isExpired(entry, this.config.defaultTTL)) {
        this.cacheMisses++;
        continue;
      }

      // Check user filter - use byUser index for O(1) lookup
      if (query.userId) {
        const userIds = this.indexes.byUser.get(query.userId);
        if (!userIds || !userIds.has(id)) {
          this.cacheMisses++;
          continue;
        }
      }

      // Check date range (handle both Date objects and ISO strings)
      if (query.dateRange) {
        const created = new Date(entry.metadata.createdAt);
        const start = new Date(query.dateRange.start);
        const end = new Date(query.dateRange.end);
        if (created < start || created > end) {
          this.cacheMisses++;
          continue;
        }
      }

      // Check minimum importance
      if (query.minImportance !== undefined) {
        const importance = entry.metadata.importance ?? 0.5;
        if (importance < query.minImportance) {
          this.cacheMisses++;
          continue;
        }
      }

      // Update access stats
      entry.accessCount++;
      entry.lastAccessedAt = new Date();

      this.cacheHits++;
      results.push(entry);
    }

    // Sort results
    const sortBy = query.sortBy ?? 'createdAt'; // Default sort
    const sortOrder: 'asc' | 'desc' = query.sortOrder ?? 'desc';
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.metadata.updatedAt).getTime() - new Date(b.metadata.updatedAt).getTime();
          break;
        case 'importance':
          comparison = (a.metadata.importance ?? 0.5) - (b.metadata.importance ?? 0.5);
          break;
        case 'accessCount':
          comparison = a.accessCount - b.accessCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const paginatedResults = results.slice(offset, offset + limit);

    // Calculate total tokens
    const totalTokens = paginatedResults.reduce((sum, e) => sum + e.tokenCount, 0);

    return {
      entries: paginatedResults.map(e => this.toExternal(e)),
      total: results.length,
      query,
      tokens: totalTokens
    };
  }

  /**
   * Store a memory entry
   */
  async store(entry: MemoryEntry): Promise<void> {
    // Check session limits
    if (entry.sessionId) {
      const sessionEntries = this.indexes.bySession.get(entry.sessionId);
      if (sessionEntries && sessionEntries.size >= this.config.maxEntriesPerSession) {
        // Remove oldest entry from session
        const oldestId = Array.from(sessionEntries).find(id => {
          const e = this.entries.get(id);
          return e && e.type === MemoryType.SESSION;
        });
        if (oldestId) {
          await this.delete(oldestId);
        }
      }
    }

    // Check token limits for session/persistent
    if (entry.type === MemoryType.SESSION || entry.type === MemoryType.PERSISTENT) {
      await this.enforceTokenLimits(entry.type, entry.sessionId);
    }

    // Add entry
    const internalEntry = this.toInternal(entry);
    this.entries.set(entry.id, internalEntry);
    this.addToIndexes(internalEntry);
  }

  /**
   * Enforce token limits by removing oldest entries
   */
  private async enforceTokenLimits(type: MemoryType, sessionId?: string): Promise<void> {
    const maxTokens = type === MemoryType.SESSION 
      ? this.config.maxTokensPerSession 
      : this.config.maxTokensPersistent;

    // Get entries of this type for this session
    const relevantIds = sessionId 
      ? this.indexes.bySession.get(sessionId) ?? new Set()
      : new Set(Array.from(this.entries.keys()).filter(
        id => this.entries.get(id)?.type === type
      ));

    let currentTokens = 0;
    const entriesToCheck: InternalMemoryEntry[] = [];

    for (const id of relevantIds) {
      const entry = this.entries.get(id);
      if (entry && entry.type === type) {
        entriesToCheck.push(entry);
        currentTokens += entry.tokenCount;
      }
    }

    // If over limit, remove oldest entries
    if (currentTokens > maxTokens) {
      entriesToCheck.sort((a, b) => 
        new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
      );

      for (const entry of entriesToCheck) {
        if (currentTokens <= maxTokens) break;
        await this.delete(entry.id);
        currentTokens -= entry.tokenCount;
      }
    }
  }

  /**
   * Update an existing memory entry
   */
  async update(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`Memory entry not found: ${id}`);
    }

    // Remove old indexes
    this.removeFromIndexes(id);

    // Apply updates
    const updated: InternalMemoryEntry = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    // Recalculate token count if content changed
    if (updates.content && updates.content !== existing.content) {
      updated.tokenCount = estimateTokens(updates.content, this.config.tokensPerChar);
    }

    // Update entry and indexes
    this.entries.set(id, updated);
    this.addToIndexes(updated);
  }

  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;

    this.removeFromIndexes(id);
    this.entries.delete(id);
  }

  /**
   * Clear memories for a session
   */
  async clear(sessionId: string): Promise<void> {
    const sessionEntries = this.indexes.bySession.get(sessionId);
    if (!sessionEntries) return;

    const idsToDelete = Array.from(sessionEntries);
    for (const id of idsToDelete) {
      await this.delete(id);
    }
  }

  /**
   * Get a snapshot of current memory state
   */
  async getSnapshot(sessionId: string, maxTokens: number): Promise<MemorySnapshot> {
    const sessionIds = this.indexes.bySession.get(sessionId) || new Set();
    const sessionEntries: InternalMemoryEntry[] = [];
    const persistentEntries: InternalMemoryEntry[] = [];
    const derivedEntries: InternalMemoryEntry[] = [];

    for (const id of sessionIds) {
      const entry = this.entries.get(id);
      if (!entry || isExpired(entry, this.config.defaultTTL)) continue;

      switch (entry.type) {
        case MemoryType.SESSION:
          sessionEntries.push(entry);
          break;
        case MemoryType.PERSISTENT:
          persistentEntries.push(entry);
          break;
        case MemoryType.DERIVED:
          derivedEntries.push(entry);
          break;
      }
    }

    // Get persistent entries for this user
    for (const [_id, entry] of this.entries) {
      if (entry.type === MemoryType.PERSISTENT && !entry.sessionId) {
        persistentEntries.push(entry);
      }
      if (entry.type === MemoryType.DERIVED && !entry.sessionId) {
        derivedEntries.push(entry);
      }
    }

    // Sort each category by importance/recency
    const sortByImportance = (a: InternalMemoryEntry, b: InternalMemoryEntry) => 
      (b.metadata.importance ?? 0.5) - (a.metadata.importance ?? 0.5);

    sessionEntries.sort(sortByImportance);
    persistentEntries.sort(sortByImportance);
    derivedEntries.sort(sortByImportance);

    // Trim to token budget
    let sessionTokens = 0;
    const trimmedSession: MemoryEntry[] = [];
    for (const entry of sessionEntries) {
      if (sessionTokens + entry.tokenCount > maxTokens * 0.4) break;
      trimmedSession.push(this.toExternal(entry));
      sessionTokens += entry.tokenCount;
    }

    let persistentTokens = 0;
    const trimmedPersistent: MemoryEntry[] = [];
    for (const entry of persistentEntries) {
      if (persistentTokens + entry.tokenCount > maxTokens * 0.4) break;
      trimmedPersistent.push(this.toExternal(entry));
      persistentTokens += entry.tokenCount;
    }

    let derivedTokens = 0;
    const trimmedDerived: MemoryEntry[] = [];
    for (const entry of derivedEntries) {
      if (derivedTokens + entry.tokenCount > maxTokens * 0.2) break;
      trimmedDerived.push(this.toExternal(entry));
      derivedTokens += entry.tokenCount;
    }

    return {
      session: trimmedSession,
      persistent: trimmedPersistent,
      derived: trimmedDerived,
      totalTokens: sessionTokens + persistentTokens + derivedTokens
    };
  }

  /**
   * Archive old memories
   */
  async archive(olderThan: Date): Promise<number> {
    let archived = 0;
    const toDelete: string[] = [];

    for (const [id, entry] of this.entries) {
      const createdAt = new Date(entry.metadata.createdAt);
      if (createdAt < olderThan && entry.type !== MemoryType.PERSISTENT) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.delete(id);
      archived++;
    }

    return archived;
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const byType: Record<MemoryType, number> = {
      [MemoryType.EPHEMERAL]: 0,
      [MemoryType.SESSION]: 0,
      [MemoryType.PERSISTENT]: 0,
      [MemoryType.DERIVED]: 0
    };

    let totalEntries = 0;
    let totalTokens = 0;
    let totalSize = 0;
    const sessionsActive = new Set<string>();

    for (const entry of this.entries.values()) {
      if (!isExpired(entry, this.config.defaultTTL)) {
        totalEntries++;
        totalTokens += entry.tokenCount;
        totalSize += entry.content.length;
        byType[entry.type]++;
        if (entry.sessionId) {
          sessionsActive.add(entry.sessionId);
        }
      }
    }

    return {
      totalEntries,
      byType,
      totalTokens,
      averageEntrySize: totalEntries > 0 ? totalSize / totalEntries : 0,
      sessionsActive: sessionsActive.size
    };
  }

  /**
   * Get internal store statistics
   */
  async getStoreStats(): Promise<MemoryStoreStats> {
    const baseStats = await this.getStats();
    return {
      ...baseStats,
      totalTokenCount: baseStats.totalTokens,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      indexSizes: {
        byId: this.entries.size,
        bySession: this.indexes.bySession.size,
        byType: this.indexes.byType.size,
        byTag: this.indexes.byTag.size,
        byUser: this.indexes.byUser.size
      }
    };
  }
}

/**
 * Factory function to create a memory store
 */
export function createMemoryStore(config?: MemoryStoreConfig): Memory {
  return new InMemoryStore(config);
}