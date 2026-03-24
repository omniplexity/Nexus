/**
 * Context Router Implementation
 * 
 * Routes context through appropriate processing pipelines based on query characteristics.
 */

import { Memory, MemoryQuery, MemorySnapshot, ContextSlice, ContextCompressor, MemoryType, MemoryEntry } from '../../../../core/contracts/memory';
import { createCompressor, CompressorType } from '../compressor/index.js';

/**
 * Query classification
 */
export enum QueryType {
  SIMPLE = 'simple',           // Basic retrieval
  COMPLEX = 'complex',         // Multi-faceted query
  TOOL_HEAVY = 'tool_heavy',   // Tool-dependent
  MULTI_SESSION = 'multi_session' // Cross-session context
}

/**
 * Router configuration
 */
export interface RouterConfig {
  /**
   * Default compressor type
   */
  defaultCompressor: CompressorType;
  
  /**
   * Token budget for simple queries
   */
  simpleTokenBudget: number;
  
  /**
   * Token budget for complex queries
   */
  complexTokenBudget: number;
  
  /**
   * Threshold for complex query classification
   */
  complexityThreshold: number;
  
  /**
   * Enable multi-session support
   */
  enableMultiSession: boolean;
  
  /**
   * Maximum sessions to aggregate
   */
  maxSessions: number;
}

/**
 * Default router configuration
 */
const DEFAULT_CONFIG: Required<RouterConfig> = {
  defaultCompressor: CompressorType.TRUNCATE,
  simpleTokenBudget: 2000,
  complexTokenBudget: 4000,
  complexityThreshold: 3,
  enableMultiSession: true,
  maxSessions: 5
};

/**
 * Routing result
 */
export interface RoutingResult {
  queryType: QueryType;
  tokenBudget: number;
  compressor: ContextCompressor;
  requiresPrioritization: boolean;
  requiresMultiSession: boolean;
  options: Record<string, unknown>;
}

/**
 * Context router implementation
 */
export class ContextRouter {
  private config: Required<RouterConfig>;
  private memory: Memory;
  private compressorCache: Map<string, ContextCompressor> = new Map();
  private queryTypeCounts: Map<QueryType, number> = new Map();

  constructor(memory: Memory, config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memory = memory;
    
    // Initialize query type counts
    for (const type of Object.values(QueryType)) {
      this.queryTypeCounts.set(type, 0);
    }
  }

  /**
   * Classify query type
   */
  private classifyQuery(query: MemoryQuery): QueryType {
    let complexityScore = 0;

    // Check for multi-session
    if (this.config.enableMultiSession && query.sessionId && query.userId) {
      complexityScore += 2;
    }

    // Check for tags (suggests filtering)
    if (query.tags && query.tags.length > 0) {
      complexityScore++;
    }

    // Check for embedding (suggests semantic search)
    if (query.embedding) {
      complexityScore++;
    }

    // Check for multiple types
    if (query.type && Array.isArray(query.type) && query.type.length > 1) {
      complexityScore++;
    }

    // Check for date range
    if (query.dateRange) {
      complexityScore++;
    }

    // Check for importance threshold
    if (query.minImportance !== undefined) {
      complexityScore++;
    }

    // Classify based on complexity
    if (complexityScore >= this.config.complexityThreshold) {
      return QueryType.COMPLEX;
    }

    return QueryType.SIMPLE;
  }

  /**
   * Get or create compressor
   */
  private getCompressor(type: CompressorType): ContextCompressor {
    const key = type;
    if (!this.compressorCache.has(key)) {
      this.compressorCache.set(key, createCompressor(type));
    }
    return this.compressorCache.get(key)!;
  }

  /**
   * Determine routing
   */
  route(query: MemoryQuery): RoutingResult {
    const queryType = this.classifyQuery(query);
    
    // Track query type for statistics
    const currentCount = this.queryTypeCounts.get(queryType) ?? 0;
    this.queryTypeCounts.set(queryType, currentCount + 1);
    
    // Determine token budget
    let tokenBudget: number;
    switch (queryType) {
      case QueryType.COMPLEX:
        tokenBudget = this.config.complexTokenBudget;
        break;
      case QueryType.MULTI_SESSION:
        tokenBudget = this.config.complexTokenBudget * 1.5;
        break;
      default:
        tokenBudget = this.config.simpleTokenBudget;
    }

    // Determine if prioritization needed
    const requiresPrioritization = queryType === QueryType.COMPLEX || 
      (query.text !== undefined) ||
      (query.embedding !== undefined);

    // Determine if multi-session needed
    const requiresMultiSession = queryType === QueryType.MULTI_SESSION ||
      (this.config.enableMultiSession && query.userId && !query.sessionId);

    return {
      queryType,
      tokenBudget,
      compressor: this.getCompressor(this.config.defaultCompressor),
      requiresPrioritization,
      requiresMultiSession: Boolean(requiresMultiSession),
      options: {
        maxSessions: this.config.maxSessions
      }
    };
  }

  /**
   * Process query through the appropriate pipeline
   */
  async process(query: MemoryQuery): Promise<ContextSlice> {
    const routing = this.route(query);

    // Get memory snapshot
    const sessionId = query.sessionId || 'default';
    let snapshot = await this.memory.getSnapshot(sessionId, routing.tokenBudget);

    // Handle multi-session if needed
    if (routing.requiresMultiSession && query.userId) {
      snapshot = await this.aggregateSessions(query.userId, routing.tokenBudget, routing.options.maxSessions as number);
    }

    // Compress to fit token budget
    const slice = await routing.compressor.compress(snapshot, routing.tokenBudget);

    return slice;
  }

