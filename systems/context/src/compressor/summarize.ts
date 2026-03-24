/**
 * Summarize Compression Strategy
 * 
 * Implements context compression by using LLM to summarize older entries
 * while preserving key information.
 * 
 * Note: This implementation requires a model provider to generate summaries.
 * In production, this would call the model provider.
 */

import type {
  MemorySnapshot,
  ContextSlice,
  ContextCompressor,
  MemoryEntry
} from '../../../../core/contracts/memory';

/**
 * Configuration for summarize compression
 */
export interface SummarizeConfig {
  /**
   * Maximum number of entries to keep verbatim before summarizing
   */
  keepRecent: number;
  
  /**
   * Minimum number of entries required to trigger summarization
   */
  minEntriesToSummarize: number;
  
  /**
   * Target token reduction ratio (0.5 = reduce by 50%)
   */
  targetReductionRatio: number;
  
  /**
   * Model to use for summarization
   */
  model?: string;
  
  /**
   * Custom summarization prompt
   */
  summarizePrompt?: string;
}

const DEFAULT_SUMMARIZE_PROMPT = `Summarize the following conversation history. 
Preserve key facts, user preferences, important decisions, and action items.
Keep the summary concise but informative.

Conversation:
{content}

Summary:`;

/**
 * Default summarize configuration
 */
const DEFAULT_CONFIG: Required<SummarizeConfig> = {
  keepRecent: 5,
  minEntriesToSummarize: 3,
  targetReductionRatio: 0.5,
  model: 'gpt-4-turbo',
  summarizePrompt: DEFAULT_SUMMARIZE_PROMPT
};

/**
 * Estimate tokens for content
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length * 0.25);
}

/**
 * Summarize compressor implementation
 * Uses LLM to summarize older entries
 */
export class SummarizeCompressor implements ContextCompressor {
  private config: Required<SummarizeConfig>;
  private modelProvider?: unknown; // Model provider would be injected

  constructor(config: Partial<SummarizeConfig> = {}, modelProvider?: unknown) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.modelProvider = modelProvider;
  }

  /**
   * Compress memory snapshot using summarization
   */
  async compress(memory: MemorySnapshot, _maxTokens: number): Promise<ContextSlice> {
    // Keep recent entries verbatim
    const recentSession = memory.session.slice(-this.config.keepRecent);
    const recentPersistent = memory.persistent.slice(-this.config.keepRecent);
    const recentDerived = memory.derived.slice(-this.config.keepRecent);

    // Get older entries to potentially summarize
    const olderSession = memory.session.slice(0, -this.config.keepRecent);
    const olderPersistent = memory.persistent.slice(0, -this.config.keepRecent);
    const olderDerived = memory.derived.slice(0, -this.config.keepRecent);

    // Summarize if there are enough older entries
    let summarizedSession = '';
    let summarizedPersistent = '';
    let summarizedDerived = '';

    if (olderSession.length >= this.config.minEntriesToSummarize) {
      summarizedSession = await this.summarizeGroup(olderSession);
    }
    if (olderPersistent.length >= this.config.minEntriesToSummarize) {
      summarizedPersistent = await this.summarizeGroup(olderPersistent);
    }
    if (olderDerived.length >= this.config.minEntriesToSummarize) {
      summarizedDerived = await this.summarizeGroup(olderDerived);
    }

    // Format recent entries
    const formatEntry = (e: MemoryEntry) => e.content;
    const recentSessionStr = recentSession.map(formatEntry).join('\n\n');
    const recentPersistentStr = recentPersistent.map(formatEntry).join('\n\n');
    const recentDerivedStr = recentDerived.map(formatEntry).join('\n\n');

    // Build conversation string
    const conversation = [
      summarizedSession,
      summarizedPersistent,
      summarizedDerived,
      '--- Recent Context ---',
      recentSessionStr,
      recentPersistentStr,
      recentDerivedStr
    ].filter(Boolean).join('\n\n');

    const totalTokens = estimateTokens(conversation);

    // Collect memory IDs
    const memoryIds = [
      ...recentSession.map(e => 'session:' + e.id),
      ...recentPersistent.map(e => 'persistent:' + e.id),
      ...recentDerived.map(e => 'derived:' + e.id)
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
   * Summarize a group of entries
   */
  private async summarizeGroup(entries: MemoryEntry[]): Promise<string> {
    const content = entries.map(e => e.content).join('\n\n---\n\n');
    
    // If no model provider, use simple extraction-based summary
    if (!this.modelProvider) {
      return this.simpleSummarize(content);
    }

    try {
      const prompt = (this.config.summarizePrompt || DEFAULT_SUMMARIZE_PROMPT)
        .replace('{content}', content);
      
      const response = await (this.modelProvider as { complete?: (params: unknown) => Promise<{ text: string }> }).complete?.({
        model: this.config.model,
        prompt,
        maxTokens: Math.floor(estimateTokens(content) * this.config.targetReductionRatio),
        temperature: 0.3
      });

      return response?.text ?? '';
    } catch (error) {
      console.warn('Summarization failed, using fallback:', error);
      return this.simpleSummarize(content);
    }
  }

  /**
   * Simple extraction-based summary when no LLM available
   */
  private simpleSummarize(content: string): string {
    const lines = content.split('\n').filter(l => l.trim());
    
    // Extract key sentences (first sentence of each paragraph)
    const keyPoints: string[] = [];
    let currentParagraph = '';
    
    for (const line of lines) {
      if (line.trim() === '---') {
        if (currentParagraph) {
          keyPoints.push(currentParagraph);
          currentParagraph = '';
        }
      } else {
        currentParagraph += line + ' ';
      }
    }
    
    if (currentParagraph) {
      keyPoints.push(currentParagraph);
    }

    // Return first few key points as summary
    const summary = keyPoints.slice(0, 3).join('. ');
    return summary ? `Summary: ${summary}` : '';
  }

  /**
   * Expand is not fully supported for summarization
   * (the original content is lost)
   */
  async expand(_slice: ContextSlice): Promise<MemorySnapshot> {
    // Cannot fully expand - return partial snapshot from available data
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
 * Factory function to create summarize compressor
 */
export function createSummarizeCompressor(
  config?: Partial<SummarizeConfig>,
  modelProvider?: unknown
): ContextCompressor {
  return new SummarizeCompressor(config, modelProvider);
}