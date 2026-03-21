/**
 * Memory Contracts for Nexus
 * 
 * Defines the memory and context management interfaces
 * for the context engine subsystem.
 */

/**
 * Memory type enumeration
 */
export enum MemoryType {
  EPHEMERAL = 'ephemeral',    // Current task only
  SESSION = 'session',        // Conversation session
  PERSISTENT = 'persistent', // Long-term storage
  DERIVED = 'derived'        // Generated summaries
}

/**
 * Memory entry status
 */
export enum MemoryStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  EXPIRED = 'expired'
}

/**
 * Memory metadata
 */
export interface MemoryMetadata {
  createdAt: Date;
  updatedAt: Date;
  accessedAt?: Date;
  expiresAt?: Date;
  tags?: string[];
  source?: string;
  importance?: number;
  embedding?: number[];
}

/**
 * Memory entry
 */
export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  sessionId?: string;
  userId?: string;
}

/**
 * Memory query for retrieval
 */
export interface MemoryQuery {
  text?: string;
  embedding?: number[];
  type?: MemoryType | MemoryType[];
  sessionId?: string;
  userId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  minImportance?: number;
}

/**
 * Memory result from retrieval
 */
export interface MemoryResult {
  entries: MemoryEntry[];
  total: number;
  query: MemoryQuery;
  tokens?: number;
}

/**
 * Memory snapshot for execution context
 */
export interface MemorySnapshot {
  session: MemoryEntry[];
  persistent: MemoryEntry[];
  derived: MemoryEntry[];
  totalTokens: number;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
  maxTokensPerSession?: number;
  maxTokensPersistent?: number;
  maxEntriesPerSession?: number;
  defaultTTL?: number;
  embeddingModel?: string;
  similarityThreshold?: number;
}

/**
 * Core memory interface
 * @version 1.0.0
 */
export interface Memory {
  /**
   * Retrieve memories matching the query
   */
  retrieve(query: MemoryQuery): Promise<MemoryResult>;
  
  /**
   * Store a memory entry
   */
  store(entry: MemoryEntry): Promise<void>;
  
  /**
   * Update an existing memory entry
   */
  update(id: string, updates: Partial<MemoryEntry>): Promise<void>;
  
  /**
   * Delete a memory entry
   */
  delete(id: string): Promise<void>;
  
  /**
   * Clear memories for a session
   */
  clear(sessionId: string): Promise<void>;
  
  /**
   * Get a snapshot of current memory state
   */
  getSnapshot(sessionId: string, maxTokens: number): Promise<MemorySnapshot>;
  
  /**
   * Archive old memories
   */
  archive(olderThan: Date): Promise<number>;
  
  /**
   * Get memory statistics
   */
  getStats(): Promise<MemoryStats>;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  totalTokens: number;
  averageEntrySize: number;
  sessionsActive: number;
}

/**
 * Context slice for LLM prompts
 */
export interface ContextSlice {
  system: string;
  conversation: string;
  tools: string;
  totalTokens: number;
  memoryIds: string[];
}

/**
 * Context compressor interface
 */
export interface ContextCompressor {
  /**
   * Compress context to fit within token budget
   */
  compress(memory: MemorySnapshot, maxTokens: number): Promise<ContextSlice>;
  
  /**
   * Expand compressed context
   */
  expand(slice: ContextSlice): Promise<MemorySnapshot>;
}

/**
 * Memory index for fast retrieval
 */
export interface MemoryIndex {
  /**
   * Add entry to index
   */
  index(entry: MemoryEntry): Promise<void>;
  
  /**
   * Remove from index
   */
  remove(id: string): Promise<void>;
  
  /**
   * Search by embedding similarity
   */
  search(embedding: number[], limit: number): Promise<string[]>;
  
  /**
   * Search by text/keywords
   */
  searchByText(text: string, limit: number): Promise<string[]>;
}

/**
 * Memory validator interface
 */
export interface MemoryValidator {
  /**
   * Validate memory entry
   */
  validate(entry: MemoryEntry): boolean;
  
  /**
   * Check if memory exceeds quotas
   */
  checkQuotas(sessionId: string): Promise<{ valid: boolean; reason?: string }>;
}