  /**
   * Aggregate context from multiple sessions
   * 
   * Queries all sessions for the user, sorts by recency and relevance,
   * and builds a snapshot respecting the token budget.
   * 
   * SECURITY NOTE: By default (when no sessionIds provided), this method
   * ONLY returns memories from the current/default session. This prevents
   * unintended cross-session data exposure. To aggregate across multiple
   * sessions, you MUST explicitly pass the sessionIds array.
   * 
   * @param userId - The user ID to aggregate sessions for
   * @param maxTokens - Maximum tokens to include in the snapshot
   * @param maxSessions - Maximum number of sessions to aggregate
   * @param sessionIds - Optional explicit list of session IDs to aggregate.
   *                     If not provided, only default session is used.
   */
  private async aggregateSessions(_userId: string, maxTokens: number, maxSessions: number = 5, sessionIds?: string[]): Promise<MemorySnapshot> {
    // SECURITY: Default to current session only if no explicit session IDs provided
    // This prevents unintended cross-session data exposure
    const targetSessionIds = sessionIds && sessionIds.length > 0 
      ? sessionIds.slice(0, maxSessions) 
      : [];

    // If no explicit session IDs, only get current/default session memories
    if (targetSessionIds.length === 0) {
      const defaultSnapshot = await this.memory.getSnapshot('default', maxTokens);
      return defaultSnapshot;
    }

    // Aggregate memories only from authorized sessions
    const allEntries: { entry: MemoryEntry; sessionId: string }[] = [];

    for (const sessionId of targetSessionIds) {
      try {
        const snapshot = await this.memory.getSnapshot(sessionId, maxTokens);
        // Collect entries from each category with their session ID
        for (const entry of snapshot.session) {
          allEntries.push({ entry, sessionId });
        }
        for (const entry of snapshot.persistent) {
          allEntries.push({ entry, sessionId });
        }
        for (const entry of snapshot.derived) {
          allEntries.push({ entry, sessionId });
        }
      } catch (error) {
        // Log but continue - don't fail entire aggregation for one session
        console.warn(`Failed to get snapshot for session ${sessionId}:`, error);
      }
    }

    // Separate entries by type
    const sessionEntries: MemoryEntry[] = [];
    const persistentEntries: MemoryEntry[] = [];
    const derivedEntries: MemoryEntry[] = [];

    for (const { entry } of allEntries) {
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

    // Sort each category by a combination of recency and importance
    const sortByRelevance = (a: MemoryEntry, b: MemoryEntry) => {
      const aImportance = a.metadata.importance ?? 0.5;
      const bImportance = b.metadata.importance ?? 0.5;
      const aTime = new Date(a.metadata.createdAt).getTime();
      const bTime = new Date(b.metadata.createdAt).getTime();
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      // Combine importance (60%) and recency (40%) for relevance score
      // Use time difference instead of fractional division for accuracy
      const aRecency = Math.max(0, 1 - (now - aTime) / thirtyDays);
      const bRecency = Math.max(0, 1 - (now - bTime) / thirtyDays);
      const aScore = aImportance * 0.6 + aRecency * 0.4;
      const bScore = bImportance * 0.6 + bRecency * 0.4;
      return bScore - aScore;
    };

    sessionEntries.sort(sortByRelevance);
    persistentEntries.sort(sortByRelevance);
    derivedEntries.sort(sortByRelevance);

    // Token estimation helper
    const estimateTokens = (content: string): number => {
      return Math.ceil(content.length * 0.25); // 4 chars per token
    };

    // Build snapshot respecting token budget allocations:
    // - 40% for session memories
    // - 40% for persistent memories
    // - 20% for derived memories
    const sessionBudget = Math.floor(maxTokens * 0.4);
    const persistentBudget = Math.floor(maxTokens * 0.4);
    const derivedBudget = Math.floor(maxTokens * 0.2);

    // Trim session entries to budget
    let sessionTokens = 0;
    const trimmedSession: MemoryEntry[] = [];
    for (const entry of sessionEntries) {
      const tokens = estimateTokens(entry.content);
      if (sessionTokens + tokens > sessionBudget) break;
      trimmedSession.push(entry);
      sessionTokens += tokens;
    }

    // Trim persistent entries to budget
    let persistentTokens = 0;
    const trimmedPersistent: MemoryEntry[] = [];
    for (const entry of persistentEntries) {
      const tokens = estimateTokens(entry.content);
      if (persistentTokens + tokens > persistentBudget) break;
      trimmedPersistent.push(entry);
      persistentTokens += tokens;
    }

    // Trim derived entries to budget
    let derivedTokens = 0;
    const trimmedDerived: MemoryEntry[] = [];
    for (const entry of derivedEntries) {
      const tokens = estimateTokens(entry.content);
      if (derivedTokens + tokens > derivedBudget) break;
      trimmedDerived.push(entry);
      derivedTokens += tokens;
    }

    return {
      session: trimmedSession,
      persistent: trimmedPersistent,
      derived: trimmedDerived,
      totalTokens: sessionTokens + persistentTokens + derivedTokens
    };
  }

  /**
   * Get router statistics
   */
  getStats(): { queryTypes: Record<QueryType, number> } {
    const queryTypes: Record<QueryType, number> = {
      [QueryType.SIMPLE]: 0,
      [QueryType.COMPLEX]: 0,
      [QueryType.TOOL_HEAVY]: 0,
      [QueryType.MULTI_SESSION]: 0
    };
    
    for (const [type, count] of this.queryTypeCounts) {
      queryTypes[type] = count;
    }
    
    return { queryTypes };
  }
}

/**
 * Factory function to create context router
 */
export function createContextRouter(memory: Memory, config?: Partial<RouterConfig>): ContextRouter {
  return new ContextRouter(memory, config);
}
