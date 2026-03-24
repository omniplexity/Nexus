/**
 * Prioritizer Module - Main Exports
 */

import type { MemoryEntry, MemoryQuery } from '../../../../core/contracts/memory';

import { RelevanceScorer, createRelevanceScorer, type ScorerConfig, type ScoredEntry } from './scorer.js';

/**
 * Prioritizer interface
 */
export interface ContextPrioritizer {
  /**
   * Prioritize entries based on query
   */
  prioritize(entries: MemoryEntry[], query: MemoryQuery): Promise<MemoryEntry[]>;
  
  /**
   * Get scores for entries
   */
  score(entries: MemoryEntry[], query: MemoryQuery): Promise<ScoredEntry[]>;
}

/**
 * Default prioritizer implementation
 */
export class DefaultPrioritizer implements ContextPrioritizer {
  private scorer: RelevanceScorer;

  constructor(config?: Partial<ScorerConfig>) {
    this.scorer = createRelevanceScorer(config);
  }

  /**
   * Prioritize entries based on relevance scores
   */
  async prioritize(entries: MemoryEntry[], query: MemoryQuery): Promise<MemoryEntry[]> {
    const scored = this.scorer.scoreEntries(entries, query);
    return scored.map(s => s.entry);
  }

  /**
   * Get scored entries
   */
  async score(entries: MemoryEntry[], query: MemoryQuery): Promise<ScoredEntry[]> {
    return this.scorer.scoreEntries(entries, query);
  }
}

/**
 * Factory function to create prioritizer
 */
export function createPrioritizer(config?: Partial<ScorerConfig>): ContextPrioritizer {
  return new DefaultPrioritizer(config);
}

// Export scorer
export { RelevanceScorer, createRelevanceScorer };
export type { ScoringWeights, ScorerConfig, ScoredEntry } from './scorer.js';