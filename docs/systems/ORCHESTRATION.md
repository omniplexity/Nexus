# Orchestration System

The orchestration system is the core execution engine of Nexus, responsible for managing task execution through a Directed Acyclic Graph (DAG) structure.

## Overview

The orchestration system provides:

- **DAG-based execution** - Tasks are modeled as nodes in a directed acyclic graph
- **Dependency resolution** - Nodes execute in order based on their dependencies
- **Parallel execution** - Independent nodes can execute concurrently
- **Execution control** - Pause, resume, and cancel capabilities
- **Metrics collection** - Comprehensive execution metrics

## Contracts

### Core Interfaces

The orchestration system is defined by contracts in [`core/contracts/orchestrator.ts`](../core/contracts/orchestrator.ts) and [`core/contracts/node.ts`](../core/contracts/node.ts):

#### Orchestrator Interface

```typescript
interface Orchestrator {
  execute(task: Task, context: ExecutionContext): Promise<ExecutionResult>;
  registerNode(node: Node): void;
  getExecutionGraph(): DAG;
  pause(taskId: string): Promise<void>;
  resume(taskId: string): Promise<void>;
  cancel(taskId: string): Promise<void>;
  getTaskStatus(taskId: string): TaskStatus | null;
}
```

#### Task Definition

```typescript
interface Task {
  id: string;
  type: string;
  input: unknown;
  constraints?: TaskConstraints;
  metadata?: Record<string, unknown>;
}

interface TaskConstraints {
  maxTokens?: number;
  maxLatency?: number;
  timeout?: number;
  budget?: number;
  priority?: number;
}
```

#### DAG Structure

```typescript
interface DAG {
  id: string;
  nodes: Record<string, Node>;
  edges: DAGEdge[];
  metadata?: Record<string, unknown>;
}

interface DAGEdge {
  sourceId: string;
  targetId: string;
  condition?: string;
}
```

### Node Types

The system supports multiple node types defined in [`core/contracts/node.ts`](../core/contracts/node.ts):

| Node Type | Description |
|-----------|-------------|
| `REASONING` | LLM call node for model interactions |
| `TOOL` | Tool execution node |
| `MEMORY` | Memory retrieval/storage node |
| `CONTROL` | Control flow node (branch, loop, retry) |
| `AGGREGATOR` | Merges multiple inputs |
| `TRANSFORM` | Data transformation node |
| `CONDITIONAL` | Conditional routing node |

### Execution Context

```typescript
interface ExecutionContext {
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
```

## Architecture

The orchestration system is organized in `systems/orchestration/`:

```
systems/orchestration/
├── index.ts          # Module exports
├── engine/           # DAG execution engine
├── nodes/            # Node implementations
├── runtime/          # Runtime execution context
└── scheduler/        # Task scheduling
```

### Components

#### Engine
The execution engine manages the DAG lifecycle:
- Graph validation
- Dependency resolution
- Execution ordering
- Parallel execution coordination

#### Nodes
Node implementations for each node type:
- `ReasoningNode` - Model interaction
- `ToolNode` - Tool execution
- `MemoryNode` - Memory operations
- `ControlNode` - Flow control
- `AggregatorNode` - Input merging
- `TransformNode` - Data transformation
- `ConditionalNode` - Branching

#### Runtime
Runtime components for execution:
- Execution context management
- Variable scoping
- State persistence
- Error handling

#### Scheduler
Task scheduling and prioritization:
- Priority-based scheduling
- Resource allocation
- Timeout management

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Contracts | ✅ Complete | Phase 1 - Core contracts defined |
| DAG Structure | ✅ Complete | Contracts define DAG interface |
| Node Types | ✅ Complete | All node types defined in contracts |
| Execution Engine | 🔄 Future | Phase 2 implementation |
| Node Implementations | 🔄 Future | Phase 2+ implementation |
| Scheduler | 🔄 Future | Phase 2+ implementation |
| Runtime Context | 🔄 Future | Phase 2+ implementation |

## Usage

### Creating a Task

```typescript
import { Task, TaskConstraints } from '@nexus/core/contracts/orchestrator';

const task: Task = {
  id: 'task-001',
  type: 'analysis',
  input: { query: 'analyze the data' },
  constraints: {
    maxTokens: 4000,
    timeout: 30000,
    priority: 1
  },
  metadata: {
    description: 'Data analysis task'
  }
};
```

### Registering Nodes

```typescript
import { Orchestrator, Node, NodeType } from '@nexus/core/contracts/orchestrator';

const orchestrator = createOrchestrator(config);

// Register custom node
orchestrator.registerNode({
  id: 'node-001',
  type: NodeType.REASONING,
  name: 'Analysis Node',
  config: { timeout: 30000 },
  execute: async (input) => { /* ... */ },
  validate: () => true,
  getDependencies: () => [],
  clone: () => { /* ... */ }
});
```

### Executing a Task

```typescript
const result = await orchestrator.execute(task, executionContext);

console.log(result.status); // 'completed' | 'failed' | etc.
console.log(result.nodeOutputs); // Outputs from all nodes
console.log(result.metrics); // Execution metrics
```

## Related Files

- [`core/contracts/orchestrator.ts`](../core/contracts/orchestrator.ts) - Orchestrator contracts
- [`core/contracts/node.ts`](../core/contracts/node.ts) - Node contracts
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [ADR-005: DAG-Based Orchestration](../decisions/ADR-005-DAG-Based-Orchestration.md)
