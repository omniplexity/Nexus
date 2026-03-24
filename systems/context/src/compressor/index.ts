/**
 * Context Compressor - Main Exports
 * 
 * Provides multiple compression strategies for context optimization.
 */

import type { ContextCompressor } from '../../../../core/contracts/memory';

import { HybridCompressor, createHybridCompressor, type HybridConfig } from './hybrid.js';
import { SummarizeCompressor, createSummarizeCompressor, type SummarizeConfig } from './summarize.js';
import { TruncateCompressor, createTruncateCompressor, type TruncateConfig } from './truncate.js';

/**
 * Compressor type enum
 */
export enum CompressorType {
  TRUNCATE = 'truncate',
  SUMMARIZE = 'summarize',
  HYBRID = 'hybrid'
}

/**
 * Compressor configuration union
 */
export type CompressorConfig = TruncateConfig | SummarizeConfig | HybridConfig;

/**
 * Compressor factory
 */
export function createCompressor(
  type: CompressorType | 'truncate' | 'summarize' | 'hybrid',
  config?: CompressorConfig,
  modelProvider?: unknown,
): ContextCompressor {
  switch (type) {
    case CompressorType.TRUNCATE:
    case 'truncate':
      return createTruncateCompressor(config as TruncateConfig);
    
    case CompressorType.SUMMARIZE:
    case 'summarize':
      return createSummarizeCompressor(config as SummarizeConfig, modelProvider);
    
    case CompressorType.HYBRID:
    case 'hybrid':
      return createHybridCompressor(config as HybridConfig);
    
    default:
      throw new Error(`Unknown compressor type: ${type}`);
  }
}

/**
 * Get default compressor based on token budget
 */
export function getDefaultCompressor(maxTokens: number): ContextCompressor {
  // Use hybrid for larger budgets, truncate for small
  if (maxTokens > 4000) {
    return createHybridCompressor({ targetTokens: maxTokens });
  }
  return createTruncateCompressor();
}

export type { TruncateConfig } from './truncate.js';
export type { SummarizeConfig } from './summarize.js';
export type { HybridConfig } from './hybrid.js';
export { TruncateCompressor, SummarizeCompressor, HybridCompressor };

/**
 * Default compressor configurations
 */
export const DEFAULT_COMPRESSOR_CONFIGS = {
  [CompressorType.TRUNCATE]: {
    sessionRatio: 0.4,
    persistentRatio: 0.4,
    derivedRatio: 0.2,
    preserveMostRecent: true
  },
  [CompressorType.SUMMARIZE]: {
    keepRecent: 5,
    minEntriesToSummarize: 3,
    targetReductionRatio: 0.5
  },
  [CompressorType.HYBRID]: {
    keepRecent: 3,
    maxToSummarize: 20,
    recentRatio: 0.6
  }
} as const;