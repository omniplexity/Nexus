/**
 * Tool Contracts for Nexus
 * 
 * Defines the tool capability interface for the capability fabric.
 */

import type { ToolExecutionError } from '@nexus/core/contracts/tool';

import type { ToolInputSchema, ToolOutputSchema } from './schema';

/**
 * Tool lifecycle status
 * Used when tracking tool availability and state
 */
export enum ToolLifecycleStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DEPRECATED = 'deprecated'
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  sessionId: string;
  userId?: string;
  capabilities: ToolCapabilities;
  variables: Record<string, unknown>;
  abortSignal?: AbortSignal;
  metadata: {
    requestId: string;
    executionId?: string;
    timestamp: Date;
  };
}

/**
 * Tool capabilities available to tools
 */
export interface ToolCapabilities {
  filesystem: {
    read: boolean;
    write: boolean;
    delete: boolean;
    list: boolean;
  };
  network: {
    http: boolean;
    websocket: boolean;
  };
  codeExecution: {
    sandboxed: boolean;
    timeout: number;
  };
  vectorSearch: boolean;
}

/**
 * Tool result
 */
export interface ToolExecutionResult {
  success: boolean;
  output: unknown;
  error?: ToolExecutionError;
  metadata: {
    toolId: string;
    toolName: string;
    duration: number;
    tokensUsed?: number;
    cacheHit?: boolean;
    executionId?: string;
  };
}



/**
 * Tool configuration
 */
export interface ToolConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTtlMs?: number;
  sandboxed?: boolean;
}

/**
 * Tool capability interface
 * @version 1.0.0
 */
export interface Tool {
  /** Unique tool identifier */
  id: string;
  
  /** Human-readable tool name */
  name: string;
  
  /** Tool description for the model */
  description: string;
  
  /** JSON Schema for input validation */
  inputSchema: ToolInputSchema;
  
  /** JSON Schema for output */
  outputSchema: ToolOutputSchema;
  
  /** Tool lifecycle status */
  status: ToolLifecycleStatus;
  
  /** Tool configuration */
  config: ToolConfig;
  
  /**
   * Execute the tool with the given input
   */
  execute(input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  
  /**
   * Validate input against schema
   */
  validateInput(input: unknown): { valid: boolean; errors?: string[] };
  
  /**
   * Validate output against schema
   */
  validateOutput(output: unknown): { valid: boolean; errors?: string[] };
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata;
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  author?: string;
  examples?: ToolExample[];
}

/**
 * Tool usage example
 */
export interface ToolExample {
  input: unknown;
  output: unknown;
  description: string;
}

/**
 * Tool factory interface
 */
export interface ToolFactory<T extends Tool = Tool> {
  /**
   * Create a new tool instance
   */
  create(config: ToolConfig): T;
  
  /**
   * Get tool type identifier
   */
  getType(): string;
}

/**
 * Tool descriptor for registration
 */
export interface ToolDescriptor {
  type: string;
  factory: ToolFactory;
  metadata: ToolMetadata;
}
