/**
 * Orchestration Engine Package
 * 
 * Provides DAG execution engine, node execution, and orchestration.
 */

// Re-export DAG utilities
export { DAGBuilder, DAGUtils, DAGValidationError } from '@nexus/systems/orchestration/engine/dag';

// Re-export executor
export { NodeExecutor, createExecutor } from '@nexus/systems/orchestration/engine/executor';
export type { ExecutorConfig } from '@nexus/systems/orchestration/engine/executor';

// Re-export parallel executor
export { ParallelExecutor, createParallelExecutor } from '@nexus/systems/orchestration/engine/src/parallel-executor';
export type { ParallelExecutorConfig } from '@nexus/systems/orchestration/engine/src/parallel-executor';

// Re-export execution planner
export { ExecutionPlanner, createExecutionPlanner } from '@nexus/systems/orchestration/engine/src/execution-planner';
export type { ExecutionPlannerConfig } from '@nexus/systems/orchestration/engine/src/execution-planner';

// Re-export orchestrator
export { MinimalOrchestrator, createOrchestrator } from '@nexus/systems/orchestration/engine/orchestrator';
export type { MinimalOrchestratorConfig } from '@nexus/systems/orchestration/engine/orchestrator';

// Re-export worker pool - split into type and value exports
export type { WorkerPool, WorkerPoolConfig, WorkerNode } from '@nexus/systems/orchestration/engine/src/worker-pool';

// Re-export error handling components - split into type and value exports
export type { ErrorHandlerConfig, OrchestrationError, ErrorType, ErrorSeverity, ErrorHandlingDecision } from '@nexus/systems/orchestration/engine/src/error-handler';

// Re-export retry strategy - split into type and value exports
export type { RetryConfig } from '@nexus/systems/orchestration/engine/src/retry-strategy';

// Re-export circuit breaker - split into type and value exports
export { CircuitBreaker, CircuitBreakerFactory, createCircuitBreakerFactory, executeNodeWithCircuitBreaker } from '@nexus/systems/orchestration/engine/src/circuit-breaker';
export type { CircuitBreakerConfig, CircuitBreakerStatus } from '@nexus/systems/orchestration/engine/src/circuit-breaker';