/**
 * Memory Node Implementation
 * 
 * Handles memory operations (retrieve, store, delete, search, archive) as part of the DAG execution flow.
 * Supports injected memory store and vector index for shared instance usage.
 */

import { randomUUID } from 'crypto';

import type { MemoryEntry, MemoryQuery, MemorySnapshot, MemoryType as MemoryTypeEnum } from '@nexus/core/contracts/memory';
import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';
import { InMemoryStore, VectorIndex } from '@nexus/systems-memory/src/index.js';

/**
 * Memory node for memory operations
 */
export class MemoryNode implements Node {
  public id: string;
  public type: NodeType = NodeType.MEMORY;
  public name: string;
  public config: {
    timeout?: number;
    retry?: {
      maxAttempts: number;
      backoff: 'linear' | 'exponential' | 'fixed';
      backoffMs: number;
      retryableErrors?: string[];
    };
    cache?: boolean;
    condition?: string;
    priority?: number;
  };
  
  private operation: 'retrieve' | 'store' | 'delete' | 'search' | 'archive';
  private memoryType?: string;
  private query?: string;
  private priority?: number;
  private limit?: number;
  private memoryStore: InMemoryStore;
  private vectorIndex: VectorIndex | null = null;
  private static mockEmbeddingWarningShown = false;

