/**
 * Tool Registry Contracts for Nexus
 * 
 * Defines the tool registry interface for tool management
 * and discovery.
 */

import type { Tool, ToolExecutionContext, ToolExecutionResult } from './tool';

/**
 * Registry entry metadata
 */
export interface RegistryEntry {
  tool: Tool;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

/**
 * Tool search filter
 */
export interface ToolFilter {
  name?: string;
  category?: string;
  tags?: string[];
  status?: string;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /**
   * Register a tool with the registry
   */
  register(tool: Tool): void;
  
  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean;
  
  /**
   * Get a tool by ID
   */
  get(toolId: string): Tool | undefined;
  
  /**
   * Get a tool by name
   */
  getByName(name: string): Tool | undefined;
  
  /**
   * List all registered tools
   */
  list(filter?: ToolFilter): Tool[];
  
  /**
   * Search tools by name or description
   */
  search(query: string, limit?: number): Tool[];
  
  /**
   * Check if a tool exists
   */
  has(toolId: string): boolean;
  
  /**
   * Get registry statistics
   */
  getStats(): RegistryStats;
  
  /**
   * Clear all tools from registry
   */
  clear(): void;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalTools: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  mostUsed: { toolId: string; usageCount: number }[];
}

/**
 * Tool executor interface
 */
export interface ToolExecutor {
  /**
   * Execute a tool by ID
   */
  execute(toolId: string, input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  
  /**
   * Execute a tool by name
   */
  executeByName(toolName: string, input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  
  /**
   * Execute multiple tools in parallel
   */
  executeParallel(
    requests: { toolId: string; input: unknown }[],
    context: ToolExecutionContext
  ): Promise<Map<string, ToolExecutionResult>>;
  
  /**
   * Cancel a running tool execution
   */
  cancel(executionId: string): void;
  
  /**
   * Get running executions
   */
  getRunning(): RunningExecution[];
}

/**
 * Running execution information
 */
export interface RunningExecution {
  executionId: string;
  toolId: string;
  toolName: string;
  startTime: Date;
  status: 'running' | 'cancelling';
}

/**
 * Tool cache interface
 */
export interface ToolCache {
  /**
   * Get cached result
   */
  get(key: string): ToolExecutionResult | undefined;
  
  /**
   * Store result in cache
   */
  set(key: string, result: ToolExecutionResult, ttl?: number): void;
  
  /**
   * Invalidate cache entries
   */
  invalidate(pattern: string): number;
  
  /**
   * Clear cache
   */
  clear(): void;
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
  sizeBytes: number;
}
