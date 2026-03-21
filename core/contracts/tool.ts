/**
 * Tool Contracts for Nexus
 * 
 * Defines the core tool capability interfaces.
 * This is the minimal set of tool types needed by core contracts.
 */

/**
 * Tool execution status
 * Used when tracking tool execution lifecycle
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Tool result
 */
export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: ToolExecutionError;
  metadata: {
    toolId: string;
    duration: number;
    tokensUsed?: number;
  };
}

/**
 * Tool execution error for result objects
 * 
 * This is a plain type for serialization in ToolResult, not a class.
 * For throwing errors, use ToolError from errors.ts.
 * This separation avoids circular dependency and keeps contracts minimal.
 */
export type ToolExecutionError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Tool context for execution
 */
export interface ToolContext {
  sessionId: string;
  userId?: string;
  capabilities: CapabilitySet;
  variables: Record<string, unknown>;
}

/**
 * Capability set available to tools
 */
export interface CapabilitySet {
  canAccessFilesystem: boolean;
  canExecuteCode: boolean;
  canAccessNetwork: boolean;
  canUseVectorSearch: boolean;
  customCapabilities: Record<string, boolean>;
}

/**
 * Tool input/output schema reference
 * (Full schema defined in modules/tools/contracts/schema.ts)
 */
export interface ToolSchema {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}
