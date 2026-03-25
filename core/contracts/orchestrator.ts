/**
 * Orchestrator Contracts for Nexus
 * 
 * Defines the core orchestration interfaces for task execution
 * and DAG-based workflow management.
 */

// Core contracts imports
// 
// Architecture Note: This file imports from node, memory, and tool contracts.
// We use 'type' imports to avoid circular dependency issues at runtime.
// If future changes create circular imports, resolve by:
// 1. Creating a shared 'types.ts' for truly common types
// 2. Using forward references
// 3. Reorganizing into a 'shared' or 'base' subdirectory
//
// Note: CapabilitySet from core/tool.ts is the minimal core primitive.
// Full tool capabilities are defined in modules/tools/contracts/tool.ts
import type { MemorySnapshot } from './memory';
import type { Node, NodeOutput } from './node';
import type { OptimizationConfig } from './optimization';
import type { CapabilitySet } from './tool';

/**
 * Task status enumeration
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Task constraints for execution
 */
export interface TaskConstraints {
  maxTokens?: number;
  maxLatency?: number;
  timeout?: number;
  budget?: number;
  priority?: number;
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  type: string;
  input: unknown;
  constraints?: TaskConstraints;
  metadata?: Record<string, unknown>;
}

/**
 * Execution context passed to all nodes
 */
export interface ExecutionContext {
  sessionId: string;
  userId?: string;
  memory: MemorySnapshot;
  capabilities: CapabilitySet;
  variables: Record<string, unknown>;
  metadata: {
    startTime: Date;
    attemptNumber: number;
    correlationId?: string;
  };
}

/**
 * Result of task execution
 */
export interface ExecutionResult {
  taskId: string;
  status: TaskStatus;
  output: unknown;
  error?: string;
  metrics: ExecutionMetrics;
  /**
   * Node outputs keyed by node ID
   * Using Record for JSON serializability instead of Map
   */
  nodeOutputs: Record<string, NodeOutput>;
}

/**
 * Execution metrics for observability
 */
export interface ExecutionMetrics {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  totalTokens: number;
  totalLatencyMs: number;
  cacheHits: number;
}

/**
 * Directed Acyclic Graph representation
 */
export interface DAG {
  id: string;
  /**
   * Nodes keyed by node ID
   * Using Record for JSON serializability instead of Map
   */
  nodes: Record<string, Node>;
  edges: DAGEdge[];
  metadata?: Record<string, unknown>;
}

/**
 * Edge in the DAG representing dependency
 */
export interface DAGEdge {
  sourceId: string;
  targetId: string;
  condition?: string;
}

/**
 * Core orchestrator interface
 * @version 1.0.0
 */
export interface Orchestrator {
  /**
   * Execute a task with the given input and context
   */
  execute(task: Task, context: ExecutionContext): Promise<ExecutionResult>;
  
  /**
   * Register a node type with the orchestrator
   */
  registerNode(node: Node): void;
  
  /**
   * Get the current execution graph
   */
  getExecutionGraph(): DAG;
  
  /**
   * Pause a running task
   */
  pause(taskId: string): Promise<void>;
  
  /**
   * Resume a paused task
   */
  resume(taskId: string): Promise<void>;
  
  /**
   * Cancel a running task
   */
  cancel(taskId: string): Promise<void>;
  
  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | null;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxConcurrentNodes?: number;
  defaultTimeout?: number;
  enableCaching?: boolean;
  enableMetrics?: boolean;
  optimization?: OptimizationConfig;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

/**
 * Orchestrator factory function type
 */
export type OrchestratorFactory = (config: OrchestratorConfig) => Orchestrator;
