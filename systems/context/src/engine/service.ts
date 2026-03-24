/**
 * Context Engine Service Implementation
 * 
 * Implements the ContextEngineService interface by coordinating:
 * - Memory queries
 * - Context routing
 * - Prioritization/scoring
 * - Compression
 */

import type {
  ContextEngineService,
  ContextEngineConfig,
  ContextRequest,
  ContextEngineStats
} from '../../../../core/contracts/context-engine';
import { DEFAULT_CONTEXT_ENGINE_CONFIG, CompressionStrategy } from '../../../../core/contracts/context-engine';
import type {
  Memory,
  MemoryQuery,
  MemorySnapshot,
  ContextSlice,
  MemoryIndex,
  MemoryEntry
} from '../../../../core/contracts/memory';
import { createCompressor, CompressorType } from '../compressor/index.js';
import { ContextPrioritizer, createPrioritizer, type ScorerConfig } from '../prioritizer/index.js';
import { ContextRouter, createContextRouter, type RouterConfig } from '../router/index.js';

/**
 * Context Engine Service Implementation
 * 
 * Coordinates memory retrieval, routing, prioritization, and compression
 * to produce optimized context slices for LLM execution.
 */
export class DefaultContextEngineService implements ContextEngineService {
  private memory: Memory;
  private vectorIndex: MemoryIndex | null;
  private router!: ContextRouter;
  private prioritizer!: ContextPrioritizer;
  private config: Required<ContextEngineConfig>;
  private stats: ContextEngineStats;

  constructor(
    memory: Memory,
    vectorIndex: MemoryIndex | undefined,
    config: Partial<ContextEngineConfig> = {}
  ) {
    this.memory = memory;
    this.vectorIndex = vectorIndex || null;
    this.config = {
      ...DEFAULT_CONTEXT_ENGINE_CONFIG,
      ...config,
      router: {
        ...DEFAULT_CONTEXT_ENGINE_CONFIG.router,
        ...config.router
      },
      prioritizer: {
        ...DEFAULT_CONTEXT_ENGINE_CONFIG.prioritizer,
        ...config.prioritizer
      }
    } as Required<ContextEngineConfig>;

    this.rebuildComponents();

    // Initialize stats
    this.stats = {
      totalPreparations: 0,
      cacheHits: 0,
      averageContextSize: 0,
      queryTypes: {
        simple: 0,
        complex: 0,
        tool_heavy: 0,
        multi_session: 0
      },
      compressionStats: {
        totalOriginalTokens: 0,
        totalCompressedTokens: 0,
        averageRatio: 0
      }
    };
  }