  constructor(config: {
    id: string;
    name: string;
    operation: 'retrieve' | 'store' | 'delete' | 'search' | 'archive';
    memoryType?: string;
    query?: string;
    priority?: number;
    limit?: number;
    config?: {
      timeout?: number;
      retry?: {
        maxAttempts: number;
        backoff: 'linear' | 'exponential' | 'fixed';
        backoffMs: number;
        retryableErrors?: string[];
      };
      cache?: boolean;
      condition?: string;
      priority?: number;
    };
    initialMemory?: MemorySnapshot;
    memoryStore?: InMemoryStore; // Allow injected store for shared instance
    vectorIndex?: VectorIndex; // Optional vector index for semantic search
  }) {
    this.id = config.id;
    this.name = config.name;
    this.operation = config.operation;
    this.memoryType = config.memoryType;
    this.query = config.query;
    this.priority = config.priority;
    this.limit = config.limit;
    this.config = {
      timeout: 5000,
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        backoffMs: 500
      },
      cache: false,
      ...config.config
    };
    // Use injected store or create new one (for backward compatibility)
    this.memoryStore = config.memoryStore ?? new InMemoryStore();
    this.vectorIndex = config.vectorIndex ?? null;
  }

  /**
   * Execute the memory node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      let result: unknown = null;
      
      switch (this.operation) {
        case 'retrieve':
          result = await this.retrieveMemory(input);
          break;
        case 'store':
          result = await this.storeMemory(input);
          break;
        case 'delete':
          result = await this.deleteMemory(input);
          break;
        case 'search':
          result = await this.searchMemory(input);
          break;
        case 'archive':
          result = await this.archiveMemory(input);
          break;
        default:
          throw new Error(`Unknown memory operation: ${this.operation}`);
      }
      
      return {
        nodeId: this.id,
        data: result,
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: 0, // Memory operations don't consume LLM tokens
          cacheHit: false
        }
      };
    } catch (error) {
      return {
        nodeId: this.id,
        data: null,
        status: NodeStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          startTime,
          endTime: new Date()
        }
      };
    }
  }

  /**
   * Validate node configuration
   */
  validate(): boolean {
    return !!this.id && !!this.operation;
  }

  /**
   * Get the node's dependencies
   * Memory nodes typically don't have hardcoded dependencies
   */
  getDependencies(): string[] {
    return [];
  }

  /**
   * Clone the node for reuse
   */
  clone(): Node {
    return new MemoryNode({
      id: this.id,
      name: this.name,
      operation: this.operation,
      memoryType: this.memoryType,
      query: this.query,
      priority: this.priority,
      limit: this.limit,
      config: this.config,
      memoryStore: this.memoryStore,
      vectorIndex: this.vectorIndex ?? undefined
    });
  }

  /**
   * Extract session ID from input context
   */
  private getSessionId(input: NodeInput): string | undefined {
    return input.context?.sessionId as string | undefined;
  }

  /**
   * Extract user ID from input context
   */
  private getUserId(input: NodeInput): string | undefined {
    return input.context?.userId as string | undefined;
  }

  /**
   * Extract memory ID from input data or context
   */
  private getMemoryId(input: NodeInput): string | undefined {
    return (input.data as string) || (input.context?.memoryId as string | undefined);
  }

  /**
   * Extract tags from input context
   */
  private getTags(input: NodeInput): string[] | undefined {
    return input.context?.tags as string[] | undefined;
  }

  /**
   * Retrieve memory based on query
   */
  private async retrieveMemory(input: NodeInput): Promise<unknown> {
    // Build query from node config and input
    const query: MemoryQuery = {
      text: this.query || (input.data as string),
      limit: this.limit || 20
    };

    // Add memory type filter if specified
    if (this.memoryType) {
      query.type = this.memoryType as MemoryTypeEnum;
    }

    // Add session ID from context if available
    const sessionId = this.getSessionId(input);
    if (sessionId) {
      query.sessionId = sessionId;
    }

    // Add user ID from context if available
    const userId = this.getUserId(input);
    if (userId) {
      query.userId = userId;
    }

    const result = await this.memoryStore.retrieve(query);

    return {
      operation: 'retrieve',
      memoryType: this.memoryType,
      query: this.query,
      timestamp: new Date().toISOString(),
      data: {
        entries: result.entries,
        total: result.total,
        tokens: result.tokens || 0
      }
    };
  }

  /**
   * Store memory
   */
  private async storeMemory(input: NodeInput): Promise<unknown> {
    // Build memory entry from input
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${randomUUID().substring(0, 8)}`,
      type: (this.memoryType as MemoryTypeEnum) || 'session',
      content: typeof input.data === 'string' ? input.data : JSON.stringify(input.data),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'orchestration',
        importance: 0.5
      }
    };

    // Add session ID from context if available
    const sessionId = this.getSessionId(input);
    if (sessionId) {
      entry.sessionId = sessionId;
    }

    // Add user ID from context if available
    const userId = this.getUserId(input);
    if (userId) {
      entry.userId = userId;
    }

    // Add tags from context if available
    const tags = this.getTags(input);
    if (tags) {
      entry.metadata.tags = tags;
    }

    await this.memoryStore.store(entry);

    return {
      operation: 'store',
      memoryType: this.memoryType,
      timestamp: new Date().toISOString(),
      data: {
        message: `Stored memory item of type: ${this.memoryType || 'session'}`,
        itemId: entry.id
      }
    };
  }

  /**
   * Delete memory
   */
  private async deleteMemory(input: NodeInput): Promise<unknown> {
    // Get the memory ID to delete from data or context
    const memoryId = this.getMemoryId(input);
    const sessionId = this.getSessionId(input);

    if (memoryId) {
      // Delete specific memory by ID
      await this.memoryStore.delete(memoryId);
      
      return {
        operation: 'delete',
        memoryType: this.memoryType,
        query: this.query,
        timestamp: new Date().toISOString(),
        data: {
          message: `Deleted memory item: ${memoryId}`,
          count: 1
        }
      };
    } else if (sessionId) {
      // Clear all memories for a session
      const count = await this.memoryStore.clear(sessionId);
      
      return {
        operation: 'delete',
        memoryType: this.memoryType,
        sessionId,
        timestamp: new Date().toISOString(),
        data: {
          message: `Cleared ${count} memory items for session: ${sessionId}`,
          count
        }
      };
    } else {
      // No specific ID or session - return error
      throw new Error('Cannot delete memory: no memory ID or session ID provided');
    }
  }

  /**
   * Search memory using vector similarity
   */
  private async searchMemory(input: NodeInput): Promise<unknown> {
    const queryText = this.query || (input.data as string) || '';
    const limit = this.limit || 20;
    
    // Use vector index if available for semantic search
    if (this.vectorIndex && queryText) {
      // Generate mock embedding for the query
      // In a real implementation, this would use an embedding model
      const embedding = this.generateMockEmbedding(queryText);
      
      const memoryIds = await this.vectorIndex.search(embedding, limit);
      
      return {
        operation: 'search',
        query: queryText,
        timestamp: new Date().toISOString(),
        data: {
          type: 'semantic',
          memoryIds,
          count: memoryIds.length
        }
      };
    }
    
    // Fall back to text-based search via memory store
    const query: MemoryQuery = {
      text: queryText,
      limit,
      type: this.memoryType as MemoryTypeEnum
    };
    
    const sessionId = this.getSessionId(input);
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    const result = await this.memoryStore.retrieve(query);
    
    return {
      operation: 'search',
      query: queryText,
      timestamp: new Date().toISOString(),
      data: {
        type: 'text',
        entries: result.entries,
        total: result.total
      }
    };
  }

  /**
   * Archive old memories
   */
  private async archiveMemory(input: NodeInput): Promise<unknown> {
    // Get archive date from input data or use default (30 days ago)
    const olderThanDays = (input.data as Record<string, unknown>)?.olderThanDays as number ?? 30;
    const olderThan = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    // Use archive method on memory store if available
    if (typeof (this.memoryStore as { archive?: (date: Date) => Promise<number> }).archive === 'function') {
      const count = await (this.memoryStore as { archive: (date: Date) => Promise<number> }).archive(olderThan);
      
      return {
        operation: 'archive',
        olderThan: olderThan.toISOString(),
        timestamp: new Date().toISOString(),
        data: {
          message: `Archived ${count} memories older than ${olderThanDays} days`,
          count
        }
      };
    }
    
    // Fallback: retrieve and delete old memories manually
    const query: MemoryQuery = {
      limit: 1000,
      dateRange: {
        start: new Date(0), // Beginning of time
        end: olderThan
      }
    };
    
    const result = await this.memoryStore.retrieve(query);
    let deletedCount = 0;
    
    for (const entry of result.entries) {
      try {
        await this.memoryStore.delete(entry.id);
        deletedCount++;
      } catch {
        // Skip entries that fail to delete
      }
    }
    
    return {
      operation: 'archive',
      olderThan: olderThan.toISOString(),
      timestamp: new Date().toISOString(),
      data: {
        message: `Archived ${deletedCount} memories older than ${olderThanDays} days`,
        count: deletedCount
      }
    };
  }

  /**
   * Generate a mock embedding for semantic search
   * 
   * WARNING: This is a placeholder implementation for development/testing only.
   * It uses a simple hash-based algorithm that produces deterministic but
   * semantically meaningless embeddings.
   * 
   * TODO: Replace with actual embedding model integration:
   * - Use @nexus/systems-models for production embeddings
   * - Integrate with OpenAI text-embedding-3-small or similar
   * - Consider caching embeddings for performance
   * 
   * @param text - Input text to generate embedding for
   * @returns Normalized 1536-dimensional embedding vector
   */
  private generateMockEmbedding(text: string): number[] {
    // Warn in production if mock embedding is being used
    if (process.env.NODE_ENV === 'production' && !MemoryNode.mockEmbeddingWarningShown) {
      console.warn(
        'WARNING: MemoryNode is using mock embeddings for semantic search. ' +
        'This is not suitable for production use. Configure a real embedding model ' +
        'through the vectorIndex or embedding model provider.'
      );
      MemoryNode.mockEmbeddingWarningShown = true;
    }
    
    // Generate a deterministic mock embedding based on text
    const dimension = 1536; // Standard for text-embedding-3-small
    const embedding: number[] = [];
    
    // Use a simple hash-based approach for deterministic results
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Generate pseudo-random values based on hash
    const seed = Math.abs(hash);
    let random = seed;
    for (let i = 0; i < dimension; i++) {
      random = (random * 1103515245 + 12345) & 0x7fffffff;
      embedding.push((random / 0x7fffffff) * 2 - 1);
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
}

/**
 * Factory function for creating memory nodes
 */
export function createMemoryNode(config: {
  id: string;
  name: string;
  operation: 'retrieve' | 'store' | 'delete' | 'search' | 'archive';
  memoryType?: string;
  query?: string;
  priority?: number;
  limit?: number;
  config?: {
    timeout?: number;
    retry?: {
      maxAttempts: number;
      backoff: 'linear' | 'exponential' | 'fixed';
      backoffMs: number;
      retryableErrors?: string[];
    };
    cache?: boolean;
    condition?: string;
    priority?: number;
  };
  initialMemory?: MemorySnapshot;
  memoryStore?: InMemoryStore;
  vectorIndex?: VectorIndex;
}): MemoryNode {
  return new MemoryNode(config);
}