/**
 * Optimization Contracts for Nexus
 *
 * Defines shared optimization hints and telemetry used by context,
 * orchestration, and capability runtimes.
 */

/**
 * Optimization modes.
 */
export enum OptimizationMode {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive'
}

/**
 * Hint payload used by adaptive runtimes.
 */
export interface OptimizationHints {
  sessionCount?: number;
  nodeCount?: number;
  requestTokens?: number;
  cacheHitRate?: number;
  concurrency?: number;
}

/**
 * Shared optimization policy.
 */
export interface OptimizationConfig {
  mode?: OptimizationMode;
  enableAdaptiveBudgets?: boolean;
  enableAdaptiveConcurrency?: boolean;
  tokenBudgetMultiplier?: number;
  concurrencyMultiplier?: number;
  targetCacheHitRate?: number;
  compressionPreference?: 'auto' | 'truncate' | 'summarize' | 'hybrid';
}

/**
 * Shared optimization telemetry.
 */
export interface OptimizationTelemetry {
  cacheHitRate: number;
  compressionRatio: number;
  tokenSavings: number;
  adaptiveTokenBudget: number;
  adaptiveConcurrency: number;
  updatedAt: string;
}
