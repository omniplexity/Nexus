/**
 * Centralized Error Handler
 * 
 * Provides centralized error handling, classification, and recovery strategies
 * for the orchestration system.
 */

import type { Node } from '@nexus/core/contracts/node';

/**
 * Error classification
 */
export enum ErrorType {
  VALIDATION = 'validation',
  EXECUTION = 'execution',
  TIMEOUT = 'timeout',
  RESOURCE = 'resource',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Structured error information
 */
export interface OrchestrationError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, unknown>;
  nodeId?: string;
  timestamp: number;
  recoverable: boolean;
  retryCount: number;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /**
   * Enable error classification
   */
  enableClassification: boolean;
  
  /**
   * Enable automatic error recovery
   */
  enableAutoRecovery: boolean;
  
  /**
   * Default max retry attempts
   */
  defaultMaxRetries: number;
  
  /**
   * Base delay for retry backoff (ms)
   */
  baseRetryDelayMs: number;
  
  /**
   * Enable error metrics collection
   */
  enableMetrics: boolean;
  
  /**
   * Error history size limit
   */
  errorHistorySize: number;
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  /**
   * Handle an error that occurred during execution
   * @param error The error that occurred
   * @param node The node where the error occurred (if applicable)
   * @param context Execution context
   * @returns Handling decision
   */
  handleError(
    error: unknown,
    node: Node | null,
    context: Record<string, unknown>
  ): ErrorHandlingDecision;
  
  /**
   * Classify an error into a structured format
   * @param error The error to classify
   * @param node The node where the error occurred (if applicable)
   * @returns Classified error
   */
  classifyError(error: unknown, node: Node | null): OrchestrationError;
  
  /**
   * Determine if an error is recoverable
   * @param error The error to check
   * @returns True if the error is recoverable
   */
  isRecoverable(error: unknown): boolean;
  
  /**
   * Get error statistics
   * @returns Error statistics
   */
  getStatistics(): ErrorStatistics;
  
  /**
   * Clear error history
   */
  clearHistory(): void;
}

/**
 * Error handling decision
 */
export interface ErrorHandlingDecision {
  /**
   * Whether the error should trigger a retry
   */
  shouldRetry: boolean;
  
  /**
   * Delay before retry (in milliseconds)
   * Only relevant if shouldRetry is true
   */
  retryDelayMs: number;
  
  /**
   * Whether to use exponential backoff for the delay
   */
  useExponentialBackoff: boolean;
  
  /**
   * Alternative node to execute instead (for fallback)
   */
  fallbackNodeId: string | null;
  
  /**
   * Whether to cancel the entire execution
   */
  shouldCancel: boolean;
  
  /**
   * Custom data to pass to retry/fallback
   */
  customData: Record<string, unknown>;
  
  /**
   * Reason for the decision
   */
  reason: string;
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoverableErrors: number;
  unrecoverableErrors: number;
  retryAttempts: number;
  mostRecentError: OrchestrationError | null;
}

/**
 * Base error handler implementation
 */
export class BaseErrorHandler implements ErrorHandler {
  protected config: ErrorHandlerConfig;
  protected errorHistory: OrchestrationError[];
  protected retryCounts: Map<string, number>; // nodeId -> retry count
  
  constructor(config?: Partial<ErrorHandlerConfig>) {
    const cfg = config ?? {};
    this.config = {
      enableClassification: cfg.enableClassification ?? true,
      enableAutoRecovery: cfg.enableAutoRecovery ?? true,
      defaultMaxRetries: cfg.defaultMaxRetries ?? 3,
      baseRetryDelayMs: cfg.baseRetryDelayMs ?? 1000,
      enableMetrics: cfg.enableMetrics ?? true,
      errorHistorySize: cfg.errorHistorySize ?? 1000,
    };
    
    this.errorHistory = [];
    this.retryCounts = new Map();
  }
  
