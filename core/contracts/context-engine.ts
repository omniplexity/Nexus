/**
 * Context Engine Contracts for Nexus
 * 
 * Defines the context engine service interfaces for preparing,
 * compressing, and managing context slices for LLM execution.
 */

import type { Memory, MemorySnapshot, ContextSlice, MemoryIndex } from './memory';

/**
 * Compression strategy types
 */
export enum CompressionStrategy {
  TRUNCATE = 'truncate',
  SUMMARIZE = 'summarize',
  HYBRID = 'hybrid'
}

/**
 * Context engine configuration
 */
export interface ContextEngineConfig {
  /**
   * Maximum tokens for session memory
   */
  maxTokensPerSession: number;
  
  /**
   * Maximum tokens for persistent memory
   */
  maxTokensPersistent: number;
  
  /**
   * Maximum entries per session
   */
  maxEntriesPerSession: number;
  
  /**
   * Default time-to-live in seconds
   */
  defaultTTL: number;
  
  /**
   * Similarity threshold for vector search
   */
  similarityThreshold: number;
  
  /**
   * Compression strategy to use
   */
  compressionStrategy: CompressionStrategy;
  
  /**
   * Default token budget for simple queries
   */
  simpleTokenBudget: number;
  
  /**
   * Default token budget for complex queries
   */
  complexTokenBudget: number;
  
  /**
   * Enable multi-session context aggregation
   */
  enableMultiSession: boolean;
  
  /**
   * Maximum sessions to aggregate
   */
  maxSessions: number;
  
  /**
   * Router configuration
   */
  router?: {
    complexityThreshold: number;
    defaultCompressor: CompressionStrategy;
  };
  
  /**
   * Prioritizer weights
   */
  prioritizer?: {
    recency: number;
    importance: number;
    relevance: number;
    frequency: number;
    diversity: number;
  };
}

/**
 * Default context engine configuration
 */
export const DEFAULT_CONTEXT_ENGINE_CONFIG: Required<ContextEngineConfig> = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7, // 7 days
  similarityThreshold: 0.7,
  compressionStrategy: CompressionStrategy.TRUNCATE,
  simpleTokenBudget: 2000,
  complexTokenBudget: 4000,
  enableMultiSession: true,
  maxSessions: 5,
  router: {
    complexityThreshold: 3,
    defaultCompressor: CompressionStrategy.TRUNCATE
  },
  prioritizer: {
    recency: 0.3,
    importance: 0.25,
    relevance: 0.25,
    frequency: 0.1,
    diversity: 0.1
  }
};

/**
 * Context request for preparing context
 */
export interface ContextRequest {
  /**
   * Session ID for the request
   */
  sessionId: string;
  
  /**
   * User ID (for multi-session)
   */
  userId?: string;
  
  /**
   * Query text for semantic search
   */
  query?: string;
  
  /**
   * Embedding vector for similarity search
   */
  embedding?: number[];
  
  /**
   * Additional query filters
   */
  filters?: {
    tags?: string[];
    memoryTypes?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    minImportance?: number;
  };
  
  /**
   * Maximum tokens to allocate
   */
  maxTokens?: number;
  
  /**
   * Force specific compression strategy
   */
  compressionStrategy?: CompressionStrategy;
  
  /**
   * Optional explicit list of session IDs for multi-session
   */
  sessionIds?: string[];
}

/**
 * Context engine statistics
 */
export interface ContextEngineStats {
  /**
   * Total context preparations
   */
  totalPreparations: number;
  
  /**
   * Cache hits
   */
  cacheHits: number;
  
  /**
   * Average context size (tokens)
   */
  averageContextSize: number;
  
  /**
   * Query type distribution
   */
  queryTypes: Record<string, number>;
  
  /**
   * Compression ratio statistics
   */
  compressionStats: {
    totalOriginalTokens: number;
    totalCompressedTokens: number;
    averageRatio: number;
  };
}

/**
 * Context engine service interface
 * 
 * Coordinates memory retrieval, routing, prioritization, and compression
 * to produce optimized context slices for LLM execution.
 * 
 * @version 1.0.0
 */
export interface ContextEngineService {
  /**
   * Prepare a context slice for execution
   * 
   * This is the main entry point that:
   * 1. Queries memory based on request
   * 2. Routes the request to determine processing pipeline
   * 3. Scores and prioritizes entries if needed
   * 4. Compresses to fit token budget
   * 5. Returns a ContextSlice ready for LLM use
   * 
   * @param request - The context request with query parameters
   * @returns Promise resolving to a ContextSlice
   */
  prepareContext(request: ContextRequest): Promise<ContextSlice>;
  
  /**
   * Compress an existing memory snapshot
   * 
   * @param snapshot - Memory snapshot to compress
   * @param maxTokens - Maximum tokens in output
   * @param strategy - Optional compression strategy override
   * @returns Promise resolving to compressed ContextSlice
   */
  compressContext(
    snapshot: MemorySnapshot, 
    maxTokens: number,
    strategy?: CompressionStrategy
  ): Promise<ContextSlice>;
  
  /**
   * Get a specific slice of context
   * 
   * @param sessionId - Session ID
   * @param memoryTypes - Types of memory to include
   * @param maxTokens - Maximum tokens
   * @returns Promise resolving to ContextSlice
   */
  getContextSlice(
    sessionId: string,
    memoryTypes: ('session' | 'persistent' | 'derived')[],
    maxTokens: number
  ): Promise<ContextSlice>;
  
  /**
   * Get context engine statistics
   * 
   * @returns ContextEngineStats with current statistics
   */
  getStats(): ContextEngineStats;
  
  /**
   * Update configuration at runtime
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<ContextEngineConfig>): void;
  
  /**
   * Get current configuration
   * 
   * @returns Current ContextEngineConfig
   */
  getConfig(): ContextEngineConfig;
}

/**
 * Context engine factory function type
 */
export type ContextEngineFactory = (
  memory: Memory,
  vectorIndex?: MemoryIndex,
  config?: Partial<ContextEngineConfig>
) => ContextEngineService;
