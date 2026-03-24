/**
 * Vector Index Implementation
 * 
 * Provides vector-based similarity search for memory retrieval.
 * Uses cosine similarity for in-memory embeddings.
 */

import type { MemoryEntry } from '../../../core/contracts/memory';

import type { InternalMemoryEntry } from './types.js';

/**
 * Vector embedding (array of numbers)
 */
export type Embedding = number[];

/**
 * Configuration for vector index
 */
export interface VectorIndexConfig {
  /**
   * Similarity threshold for search results (0-1)
   */
  similarityThreshold: number;
  
  /**
   * Maximum number of results to return
   */
  maxResults: number;
  
  /**
   * Enable approximate nearest neighbor (for large datasets)
   */
  useANN: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: VectorIndexConfig = {
  similarityThreshold: 0.7,
  maxResults: 20,
  useANN: false
};

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Vector index entry with embedding
 */
interface IndexedEntry {
  id: string;
  embedding: Embedding;
  entry: InternalMemoryEntry;
}

/**
 * In-memory vector index implementation
 */
export class VectorIndex {
  private entries: Map<string, IndexedEntry> = new Map();
  private config: VectorIndexConfig;

  constructor(config: Partial<VectorIndexConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add entry to the index
   */
  async index(entry: MemoryEntry): Promise<void> {
    if (!entry.embedding) {
      throw new Error(`Entry ${entry.id} has no embedding`);
    }

    const internalEntry: InternalMemoryEntry = {
      ...entry,
      tokenCount: Math.ceil(entry.content.length * 0.25),
      accessCount: 0,
      lastAccessedAt: new Date()
    } as InternalMemoryEntry;

    this.entries.set(entry.id, {
      id: entry.id,
      embedding: entry.embedding,
      entry: internalEntry
    });
  }

  /**
   * Remove entry from index
   */
  async remove(id: string): Promise<void> {
    this.entries.delete(id);
  }

  /**
   * Search by embedding similarity
   */
  async search(
    queryEmbedding: Embedding,
    limit?: number
  ): Promise<string[]> {
    const results: Array<{ id: string; similarity: number }> = [];

    for (const [id, indexed] of this.entries) {
      try {
        const similarity = cosineSimilarity(queryEmbedding, indexed.embedding);
        if (similarity >= this.config.similarityThreshold) {
          results.push({ id, similarity });
        }
      } catch (error) {
        // Skip entries with dimension mismatch
        console.warn(`Skipping entry ${id} due to embedding dimension mismatch`);
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Apply limit
    const maxResults = limit ?? this.config.maxResults;
    return results.slice(0, maxResults).map(r => r.id);
  }

  /**
   * Search by text/keywords
   * Simple keyword-based search
   */
  async searchByText(text: string, limit?: number): Promise<string[]> {
    const queryTerms = text.toLowerCase().split(/\s+/);
    const results: Array<{ id: string; score: number }> = [];

    for (const [id, indexed] of this.entries) {
      const content = indexed.entry.content.toLowerCase();
      let matches = 0;
      
      for (const term of queryTerms) {
        if (content.includes(term)) {
          matches++;
        }
      }

      if (matches > 0) {
        // Score based on proportion of matched terms
        const score = matches / queryTerms.length;
        results.push({ id, score });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    const maxResults = limit ?? this.config.maxResults;
    return results.slice(0, maxResults).map(r => r.id);
  }

  /**
   * Get entry by ID
   */
  get(id: string): InternalMemoryEntry | undefined {
    return this.entries.get(id)?.entry;
  }

  /**
   * Get all entries
   */
  getAll(): Map<string, InternalMemoryEntry> {
    const result = new Map<string, InternalMemoryEntry>();
    for (const [id, indexed] of this.entries) {
      result.set(id, indexed.entry);
    }
    return result;
  }

  /**
   * Get index statistics
   */
  getStats(): { size: number; dimensions: number | null } {
    const firstEntry = this.entries.values().next().value;
    return {
      size: this.entries.size,
      dimensions: firstEntry ? firstEntry.embedding.length : null
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Update embedding for existing entry
   */
  async updateEmbedding(id: string, embedding: Embedding): Promise<void> {
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`Entry ${id} not found in index`);
    }

    this.entries.set(id, {
      ...existing,
      embedding
    });
  }

  /**
   * Batch index multiple entries
   */
  async batchIndex(entries: MemoryEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.index(entry);
    }
  }

  /**
   * Batch remove multiple entries
   */
  async batchRemove(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.remove(id);
    }
  }
}

/**
 * Factory function to create a vector index
 */
export function createVectorIndex(config?: Partial<VectorIndexConfig>): VectorIndex {
  return new VectorIndex(config);
}

/**
 * Helper to generate mock embeddings for testing
 * In production, this would call an embedding model
 */
export function generateMockEmbedding(dimensions: number = 1536): Embedding {
  const embedding: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    embedding.push(Math.random() * 2 - 1);
  }
  return embedding;
}

/**
 * Normalize embedding vector to unit length
 */
export function normalizeEmbedding(embedding: Embedding): Embedding {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  return embedding.map(val => val / norm);
}