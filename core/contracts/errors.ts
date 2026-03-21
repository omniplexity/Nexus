/**
 * Core Error Types for Nexus
 * 
 * All system errors should use these base types to ensure
 * consistent error handling across the entire codebase.
 */

// Base error codes for the system
export enum ErrorCode {
  // Orchestration errors (ORC-xxx)
  ORC_001 = 'ORC_001', // Orchestration failed
  ORC_002 = 'ORC_002', // Node execution failed
  ORC_003 = 'ORC_003', // DAG construction failed
  ORC_004 = 'ORC_004', // Dependency resolution failed
  
  // Node errors (ND-xxx)
  ND_001 = 'ND_001', // Node not found
  ND_002 = 'ND_002', // Node timeout
  ND_003 = 'ND_003', // Node retry exhausted
  ND_004 = 'ND_004', // Invalid node configuration
  
  // Memory errors (MEM-xxx)
  MEM_001 = 'MEM_001', // Memory retrieval failed
  MEM_002 = 'MEM_002', // Memory storage failed
  MEM_003 = 'MEM_003', // Memory not found
  MEM_004 = 'MEM_004', // Memory quota exceeded
  
  // Tool errors (TOL-xxx)
  TOL_001 = 'TOL_001', // Tool not found
  TOL_002 = 'TOL_002', // Tool execution failed
  TOL_003 = 'TOL_003', // Tool timeout
  TOL_004 = 'TOL_004', // Invalid tool input
  TOL_005 = 'TOL_005', // Tool not authorized
  
  // Model provider errors (MOD-xxx)
  MOD_001 = 'MOD_001', // Model provider unavailable
  MOD_002 = 'MOD_002', // Model inference failed
  MOD_003 = 'MOD_003', // Invalid model configuration
  MOD_004 = 'MOD_004', // Rate limit exceeded
  
  // Context errors (CTX-xxx)
  CTX_001 = 'CTX_001', // Context compression failed
  CTX_002 = 'CTX_002', // Context too large
  CTX_003 = 'CTX_003', // Context retrieval failed
  
  // Runtime errors (RT-xxx)
  RT_001 = 'RT_001', // IPC communication failed
  RT_002 = 'RT_002', // Process spawn failed
  RT_003 = 'RT_003', // Sandbox execution failed
  RT_004 = 'RT_004', // Scheduler error
  
  // Data errors (DAT-xxx)
  DAT_001 = 'DAT_001', // Database connection failed
  DAT_002 = 'DAT_002', // Migration failed
  DAT_003 = 'DAT_003', // Repository error
  
  // Generic errors (GEN-xxx)
  GEN_001 = 'GEN_001', // Unknown error
  GEN_002 = 'GEN_002', // Invalid input
  GEN_003 = 'GEN_003', // Not implemented
}

/**
 * Base error class for all Nexus errors
 */
export abstract class NexusError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.cause = cause;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializes the error to a plain object for logging/transmission
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message
    };
  }
}

/**
 * Errors related to orchestration operations
 */
export class OrchestrationError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.ORC_001 | ErrorCode.ORC_002 | ErrorCode.ORC_003 | ErrorCode.ORC_004,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to node execution
 */
export class NodeError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.ND_001 | ErrorCode.ND_002 | ErrorCode.ND_003 | ErrorCode.ND_004,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to memory operations
 */
export class MemoryError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.MEM_001 | ErrorCode.MEM_002 | ErrorCode.MEM_003 | ErrorCode.MEM_004,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to tool execution
 */
export class ToolError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.TOL_001 | ErrorCode.TOL_002 | ErrorCode.TOL_003 | ErrorCode.TOL_004 | ErrorCode.TOL_005,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to model provider operations
 */
export class ModelError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.MOD_001 | ErrorCode.MOD_002 | ErrorCode.MOD_003 | ErrorCode.MOD_004,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to context operations
 */
export class ContextError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.CTX_001 | ErrorCode.CTX_002 | ErrorCode.CTX_003,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to runtime operations
 */
export class RuntimeError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.RT_001 | ErrorCode.RT_002 | ErrorCode.RT_003 | ErrorCode.RT_004,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Errors related to data operations
 */
export class DataError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.DAT_001 | ErrorCode.DAT_002 | ErrorCode.DAT_003,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}

/**
 * Generic validation errors
 */
export class ValidationError extends NexusError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, ErrorCode.GEN_002, details, cause);
  }
}

/**
 * Error thrown when a feature is not implemented
 */
export class NotImplementedError extends NexusError {
  constructor(
    message: string = 'This feature is not yet implemented',
    details?: Record<string, unknown>
  ) {
    super(message, ErrorCode.GEN_003, details);
  }
}

/**
 * Type guard to check if an error is a NexusError
 */
export function isNexusError(value: unknown): value is NexusError {
  return value instanceof NexusError;
}

/**
 * Creates a safe error response for API transmission
 */
export function createErrorResponse(error: unknown): Record<string, unknown> {
  if (isNexusError(error)) {
    return error.toJSON();
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: ErrorCode.GEN_001,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
  }
  
  return {
    name: 'Unknown',
    message: String(error),
    code: ErrorCode.GEN_001,
    timestamp: new Date().toISOString()
  };
}
