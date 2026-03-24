/**
 * Hybrid Compression Strategy
 * 
 * Combines truncation and summarization for optimal token reduction:
 * - Keep recent N entries directly (truncation)
 * - Summarize middle entries
 * - Archive oldest entries
 */

import type {
  MemorySnapshot,
  ContextSlice,
  ContextCompressor,
  MemoryEntry
} from '../../../../core/contracts/memory';

import { SummarizeCompressor } from './summarize.js';

/**
 * Configuration for hybrid compression
 */
export interface HybridConfig {
  /**
   * Number of recent entries to keep verbatim
   */
  keepRecent: number;
  
  /**
   * Maximum entries to summarize
   */
  maxToSummarize: number;
  
  /**
   * Target total token budget
   */
  targetTokens: number;
  
  /**
   * Ratio of tokens for recent vs summarized (0.5 = 50/50 split)
   */
  recentRatio: number;
  
  /**
   * Model name for summarization (optional, defaults to 'gpt-4-turbo')
   */
  model?: string;
  
  /**
   * Model provider for summarization (optional)
   */
  modelProvider?: unknown;
}

/**
 * Default hybrid configuration
 */
const DEFAULT_CONFIG: Required<HybridConfig> = {
  keepRecent: 3,
  maxToSummarize: 20,
  targetTokens: 2000,
  recentRatio: 0.6,
  model: 'gpt-4-turbo',
  modelProvider: undefined
};

/**
 * Estimate tokens for content
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length * 0.25);
}

/**
 * Hybrid compressor implementation
 * Combines truncate and summarize strategies
 */
export class HybridCompressor implements ContextCompressor {
  private config: Required<HybridConfig>;
  private summarizeCompressor: SummarizeCompressor;

  constructor(config: Partial<HybridConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.summarizeCompressor = new SummarizeCompressor({
      keepRecent: 0,
      minEntriesToSummarize: 1,
      targetReductionRatio: 0.5,
      model: this.config.model
    }, this.config.modelProvider);
  }

  /**
   * Compress memory snapshot using hybrid approach
   */
  async compress(memory: MemorySnapshot, maxTokens: number): Promise<ContextSlice> {
    const targetTokens = Math.min(maxTokens, this.config.targetTokens);
    const recentBudget = Math.floor(targetTokens * this.config.recentRatio);
    const summaryBudget = targetTokens - recentBudget;

    // Separate recent and older entries
    const splitEntries = <T extends MemoryEntry>(entries: T[]) => {
      const recent = entries.slice(-this.config.keepRecent);
      const older = entries.slice(0, -this.config.keepRecent).slice(0, this.config.maxToSummarize);
      return { recent, older };
    };

    const sessionSplit = splitEntries(memory.session);
    const persistentSplit = splitEntries(memory.persistent);
    const derivedSplit = splitEntries(memory.derived);

    // Format recent entries (truncation)
    const formatEntries = (entries: MemoryEntry[]) => 
      entries.map(e => e.content).join('\n\n');

    const recentSession = formatEntries(sessionSplit.recent);
    const recentPersistent = formatEntries(persistentSplit.recent);
    const recentDerived = formatEntries(derivedSplit.recent);

    // Build recent context
    const recentContext = [
      recentSession,
      recentPersistent,
      recentDerived
    ].filter(Boolean).join('\n\n---\n\n');

    const recentTokens = estimateTokens(recentContext);

    // If recent content fits, add summarized older content
    let summaryContext = '';
    if (recentTokens < recentBudget) {
      // Combine older entries for summarization
      const allOlder = [
        ...sessionSplit.older,
        ...persistentSplit.older,
        ...derivedSplit.older
      ];

      if (allOlder.length > 0) {
        // Create a temporary snapshot for summarization
        const olderSnapshot: MemorySnapshot = {
          session: sessionSplit.older,
          persistent: persistentSplit.older,
          derived: derivedSplit.older,
          totalTokens: allOlder.reduce((sum, e) => sum + estimateTokens(e.content), 0)
        };

        // Try summarization
        try {
          const summarySlice = await this.summarizeCompressor.compress(olderSnapshot, summaryBudget);
          summaryContext = summarySlice.conversation;
        } catch (error) {
          // Fallback: log error and truncate older entries
          console.warn('Summarization failed, falling back to truncation:', error);
          const olderFormatted = formatEntries(allOlder.slice(0, 5));
          summaryContext = `[Earlier context]: ${olderFormatted}`;
        }
      }
    }

    // Combine final conversation
    const conversation = [
      summaryContext,
      '--- Recent Context ---',
      recentContext
    ].filter(Boolean).join('\n\n');

    const totalTokens = estimateTokens(conversation);

    // Collect memory IDs
    const getIds = (entries: MemoryEntry[], prefix: string) => 
      entries.map(e => `${prefix}:${e.id}`);

    const memoryIds = [
      ...getIds(sessionSplit.recent, 'session'),
      ...getIds(persistentSplit.recent, 'persistent'),
      ...getIds(derivedSplit.recent, 'derived'),
      ...getIds(sessionSplit.older, 'session:summary'),
      ...getIds(persistentSplit.older, 'persistent:summary'),
      ...getIds(derivedSplit.older, 'derived:summary')
    ];

    return {
      system: '',
      conversation,
      tools: '',
      totalTokens,
      memoryIds
    };
  }

  /**
   * Expand is not fully supported
   */
  async expand(_slice: ContextSlice): Promise<MemorySnapshot> {
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
    strategy: string;
  } {
    return {
      ratio: compressedTokens / originalTokens,
      reduction: originalTokens - compressedTokens,
      strategy: 'hybrid'
    };
  }
}

/**
 * Factory function to create hybrid compressor
 */
export function createHybridCompressor(config?: Partial<HybridConfig>): ContextCompressor {
  return new HybridCompressor(config);
}