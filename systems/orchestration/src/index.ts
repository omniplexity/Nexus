/**
 * Orchestration System Package
 * 
 * DAG-based execution engine for Nexus.
 * Provides task orchestration, node execution, and workflow management.
 */

// Re-export from engine
export {
  DAGBuilder,
  DAGUtils,
  DAGValidationError,
  NodeExecutor,
  createExecutor,
  MinimalOrchestrator,
  createOrchestrator,
} from './engine/index';

// Re-export from nodes
export { 
  ReasoningNode,
  ReasoningNodeFactory,
  createReasoningNodeFactory,
  NodeTypeRegistry,
  NodeUtils,
  defaultNodeRegistry,
} from './nodes';
export type {
  BaseNode,
  ReasoningNodeOptions,
  NodeRegistryEntry,
  NodeExecutionResult,
  NodeCreator,
} from './nodes';

// Re-export types from contracts
export type {
  Orchestrator,
  OrchestratorConfig,
  Task,
  TaskStatus,
  TaskConstraints,
  ExecutionContext,
  ExecutionResult,
  ExecutionMetrics,
  DAG,
  DAGEdge,
} from '@nexus/core/contracts/orchestrator';

export type {
  Node,
  NodeType,
  NodeConfig,
  NodeInput,
  NodeOutput,
  NodeStatus,
  RetryConfig,
} from '@nexus/core/contracts/node';