   /**
    * Handle an error that occurred during execution
    */
    handleError(
      error: unknown,
      node: Node | null,
      context: Record<string, unknown>
    ): ErrorHandlingDecision {
    // Classify the error
    const classifiedError = this.classifyError(error, node);
    
    // Add to history
    this.addToHistory(classifiedError);
    
    // Update retry count for this node
    const nodeId = node?.id ?? 'unknown';
    const currentCount = this.retryCounts.get(nodeId) ?? 0;
    this.retryCounts.set(nodeId, currentCount + 1);
    
    // Make handling decision based on error classification
    return this.makeHandlingDecision(classifiedError, node, context);
  }
  
  /**
   * Classify an error into a structured format
   */
  classifyError(error: unknown, node: Node | null): OrchestrationError {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    // Determine error type
    let type: ErrorType = ErrorType.UNKNOWN;
    let message = 'Unknown error';
    const details: Record<string, unknown> = {};
    
    if (error instanceof Error) {
      message = error.message;
      
      // Classify based on error message or type
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        type = ErrorType.TIMEOUT;
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        type = ErrorType.VALIDATION;
      } else if (errorMessage.includes('network') || errorMessage.includes('connection') || 
                 errorMessage.includes('fetch') || errorMessage.includes('http')) {
        type = ErrorType.NETWORK;
      } else if (errorMessage.includes('memory') || errorMessage.includes('resource') || 
                errorMessage.includes('quota') || errorMessage.includes('limit')) {
        type = ErrorType.RESOURCE;
      } else {
        type = ErrorType.EXECUTION;
      }
      
      // Add stack trace and other details if available
      if ('stack' in error) {
        details.stack = error.stack;
      }
    } else {
      message = String(error);
    }
    
    // Add node-specific details
    if (node) {
      details.nodeId = node.id;
      details.nodeType = node.type;
    }
    
    // Determine severity based on type and context
    let severity: ErrorSeverity = ErrorSeverity.MEDIUM;
    switch (type) {
      case ErrorType.VALIDATION:
        severity = ErrorSeverity.LOW;
        break;
      case ErrorType.TIMEOUT:
        severity = ErrorSeverity.MEDIUM;
        break;
      case ErrorType.RESOURCE:
        severity = ErrorSeverity.HIGH;
        break;
      case ErrorType.NETWORK:
        severity = ErrorSeverity.MEDIUM;
        break;
      case ErrorType.EXECUTION:
        severity = ErrorSeverity.MEDIUM;
        break;
      case ErrorType.UNKNOWN:
        severity = ErrorSeverity.HIGH;
        break;
    }
    
    // Determine if error is recoverable
    const recoverable = this.isRecoverable(error);
    
