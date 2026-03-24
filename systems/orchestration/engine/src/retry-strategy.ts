/**
 * Retry Strategy Implementation
 * 
 * Provides configurable retry mechanisms with different backoff strategies
 * for handling transient failures in the orchestration system.
 */

import type { Node, NodeInput, NodeOutput } from '@nexus/core/contracts/node';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  backoffMs: number;
  retryableErrors?: string[];
  maxDelayMs?: number;
  jitter?: boolean;
}

/**
 * Retry strategy interface
 */
export interface RetryStrategy {
  /**
   * Execute a function with retry logic
   * @param operation The function to execute
   * @param config Retry configuration
   * @param context Additional context for retry decisions
   * @returns Result of the operation
   */
  execute<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context?: Record<string, unknown>
  ): Promise<T>;
  
  /**
   * Determine if an error is retryable based on configuration
   * @param error The error to check
   * @param config Retry configuration
   * @returns True if the error is retryable
   */
  isRetryable(error: unknown, config: RetryConfig): boolean;
  
  /**
   * Calculate delay for a retry attempt
   * @param attemptNumber The current attempt number (0-based)
   * @param config Retry configuration
   * @returns Delay in milliseconds
   */
  calculateDelay(attemptNumber: number, config: RetryConfig): number;
}

/**
 * Base retry strategy implementation
 */
export class BaseRetryStrategy implements RetryStrategy {
  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    _context?: Record<string, unknown>
  ): Promise<T> {
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (!this.isRetryable(error, config)) {
          throw error;
        }
        
        // If this was the last attempt, don't delay
        if (attempt === config.maxAttempts - 1) {
          break;
        }
        
        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, config);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries exhausted
    throw lastError;
  }
  
  /**
   * Determine if an error is retryable based on configuration
   */
  isRetryable(error: unknown, config: RetryConfig): boolean {
    // If no specific retryable errors are configured, assume all errors are retryable
    if (!config.retryableErrors || config.retryableErrors.length === 0) {
      return true;
    }
    
    // Check if error message matches any of the retryable error patterns
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      return config.retryableErrors.some(pattern => 
        errorMessage.includes(pattern.toLowerCase())
      );
    }
    
    // For non-Error objects, check if they match string patterns
    const errorString = String(error).toLowerCase();
    return config.retryableErrors.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Calculate delay for a retry attempt
   */
  calculateDelay(attemptNumber: number, config: RetryConfig): number {
    let delay = config.backoffMs;
    
    switch (config.backoff) {
      case 'linear':
        delay = config.backoffMs * (attemptNumber + 1);
        break;
      case 'exponential':
        delay = config.backoffMs * Math.pow(2, attemptNumber);
        break;
      case 'fixed':
        delay = config.backoffMs;
        break;
    }
    
    // Apply maximum delay if configured
    if (config.maxDelayMs !== undefined) {
      delay = Math.min(delay, config.maxDelayMs);
    }
    
    // Apply jitter if enabled (±25% randomness)
    if (config.jitter) {
      const jitterAmount = delay * 0.25;
      const jitter = (Math.random() * 2 - 1) * jitterAmount; // -0.5 to 0.5
      delay = Math.max(0, delay + jitter);
    }
    
    return Math.floor(delay);
  }
}

/**
 * Retry strategy factory
 */
export function createRetryStrategy(): RetryStrategy {
  return new BaseRetryStrategy();
}

/**
 * Execute a node with retry strategy
 */
export async function executeNodeWithRetry(
  node: Node,
  input: NodeInput,
  config: RetryConfig,
  retryStrategy: RetryStrategy = createRetryStrategy()
): Promise<NodeOutput> {
  return retryStrategy.execute<NodeOutput>(
    () => node.execute(input),
    config
  );
}