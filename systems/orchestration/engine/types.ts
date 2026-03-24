/**
 * DAG Enhancement Types for Parallel Execution
 * 
 * Defines types and interfaces for enhanced DAG functionality
 * including parallel execution groups, subgraphs, and execution metadata.
 */

/**
 * Parallel execution group definition
 * Nodes in the same group can execute concurrently
 */
export interface ParallelExecutionGroup {
  id: string;
  nodeIds: string[];
  /**
   * Maximum number of nodes that can run concurrently in this group
   * If undefined, uses orchestrator's maxConcurrentNodes setting
   */
  maxConcurrent?: number;
  /**
   * Shared resources for this group (e.g., database connections, API clients)
   */
  sharedResources?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Subgraph definition for hierarchical DAG execution
 */
export interface Subgraph {
  id: string;
  /**
   * Nodes that belong to this subgraph
   */
  nodeIds: string[];
  /**
   * Entry points to the subgraph (nodes that can be executed first)
   */
  entryPoints: string[];
  /**
   * Exit points from the subgraph (nodes that must complete before leaving)
   */
  exitPoints: string[];
  /**
   * Whether this subgraph can be executed in parallel with others
   */
  parallelizable: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced DAG metadata for execution planning and monitoring
 */
export interface EnhancedDAGMetadata extends Record<string, unknown> {
  /**
   * Original DAG metadata
   */
  original?: Record<string, unknown>;
  /**
   * Parallel execution groups
   */
  parallelGroups: ParallelExecutionGroup[];
  /**
   * Subgraphs for hierarchical execution
   */
  subgraphs: Subgraph[];
  /**
   * Resource requirements for the entire DAG
   */
  resourceRequirements?: {
    minMemoryMB?: number;
    maxMemoryMB?: number;
    minCPUCores?: number;
    maxCPUCores?: number;
    estimatedTokens?: number;
  };
  /**
   * Execution hints for the scheduler
   */
  executionHints?: {
    /**
     * Suggested execution strategy: 'sequential', 'parallel', 'adaptive'
     */
    strategy?: 'sequential' | 'parallel' | 'adaptive';
    /**
     * Priority level for the entire DAG (higher = more important)
     */
    priority?: number;
    /**
     * Deadline for execution (timestamp)
     */
    deadline?: number;
    /**
     * Estimated duration in milliseconds
     */
    estimatedDurationMs?: number;
  };
  /**
   * Profiling and debugging information
   */
  profiling?: {
    /**
     * Timestamp when DAG was created
     */
    createdAt: number;
    /**
     * Timestamp when DAG was last modified
     */
    modifiedAt: number;
    /**
     * Version of the DAG structure
     */
    version: string;
    /**
     * Tags for categorization and filtering
     */
    tags?: string[];
  };
}

/**
 * Enhanced DAG interface extending the base DAG contract
 */
import type { DAG } from '@nexus/core/contracts/orchestrator';

/**
 * Enhanced DAG interface extending the base DAG contract
 * Extends DAG to be compatible where DAG is expected
 */
export interface EnhancedDAG extends DAG {
  metadata?: EnhancedDAGMetadata;
}

/**
 * Validation result for enhanced DAG validation
 */
export interface EnhancedDAGValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Execution layer definition for organizing nodes into executable layers
 * Nodes in the same layer can execute in parallel
 */
export interface ExecutionLayer {
  id: string;
  nodeIds: string[];
  /**
   * Dependencies on other layers (layer IDs that must complete before this layer)
   */
  dependencies: string[];
  /**
   * Whether this layer can be executed in parallel
   */
  parallelizable: boolean;
  metadata?: Record<string, unknown>;
}