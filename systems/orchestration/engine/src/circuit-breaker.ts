/**
 * Circuit Breaker Implementation
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * and provide fallback mechanisms in the orchestration system.
 */

import type { Node, NodeInput, NodeOutput } from '@nexus/core/contracts/node';

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',      // Normal operation, requests pass through
  OPEN = 'open',          // Failing, requests are blocked
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit
   */
  failureThreshold: number;
  
  /**
   * Time in milliseconds to wait before attempting half-open state
   */
  timeoutMs: number;
  
  /**
   * Number of successful requests needed to close circuit from half-open
   */
  successThreshold: number;
  
  /**
   * Enable automatic transition from open to half-open
   */
  enableAutoTransition: boolean;
  
  /**
   * Whether to throw an error or return fallback when circuit is open
   */
  throwOnOpen: boolean;
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

/**
 * Circuit breaker interface
 */
export interface ICircuitBreaker {
  /**
   * Execute a function with circuit breaker protection
   * @param operation The function to execute
   * @param fallback Fallback function to use when circuit is open
   * @returns Result of the operation or fallback
   */
  execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>;
  
  /**
   * Get current circuit breaker status
   * @returns Current status
   */
  getStatus(): CircuitBreakerStatus;
  
  /**
   * Manually open the circuit breaker
   */
  open(): void;
  
  /**
   * Manually close the circuit breaker
   */
  close(): void;
  
  /**
   * Manually reset the circuit breaker to half-open state
   */
  reset(): void;
}

/**
 * Circuit breaker factory configuration
 */
export interface CircuitBreakerFactoryConfig {
  /**
   * Default failure threshold
   */
  defaultFailureThreshold: number;
  
  /**
   * Default timeout in milliseconds
   */
  defaultTimeoutMs: number;
  
  /**
   * Default success threshold
   */
  defaultSuccessThreshold: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker implements ICircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  
  constructor(
    private config: CircuitBreakerConfig,
    private readonly id: string
  ) {
    // Validate config
    if (config.failureThreshold <= 0) {
      throw new Error('failureThreshold must be greater than 0');
    }
    if (config.timeoutMs <= 0) {
      throw new Error('timeoutMs must be greater than 0');
    }
    if (config.successThreshold <= 0) {
      throw new Error('successThreshold must be greater than 0');
    }
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if we should attempt the operation
    if (!this.shouldAttempt()) {
      if (this.config.throwOnOpen) {
        throw new Error(`Circuit breaker is OPEN for ${this.id}`);
      }
      
      // If fallback is provided, use it
      if (fallback) {
        return await fallback();
      }
      
      // Otherwise throw an error
      throw new Error(`Circuit breaker is OPEN for ${this.id} and no fallback provided`);
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
  
  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeoutMs;
  }
  
  /**
   * Manually close the circuit breaker
   */
  close(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
  
  /**
   * Manually reset the circuit breaker to half-open state
   */
  reset(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    this.nextAttemptTime = Date.now() + this.config.timeoutMs;
  }
  
  /**
   * Check if we should attempt the operation
   */
  private shouldAttempt(): boolean {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;
      
      case CircuitBreakerState.OPEN:
        // Check if timeout has elapsed
        if (
          this.config.enableAutoTransition &&
          this.nextAttemptTime !== null &&
          Date.now() >= this.nextAttemptTime
        ) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.successCount = 0;
          return true;
        }
        return false;
      
      case CircuitBreakerState.HALF_OPEN:
        return true;
    }
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        // Reset failure count on success in closed state
        this.failureCount = 0;
        break;
      
      case CircuitBreakerState.HALF_OPEN:
        this.successCount++;
        // If we've reached success threshold, close the circuit
        if (this.successCount >= this.config.successThreshold) {
          this.close();
        }
        break;
      
      case CircuitBreakerState.OPEN:
        // Shouldn't happen, but if it does, go to half-open
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 1;
        break;
    }
  }
  
  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        // If we've reached failure threshold, open the circuit
        if (this.failureCount >= this.config.failureThreshold) {
          this.open();
        }
        break;
      
      case CircuitBreakerState.HALF_OPEN:
        // Any failure in half-open state opens the circuit
        this.open();
        break;
      
      case CircuitBreakerState.OPEN:
        // Reset the timeout timer
        this.nextAttemptTime = Date.now() + this.config.timeoutMs;
        break;
    }
  }
}

/**
 * Circuit breaker factory
 */
export class CircuitBreakerFactory {
  private readonly config: CircuitBreakerFactoryConfig;
  private readonly breakers: Map<string, CircuitBreaker> = new Map();
  
  constructor(config?: Partial<CircuitBreakerFactoryConfig>) {
    const cfg = config ?? {};
    this.config = {
      defaultFailureThreshold: cfg.defaultFailureThreshold ?? 5,
      defaultTimeoutMs: cfg.defaultTimeoutMs ?? 60000,
      defaultSuccessThreshold: cfg.defaultSuccessThreshold ?? 3,
    };
  }
  
  /**
   * Get or create a circuit breaker for the given ID
   * @param id Unique identifier for the circuit breaker
   * @param config Optional configuration override
   * @returns Circuit breaker instance
   */
  getBreaker(
    id: string,
    config?: CircuitBreakerConfig
  ): CircuitBreaker {
    if (this.breakers.has(id)) {
      return this.breakers.get(id)!;
    }
    
    const breakerConfig: CircuitBreakerConfig = {
      failureThreshold: config?.failureThreshold ?? this.config.defaultFailureThreshold,
      timeoutMs: config?.timeoutMs ?? this.config.defaultTimeoutMs,
      successThreshold: config?.successThreshold ?? this.config.defaultSuccessThreshold,
      enableAutoTransition: config?.enableAutoTransition ?? true,
      throwOnOpen: config?.throwOnOpen ?? true,
      ...config
    };
    
    const breaker = new CircuitBreaker(breakerConfig, id);
    this.breakers.set(id, breaker);
    return breaker;
  }
  
  /**
   * Get status of all circuit breakers
   * @returns Map of breaker IDs to their status
   */
  getAllStatus(): Map<string, CircuitBreakerStatus> {
    const statusMap = new Map<string, CircuitBreakerStatus>();
    for (const [id, breaker] of this.breakers.entries()) {
      statusMap.set(id, breaker.getStatus());
    }
    return statusMap;
  }
  
  /**
   * Open all circuit breakers
   */
  openAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.open();
    }
  }
  
  /**
   * Close all circuit breakers
   */
  closeAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.close();
    }
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

/**
 * Create a circuit breaker factory with default configuration
 */
export function createCircuitBreakerFactory(config?: Partial<CircuitBreakerFactoryConfig>): CircuitBreakerFactory {
  const cfg = config ?? {};
  return new CircuitBreakerFactory({
    defaultFailureThreshold: cfg.defaultFailureThreshold ?? 5,
    defaultTimeoutMs: cfg.defaultTimeoutMs ?? 60000,
    defaultSuccessThreshold: cfg.defaultSuccessThreshold ?? 3,
  });
}

/**
 * Execute a node with circuit breaker protection
 */
export async function executeNodeWithCircuitBreaker(
  node: Node,
  input: NodeInput,
  circuitBreaker: CircuitBreaker,
  fallback?: () => Promise<NodeOutput>
): Promise<NodeOutput> {
  return circuitBreaker.execute<NodeOutput>(
    () => node.execute(input),
    fallback
  );
}