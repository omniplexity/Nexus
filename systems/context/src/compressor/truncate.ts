/**
 * Truncate Compression Strategy
 * 
 * Implements context compression by keeping the most recent entries
 * and discarding older ones to fit within token budget.
 */

import type {
  MemorySnapshot,
  ContextSlice,
  ContextCompressor,
  MemoryEntry
} from '../../../../core/contracts/memory';

/**
 * Configuration for truncate compression
 */
export interface TruncateConfig {
  /**
   * Ratio of token budget to allocate for each memory category
   */
  sessionRatio: number;
  persistentRatio: number;
  derivedRatio: number;
  
  /**
   * Whether to preserve the most recent entry even if over budget
   */
  preserveMostRecent: boolean;
}

/**
 * Default truncate configuration
 */
const DEFAULT_CONFIG: Required<TruncateConfig> = {
  sessionRatio: 0.4,
  persistentRatio: 0.4,
  derivedRatio: 0.2,
  preserveMostRecent: true
};

/**
 * Estimate tokens for content
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length * 0.25);
}

/**
 * Format entries as conversation string
 */
function formatEntries(entries: Array<{ content: string; metadata: { createdAt: Date } }>): string {
  if (entries.length === 0) return '';
  
  return entries
    .sort((a, b) => new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime())
    .map(e => e.content)
    .join('\n\n');
}

/**
 * Truncate compressor implementation
 * Keeps most recent entries to fit within token budget
 */
export class TruncateCompressor implements ContextCompressor {
  private config: Required<TruncateConfig>;

  constructor(config: Partial<TruncateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compress memory snapshot to fit within token budget
   */
  async compress(memory: MemorySnapshot, maxTokens: number): Promise<ContextSlice> {
    const sessionBudget = Math.floor(maxTokens * this.config.sessionRatio);
    const persistentBudget = Math.floor(maxTokens * this.config.persistentRatio);
    const derivedBudget = Math.floor(maxTokens * this.config.derivedRatio);

    // Truncate each category
    const truncatedSession = this.truncateEntries(memory.session, sessionBudget);
    const truncatedPersistent = this.truncateEntries(memory.persistent, persistentBudget);
    const truncatedDerived = this.truncateEntries(memory.derived, derivedBudget);

    // Format conversation string
    const conversation = [
      formatEntries(truncatedSession),
      formatEntries(truncatedPersistent),
      formatEntries(truncatedDerived)
    ].filter(Boolean).join('\n\n---\n\n');

    // Calculate total tokens
    const totalTokens = estimateTokens(conversation);

    // Collect memory IDs
    const memoryIds = [
      ...truncatedSession.map(e => 'session:' + (e as MemoryEntry).id),
      ...truncatedPersistent.map(e => 'persistent:' + (e as MemoryEntry).id),
      ...truncatedDerived.map(e => 'derived:' + (e as MemoryEntry).id)
    ];

    return {
      system: '', // System prompt handled separately
      conversation,
      tools: '',  // Tools handled separately
      totalTokens,
      memoryIds
    };
  }

  /**
   * Truncate entries to fit within token budget
   */
  private truncateEntries(
    entries: MemorySnapshot['session'],
    maxTokens: number
  ): typeof entries {
    if (entries.length === 0) return [];
    
    // Sort by createdAt (oldest first for truncation)
    const sorted = [...entries].sort(
      (a, b) => new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
    );

    let currentTokens = 0;
    const result: typeof entries = [];

    for (const entry of sorted) {
      const entryTokens = estimateTokens(entry.content);
      
      // Always include if preserving most recent and this is the last entry
      const isLast = entry === sorted[sorted.length - 1];
      if (this.config.preserveMostRecent && isLast && result.length > 0) {
        result.push(entry);
        currentTokens += entryTokens;
        continue;
      }

      // Check if we have room
      if (currentTokens + entryTokens > maxTokens) {
        break;
      }

      result.push(entry);
      currentTokens += entryTokens;
    }

    return result;
  }

  /**
   * Expand is not supported for truncate (cannot restore truncated content)
   */
  async expand(_slice: ContextSlice): Promise<MemorySnapshot> {
    // Cannot expand - return empty snapshot
    return {
      session: [],
      persistent: [],
      derived: [],
      totalTokens: 0
    };
  }

  /**
   * Get compression statistics
   */
  getStats(originalTokens: number, compressedTokens: number): {
    ratio: number;
    reduction: number;
  } {
    return {
      ratio: compressedTokens / originalTokens,
      reduction: originalTokens - compressedTokens
    };
  }
}

/**
 * Factory function to create truncate compressor
 */
export function createTruncateCompressor(config?: Partial<TruncateConfig>): ContextCompressor {
  return new TruncateCompressor(config);
}