/**
 * Relevance Scorer Implementation
 * 
 * Provides multi-factor relevance scoring for memory prioritization.
 */

import type { MemoryEntry, MemoryQuery } from '../../../../core/contracts/memory';

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  recency: number;
  importance: number;
  relevance: number;
  frequency: number;
  diversity: number;
}

/**
 * Default scoring weights
 */
export const DEFAULT_WEIGHTS: Required<ScoringWeights> = {
  recency: 0.3,
  importance: 0.25,
  relevance: 0.25,
  frequency: 0.1,
  diversity: 0.1
};

/**
 * Time decay constant (in milliseconds)
 */
const DECAY_CONSTANT = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Scorer configuration
 */
export interface ScorerConfig {
  weights: Partial<ScoringWeights>;
  decayConstant: number;
  maxRecencyScore: number;
  minScore: number;
  maxScore: number;
}

/**
 * Default scorer configuration
 */
const DEFAULT_CONFIG: Required<ScorerConfig> = {
  weights: DEFAULT_WEIGHTS,
  decayConstant: DECAY_CONSTANT,
  maxRecencyScore: 1.0,
  minScore: 0.0,
  maxScore: 1.0
};

/**
 * Scored entry result
 */
export interface ScoredEntry {
  entry: MemoryEntry;
  score: number;
  breakdown: {
    recency: number;
    importance: number;
    relevance: number;
    frequency: number;
    diversity: number;
  };
}

/**
 * Relevance scorer for memory prioritization
 */
export class RelevanceScorer {
  private config: Required<ScorerConfig>;
  private seenContents: Set<string> = new Set();

  constructor(config: Partial<ScorerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config, weights: { ...DEFAULT_WEIGHTS, ...config.weights } };
  }

  /**
   * Calculate recency score (exponential decay)
   */
  private calculateRecencyScore(entry: MemoryEntry): number {
    const age = Date.now() - new Date(entry.metadata.createdAt).getTime();
    const score = Math.exp(-age / this.config.decayConstant);
    return Math.min(score, this.config.maxRecencyScore);
  }

  /**
   * Calculate importance score from metadata
   */
  private calculateImportanceScore(entry: MemoryEntry): number {
    const importance = entry.metadata.importance ?? 0.5;
    return Math.max(this.config.minScore, Math.min(importance, this.config.maxScore));
  }

  /**
   * Calculate relevance score based on query
   */
  private calculateRelevanceScore(entry: MemoryEntry, query: MemoryQuery): number {
    // If no query, return neutral score
    if (!query.text && !query.embedding) {
      return 0.5;
    }

    let relevanceScore = 0;
    let factors = 0;

    // Text-based relevance
    if (query.text) {
      const queryTerms = query.text.toLowerCase().split(/\s+/);
      const content = entry.content.toLowerCase();
      let matches = 0;
      
      for (const term of queryTerms) {
        if (content.includes(term)) {
          matches++;
        }
      }
      
      relevanceScore += matches / queryTerms.length;
      factors++;
    }

    // Tag-based relevance
    if (query.tags && query.tags.length > 0) {
      const entryTags = new Set(entry.metadata.tags || []);
      let tagMatches = 0;
      
      for (const tag of query.tags) {
        if (entryTags.has(tag)) {
          tagMatches++;
        }
      }
      
      relevanceScore += tagMatches / query.tags.length;
      factors++;
    }

    return factors > 0 ? relevanceScore / factors : 0.5;
  }

  /**
   * Calculate frequency score based on access count
   */
  private calculateFrequencyScore(accessCount: number, maxAccessCount: number): number {
    // Normalize by max access count
    if (maxAccessCount === 0) return 0.5;
    
    return Math.min(accessCount / maxAccessCount, 1.0);
  }

  /**
   * Calculate diversity score
   * Penalizes entries with similar content
   */
  private calculateDiversityScore(entry: MemoryEntry): number {
    const contentHash = this.hashContent(entry.content);
    
    if (this.seenContents.has(contentHash)) {
      return 0.1; // Penalize duplicate content
    }
    
    this.seenContents.add(contentHash);
    return 1.0;
  }

  /**
   * Simple hash for content comparison
   * Uses a rolling hash for better collision resistance than substring
   */
  private hashContent(content: string): string {
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    let hash = 0;
    const prime = 31;
    
    for (let i = 0; i < Math.min(normalized.length, 200); i++) {
      hash = ((hash * prime) + normalized.charCodeAt(i)) | 0;
    }
    
    return hash.toString(36);
  }

  /**
   * Reset seen contents for new scoring session
   */
  reset(): void {
    this.seenContents.clear();
  }

  /**
   * Score a single entry
   */
  scoreEntry(entry: MemoryEntry, query: MemoryQuery, maxAccessCount: number = 1, accessCount: number = 0): ScoredEntry {
    const recency = this.calculateRecencyScore(entry);
    const importance = this.calculateImportanceScore(entry);
    const relevance = this.calculateRelevanceScore(entry, query);
    const frequency = this.calculateFrequencyScore(accessCount, maxAccessCount);
    const diversity = this.calculateDiversityScore(entry);

    const weights = this.config.weights ?? DEFAULT_WEIGHTS;
    const totalScore = 
      ((weights as Required<typeof weights>).recency * recency) +
      ((weights as Required<typeof weights>).importance * importance) +
      ((weights as Required<typeof weights>).relevance * relevance) +
      ((weights as Required<typeof weights>).frequency * frequency) +
      ((weights as Required<typeof weights>).diversity * diversity);

    return {
      entry,
      score: Math.max(this.config.minScore, Math.min(totalScore, this.config.maxScore)),
      breakdown: { recency, importance, relevance, frequency, diversity }
    };
  }

  /**
   * Score multiple entries
   */
  scoreEntries(entries: MemoryEntry[], query: MemoryQuery): ScoredEntry[] {
    this.reset();

    // Find max access count for normalization and collect access counts
    let maxAccessCount = 0;
    const accessCounts = new Map<string, number>();
    for (const entry of entries) {
      // Extract accessCount from metadata if available
      const metadata = entry.metadata;
      const accessCount = (metadata && typeof metadata === 'object' && 'accessCount' in metadata)
        ? (metadata as unknown as Record<string, unknown>).accessCount as number
        : 0;
      accessCounts.set(entry.id, accessCount ?? 0);
      maxAccessCount = Math.max(maxAccessCount, accessCount ?? 0);
    }

    // Score all entries
    const scored = entries.map(entry => this.scoreEntry(entry, query, maxAccessCount || 1, accessCounts.get(entry.id) ?? 0));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Get top K entries
   */
  getTopK(entries: MemoryEntry[], query: MemoryQuery, k: number): ScoredEntry[] {
    const scored = this.scoreEntries(entries, query);
    return scored.slice(0, k);
  }
}

/**
 * Factory function to create scorer
 */
export function createRelevanceScorer(config?: Partial<ScorerConfig>): RelevanceScorer {
  return new RelevanceScorer(config);
}