    return {
      id: errorId,
      type,
      severity,
      message,
      details,
      nodeId: node?.id ?? undefined,
      timestamp,
      recoverable,
      retryCount: 0 // Will be updated in handleError
    };
  }
  
  /**
   * Determine if an error is recoverable
   */
  isRecoverable(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true; // Non-Error objects are considered recoverable
    }
    
    const errorMessage = error.message.toLowerCase();
    
    // Non-recoverable errors
    const nonRecoverablePatterns = [
      'not found',
      'no such file',
      'permission denied',
      'unauthorized',
      'forbidden',
      'invalid argument',
      'illegal state'
    ];
    
    for (const pattern of nonRecoverablePatterns) {
      if (errorMessage.includes(pattern)) {
        return false;
      }
    }
    
    // Recoverable errors (everything else)
    return true;
  }
  
   /**
    * Make a handling decision based on error classification
    */
   protected makeHandlingDecision(
     error: OrchestrationError,
     node: Node | null,
     _context: Record<string, unknown>
   ): ErrorHandlingDecision {
    // Default decision: retry with exponential backoff
    let shouldRetry = error.recoverable;
    let retryDelayMs = this.config.baseRetryDelayMs;
    let useExponentialBackoff = true;
    const fallbackNodeId: string | null = null;
    let shouldCancel = false;
    const customData: Record<string, unknown> = {};
    let reason = 'Default error handling decision';
    
    // Adjust decision based on error type and severity
    switch (error.type) {
      case ErrorType.VALIDATION:
        // Validation errors are usually not recoverable
        shouldRetry = false;
        shouldCancel = true;
        reason = 'Validation error is not recoverable';
        break;
      
      case ErrorType.TIMEOUT:
        // Timeout errors are recoverable with longer delays
        shouldRetry = true;
        retryDelayMs = this.config.baseRetryDelayMs * 3;
        useExponentialBackoff = true;
        reason = 'Timeout error is recoverable with increased delay';
        break;
      
      case ErrorType.RESOURCE:
        // Resource errors may require fallback or cancellation
        shouldRetry = this.config.enableAutoRecovery;
        retryDelayMs = this.config.baseRetryDelayMs * 2;
        useExponentialBackoff = false; // Don't back off on resource errors
        reason = 'Resource error handling based on auto-recovery setting';
        break;
      
      case ErrorType.NETWORK:
        // Network errors are typically recoverable with backoff
        shouldRetry = true;
        retryDelayMs = this.config.baseRetryDelayMs;
        useExponentialBackoff = true;
        reason = 'Network error is recoverable with standard backoff';
        break;
      
      case ErrorType.EXECUTION:
        // Execution errors depend on specifics
        shouldRetry = error.recoverable;
        retryDelayMs = this.config.baseRetryDelayMs;
        useExponentialBackoff = true;
        reason = 'Execution error recoverability based on classification';
        break;
      
      case ErrorType.UNKNOWN:
        // Unknown errors are treated conservatively
        shouldRetry = false;
        shouldCancel = true;
        reason = 'Unknown error treated as non-recoverable for safety';
        break;
    }
    
    // Check if we've exceeded max retries for this node
    const nodeId = node?.id ?? 'unknown';
    const currentRetryCount = this.retryCounts.get(nodeId) ?? 0;
    if (currentRetryCount >= this.config.defaultMaxRetries) {
      shouldRetry = false;
      shouldCancel = true;
      reason = `Max retries (${this.config.defaultMaxRetries}) exceeded for node ${nodeId}`;
    }
    
    return {
      shouldRetry,
      retryDelayMs,
      useExponentialBackoff,
      fallbackNodeId,
      shouldCancel,
      customData,
      reason
    };
  }
  
  /**
   * Add error to history
   */
  protected addToHistory(error: OrchestrationError): void {
    this.errorHistory.push(error);
    
    // Keep history within size limit
    if (this.errorHistory.length > this.config.errorHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.config.errorHistorySize);
    }
  }
  
  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    const errorsByType: Record<ErrorType, number> = {
      [ErrorType.VALIDATION]: 0,
      [ErrorType.EXECUTION]: 0,
      [ErrorType.TIMEOUT]: 0,
      [ErrorType.RESOURCE]: 0,
      [ErrorType.NETWORK]: 0,
      [ErrorType.UNKNOWN]: 0
    };
    
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };
    
    let recoverableErrors = 0;
    let unrecoverableErrors = 0;
    let retryAttempts = 0;
    let mostRecentError: OrchestrationError | null = null;
    
    for (const error of this.errorHistory) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      
      if (error.recoverable) {
        recoverableErrors++;
      } else {
        unrecoverableErrors++;
      }
      
      retryAttempts += error.retryCount;
      
      if (!mostRecentError || error.timestamp > mostRecentError.timestamp) {
        mostRecentError = error;
      }
    }
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recoverableErrors,
      unrecoverableErrors,
      retryAttempts,
      mostRecentError
    };
  }
  
  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.retryCounts.clear();
  }
}

/**
 * Error handler factory
 */
export function createErrorHandler(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
  const cfg = config ?? {};
  return new BaseErrorHandler({
    enableClassification: cfg.enableClassification ?? true,
    enableAutoRecovery: cfg.enableAutoRecovery ?? true,
    defaultMaxRetries: cfg.defaultMaxRetries ?? 3,
    baseRetryDelayMs: cfg.baseRetryDelayMs ?? 1000,
    enableMetrics: cfg.enableMetrics ?? true,
    errorHistorySize: cfg.errorHistorySize ?? 1000,
  });
}