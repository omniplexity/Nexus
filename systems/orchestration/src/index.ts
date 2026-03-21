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
} from './engine';

// Re-export from nodes
export {
  BaseNode,
  ReasoningNode,
  ReasoningNodeOptions,
  ReasoningNodeFactory,
  createReasoningNodeFactory,
  NodeTypeRegistry,
  NodeUtils,
  defaultNodeRegistry,
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
} from '../../core/contracts/orchestrator';

export type {
  Node,
  NodeType,
  NodeConfig,
  NodeInput,
  NodeOutput,
  NodeStatus,
  RetryConfig,
} from '../../core/contracts/node';