  /**
   * Prepare a context slice for execution
   * 
   * Main entry point that orchestrates:
   * 1. Query memory based on request
   * 2. Route request to determine pipeline
   * 3. Score and prioritize entries if needed
   * 4. Compress to fit token budget
   * 5. Return ContextSlice
   */
  async prepareContext(request: ContextRequest): Promise<ContextSlice> {
    // Build the initial query first so routing can classify the request.
    const query = this.buildMemoryQuery(request);

    // Route the request to determine processing pipeline
    const routing = this.router.route(query);
    const maxTokens = request.maxTokens ?? routing.tokenBudget;
    query.limit = this.config.maxEntriesPerSession * Math.max(1, request.sessionIds?.length ?? 1);
    
    // Track query type for statistics
    this.stats.queryTypes[routing.queryType] = (this.stats.queryTypes[routing.queryType] ?? 0) + 1;

    try {
      let snapshot: MemorySnapshot;

    const requiresRetrievedEntries =
      Boolean(request.embedding && this.vectorIndex) ||
      Boolean(request.filters);

    // Get memory snapshot based on the request shape
    if (routing.requiresMultiSession) {
      snapshot = await this.aggregateMultiSession(request, maxTokens);
      if (request.embedding && this.vectorIndex) {
        snapshot = await this.filterSnapshotByVectorMatches(snapshot, request.embedding);
      }
      if (request.filters) {
        snapshot = this.filterSnapshotByFilters(snapshot, request.filters);
      }
    } else if (requiresRetrievedEntries) {
      const retrieved = await this.memory.retrieve(query);
      const filteredEntries = request.embedding && this.vectorIndex
        ? await this.filterEntriesByVectorMatches(retrieved.entries, request.embedding)
        : retrieved.entries;
      snapshot = this.snapshotFromEntries(filteredEntries);
    } else {
      snapshot = await this.memory.getSnapshot(request.sessionId, maxTokens);
    }

      // Apply prioritization if needed
      if (routing.requiresPrioritization) {
        const allEntries: MemoryEntry[] = [
          ...snapshot.session,
          ...snapshot.persistent,
          ...snapshot.derived
        ];
        
        const prioritizedEntries = await this.prioritizer.prioritize(allEntries, query);
        
        // Rebuild snapshot with prioritized entries
        snapshot = this.rebuildSnapshot(prioritizedEntries, maxTokens);
      }

      // Compress the snapshot to fit token budget
      const slice = await routing.compressor.compress(snapshot, maxTokens);

      // Update statistics
      this.stats.totalPreparations++;
      this.stats.compressionStats.totalOriginalTokens += snapshot.totalTokens;
      this.stats.compressionStats.totalCompressedTokens += slice.totalTokens;
      
      const totalCompressions = this.stats.totalPreparations;
      const totalOriginal = this.stats.compressionStats.totalOriginalTokens;
      const totalCompressed = this.stats.compressionStats.totalCompressedTokens;
      this.stats.compressionStats.averageRatio = totalOriginal > 0 
        ? totalCompressed / totalOriginal 
        : 1;
      this.stats.averageContextSize = Math.round(
        (this.stats.averageContextSize * (totalCompressions - 1) + slice.totalTokens) / totalCompressions
      );

      return slice;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Context engine failed to prepare context', {
        sessionId: request.sessionId,
        userId: request.userId,
        error: message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Compress an existing memory snapshot
   */
  async compressContext(
    snapshot: MemorySnapshot,
    maxTokens: number,
    strategy?: CompressionStrategy
  ): Promise<ContextSlice> {
    const compressorType = strategy 
      ? this.strategyToCompressorType(strategy)
      : this.config.compressionStrategy;
    
    const compressor = createCompressor(compressorType);
    return compressor.compress(snapshot, maxTokens);
  }

  /**
   * Get a specific slice of context
   */
  async getContextSlice(
    sessionId: string,
    memoryTypes: ('session' | 'persistent' | 'derived')[],
    maxTokens: number
  ): Promise<ContextSlice> {
    const snapshot = await this.memory.getSnapshot(sessionId, maxTokens);

    // Compress to fit
    const compressor = createCompressor(this.config.compressionStrategy);
    const compactSnapshot: MemorySnapshot = {
      session: memoryTypes.includes('session') ? snapshot.session : [],
      persistent: memoryTypes.includes('persistent') ? snapshot.persistent : [],
      derived: memoryTypes.includes('derived') ? snapshot.derived : [],
      totalTokens: snapshot.totalTokens
    };

    return compressor.compress(compactSnapshot, maxTokens);
  }

  /**
   * Get context engine statistics
   */
  getStats(): ContextEngineStats {
    return { ...this.stats };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ContextEngineConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      router: config.router 
        ? { ...this.config.router!, ...config.router }
        : this.config.router,
      prioritizer: config.prioritizer
        ? { ...this.config.prioritizer!, ...config.prioritizer }
        : this.config.prioritizer
    } as Required<ContextEngineConfig>;

    this.rebuildComponents();
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextEngineConfig {
    return { ...this.config };
  }

  /**
   * Build memory query from context request
   */
  private buildMemoryQuery(request: ContextRequest): MemoryQuery {
    const query: MemoryQuery = {
      text: request.query,
      embedding: request.embedding,
      sessionId: request.sessionId,
      sessionIds: request.sessionIds,
      userId: request.userId,
    };

    // Add filters
    if (request.filters) {
      query.tags = request.filters.tags;
      query.type = request.filters.memoryTypes as MemoryQuery['type'];
      query.dateRange = request.filters.dateRange;
      query.minImportance = request.filters.minImportance;
    }

    return query;
  }

  /**
   * Aggregate context from multiple sessions
   */
  private async aggregateMultiSession(request: ContextRequest, maxTokens: number): Promise<MemorySnapshot> {
    const sessionIds = request.sessionIds ?? [request.sessionId];
    const userId = request.userId ?? 'default';
    
    // Query memory for each session
    const allEntries: { entry: MemoryEntry; sessionId: string }[] = [];
    
    for (const sessionId of sessionIds.slice(0, this.config.maxSessions)) {
      try {
        const snapshot = await this.memory.getSnapshot(sessionId, maxTokens / sessionIds.length);
        
        for (const entry of snapshot.session) {
          allEntries.push({ entry, sessionId });
        }
        for (const entry of snapshot.persistent) {
          allEntries.push({ entry, sessionId });
        }
        for (const entry of snapshot.derived) {
          allEntries.push({ entry, sessionId });
        }
      } catch {
        // Skip failed sessions
        continue;
      }
    }

    // Prioritize across all sessions
    const entries = Array.from(
      new Map(allEntries.map(({ entry }) => [entry.id, entry] as const)).values()
    );
    const prioritized = await this.prioritizer.prioritize(entries, {
      sessionId: request.sessionId,
      userId,
      limit: this.config.maxEntriesPerSession
    });

    return this.rebuildSnapshot(prioritized, maxTokens);
  }

  /**
   * Rebuild the router and prioritizer using the current configuration.
   */
  private rebuildComponents(): void {
    const routerConfig: Partial<RouterConfig> = {
      defaultCompressor: this.strategyToCompressorType(this.config.compressionStrategy),
      simpleTokenBudget: this.config.simpleTokenBudget,
      complexTokenBudget: this.config.complexTokenBudget,
      complexityThreshold: this.config.router?.complexityThreshold ?? 3,
      enableMultiSession: this.config.enableMultiSession,
      maxSessions: this.config.maxSessions
    };
    this.router = createContextRouter(this.memory, routerConfig);

    const scorerConfig: Partial<ScorerConfig> = {
      weights: {
        recency: this.config.prioritizer?.recency ?? 0.3,
        importance: this.config.prioritizer?.importance ?? 0.25,
        relevance: this.config.prioritizer?.relevance ?? 0.25,
        frequency: this.config.prioritizer?.frequency ?? 0.1,
        diversity: this.config.prioritizer?.diversity ?? 0.1
      }
    };
    this.prioritizer = createPrioritizer(scorerConfig);
  }

  /**
   * Convert retrieved entries into a memory snapshot.
   */
  private snapshotFromEntries(entries: MemoryEntry[]): MemorySnapshot {
    const deduped = new Map<string, MemoryEntry>();
    for (const entry of entries) {
      deduped.set(entry.id, entry);
    }

    const session: MemoryEntry[] = [];
    const persistent: MemoryEntry[] = [];
    const derived: MemoryEntry[] = [];

    for (const entry of deduped.values()) {
      switch (entry.type) {
        case 'session':
          session.push(entry);
          break;
        case 'persistent':
          persistent.push(entry);
          break;
        case 'derived':
          derived.push(entry);
          break;
      }
    }

    return {
      session,
      persistent,
      derived,
      totalTokens: Array.from(deduped.values()).reduce(
        (total, entry) => total + Math.ceil(entry.content.length * 0.25),
        0
      )
    };
  }

  /**
   * Filter retrieved entries using vector search results.
   */
  private async filterEntriesByVectorMatches(entries: MemoryEntry[], embedding: number[]): Promise<MemoryEntry[]> {
    if (!this.vectorIndex) {
      return entries;
    }

    const matches = await this.vectorIndex.search(embedding, this.config.maxEntriesPerSession);
    if (matches.length === 0) {
      return [];
    }

    const matchedIds = new Set(matches);
    return matches
      .map(id => entries.find(entry => entry.id === id))
      .filter((entry): entry is MemoryEntry => entry !== undefined && matchedIds.has(entry.id));
  }

  /**
   * Filter a snapshot by vector matches while preserving vector rank.
   */
  private async filterSnapshotByVectorMatches(snapshot: MemorySnapshot, embedding: number[]): Promise<MemorySnapshot> {
    const entries = [...snapshot.session, ...snapshot.persistent, ...snapshot.derived];
    const filteredEntries = await this.filterEntriesByVectorMatches(entries, embedding);
    return filteredEntries.length > 0 ? this.snapshotFromEntries(filteredEntries) : snapshot;
  }

  /**
   * Filter a snapshot by request filters.
   */
  private filterSnapshotByFilters(
    snapshot: MemorySnapshot,
    filters: NonNullable<ContextRequest['filters']>
  ): MemorySnapshot {
    const matchesFilters = (entry: MemoryEntry): boolean => {
      if (filters.tags && filters.tags.length > 0) {
        const tags = entry.metadata.tags ?? [];
        if (!filters.tags.every(tag => tags.includes(tag))) {
          return false;
        }
      }

      if (filters.memoryTypes && filters.memoryTypes.length > 0) {
        if (!filters.memoryTypes.includes(entry.type)) {
          return false;
        }
      }

      if (filters.dateRange) {
        const createdAt = new Date(entry.metadata.createdAt).getTime();
        const start = filters.dateRange.start.getTime();
        const end = filters.dateRange.end.getTime();
        if (createdAt < start || createdAt > end) {
          return false;
        }
      }

      if (filters.minImportance !== undefined) {
        if ((entry.metadata.importance ?? 0.5) < filters.minImportance) {
          return false;
        }
      }

      return true;
    };

    return this.snapshotFromEntries([
      ...snapshot.session.filter(matchesFilters),
      ...snapshot.persistent.filter(matchesFilters),
      ...snapshot.derived.filter(matchesFilters)
    ]);
  }

  /**
   * Rebuild a memory snapshot from prioritized entries
   */
  private rebuildSnapshot(entries: MemoryEntry[], maxTokens: number): MemorySnapshot {
    // Allocate token budget by type
    const sessionBudget = Math.floor(maxTokens * 0.4);
    const persistentBudget = Math.floor(maxTokens * 0.4);
    const derivedBudget = Math.floor(maxTokens * 0.2);

    const session: MemoryEntry[] = [];
    const persistent: MemoryEntry[] = [];
    const derived: MemoryEntry[] = [];
    
    let sessionTokens = 0;
    let persistentTokens = 0;
    let derivedTokens = 0;

    const estimateTokens = (content: string): number => Math.ceil(content.length * 0.25);

    for (const entry of entries) {
      const tokens = estimateTokens(entry.content);
      
      switch (entry.type) {
        case 'session':
          if (sessionTokens + tokens <= sessionBudget) {
            session.push(entry);
            sessionTokens += tokens;
          }
          break;
        case 'persistent':
          if (persistentTokens + tokens <= persistentBudget) {
            persistent.push(entry);
            persistentTokens += tokens;
          }
          break;
        case 'derived':
          if (derivedTokens + tokens <= derivedBudget) {
            derived.push(entry);
            derivedTokens += tokens;
          }
          break;
      }
    }

    return {
      session,
      persistent,
      derived,
      totalTokens: sessionTokens + persistentTokens + derivedTokens
    };
  }

  /**
   * Convert CompressionStrategy to CompressorType
   */
  private strategyToCompressorType(strategy: CompressionStrategy): CompressorType {
    switch (strategy) {
      case CompressionStrategy.TRUNCATE:
        return CompressorType.TRUNCATE;
      case CompressionStrategy.SUMMARIZE:
        return CompressorType.SUMMARIZE;
      case CompressionStrategy.HYBRID:
        return CompressorType.HYBRID;
      default:
        return CompressorType.TRUNCATE;
    }
  }
}

/**
 * Factory function to create a ContextEngineService
 */
export function createContextEngineService(
  memory: Memory,
  vectorIndex?: MemoryIndex,
  config?: Partial<ContextEngineConfig>
): ContextEngineService {
  return new DefaultContextEngineService(memory, vectorIndex, config);
}
