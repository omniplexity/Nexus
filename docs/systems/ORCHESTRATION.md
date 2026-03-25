# Orchestration System

The orchestration system is the core execution engine of Nexus, responsible for managing task execution through a Directed Acyclic Graph (DAG) structure.

## Overview

The orchestration system provides:

- **DAG-based execution** - Tasks are modeled as nodes in a directed acyclic graph
- **Dependency resolution** - Nodes execute in order based on their dependencies
- **Parallel execution** - Independent nodes can execute concurrently
- **Execution control** - Pause, resume, and cancel capabilities
- **Metrics collection** - Comprehensive execution metrics
- **Context Engine Integration** - Automatic context preparation for LLM nodes

## Phase 4 Context Engine Integration

The orchestrator now integrates with the Context Engine to automatically prepare context for task execution:

### New Methods

#### `setMemoryService(memory: Memory): void`

Sets the memory service for context retrieval. The memory service is used to:
- Retrieve memory snapshots for execution context
- Support MemoryNode operations in DAG execution

```typescript
import { createOrchestrator } from '@nexus/systems-orchestration';
import { createMemoryStore } from '@nexus/systems-memory';

const orchestrator = createOrchestrator();
const memory = createMemoryStore();

orchestrator.setMemoryService(memory);
```

#### `setContextEngine(contextEngine: ContextEngineService): void`

Sets the context engine for context preparation. When set, the orchestrator will automatically:
1. Prepare context before task execution
2. Populate ExecutionContext with MemorySnapshot
3. Inject ContextSlice into variables for nodes to access

```typescript
import { createOrchestrator } from '@nexus/systems-orchestration';
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';

const orchestrator = createOrchestrator();
const contextEngine = createContextEngineService(memory, vectorIndex);

orchestrator.setContextEngine(contextEngine);
```

### ExecutionContext Population

When both memory service and context engine are set, the orchestrator automatically populates the ExecutionContext:

```typescript
interface ExecutionContext {
  sessionId: string;
  userId?: string;
  memory: MemorySnapshot;        // Populated from memory.getSnapshot()
  capabilities: CapabilitySet;
  variables: Record<string, unknown>;  // Includes contextSlice
  metadata: {
    startTime: Date;
    attemptNumber: number;
    correlationId?: string;
  };
}

// contextSlice is injected into variables:
// context.variables.contextSlice = {
//   system: string;           // System prompt
//   conversation: string;    // Compressed conversation
//   tools: string;           // Available tools description
//   totalTokens: number;     // Total tokens in slice
//   memoryIds: string[]      // IDs of memories included
// }
```

## Phase 7 Optimization Additions

Phase 7 extends orchestration with optimization-aware execution data without changing task semantics:

- cache hits are counted in execution metrics
- parallel execution adapts to DAG size and worker-pool capacity
- node-level cache metadata is preserved through orchestration metrics
- optimization config can be threaded through orchestrator settings

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
├── index.ts              # Module exports
├── engine/               # DAG execution engine
│   ├── orchestrator.ts  # MinimalOrchestrator implementation
│   ├── dag.ts           # DAG builder and utilities
│   ├── executor.ts      # Node executor
│   └── types.ts         # Type definitions
├── nodes/                # Node implementations
│   ├── base.ts          # Base node interface
│   ├── memory.ts        # Memory node (with shared store support)
│   ├── reasoning.ts     # Reasoning node
│   ├── tool.ts          # Tool node
│   ├── control.ts       # Control flow nodes
│   ├── aggregator.ts    # Aggregator node
│   ├── transform.ts    # Transform node
│   └── conditional.ts   # Conditional node
├── runtime/              # Runtime execution context
└── scheduler/            # Task scheduling
```

### Components

#### Engine
The execution engine manages the DAG lifecycle:
- Graph validation
- Dependency resolution
- Execution ordering
- Parallel execution coordination
- Context preparation integration

#### Nodes
Node implementations for each node type:
- `ReasoningNode` - Model interaction
- `ToolNode` - Tool execution
- `MemoryNode` - Memory operations (supports injected store)
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
| Execution Engine | ✅ Complete | Phase 3 - DAG execution engine implemented |
| Node Implementations | ✅ Complete | Phase 3 - All node types implemented |
| Scheduler | ✅ Complete | Phase 3 - Priority and resource schedulers implemented |
| Runtime Context | ✅ Complete | Phase 3 - Basic runtime context implemented |
| setMemoryService() | ✅ Complete | Phase 4 - Memory integration |
| setContextEngine() | ✅ Complete | Phase 4 - Context preparation |
| MemoryNode Integration | ✅ Complete | Phase 4 - Shared memory store support |

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

### Executing a Task with Context Engine

```typescript
// Setup memory and context engine
const memory = createMemoryStore();
const contextEngine = createContextEngineService(memory, vectorIndex);

const orchestrator = createOrchestrator({
  maxConcurrentNodes: 4
});

// Register services
orchestrator.setMemoryService(memory);
orchestrator.setContextEngine(contextEngine);

// Execute task - context is automatically prepared
const result = await orchestrator.execute(task, {
  sessionId: 'session-123',
  userId: 'user-456',
  memory: { session: [], persistent: [], derived: [], totalTokens: 0 },
  capabilities: {},
  variables: {},
  metadata: {
    startTime: new Date(),
    attemptNumber: 1
  }
});

console.log(result.status); // 'completed' | 'failed' | etc.
console.log(result.nodeOutputs); // Outputs from all nodes
console.log(result.metrics); // Execution metrics
```

### Memory Node with Shared Store

The MemoryNode supports injected memory store for shared instance usage:

```typescript
import { createMemoryNode } from '@nexus/systems-orchestration/nodes/memory';
import { createMemoryStore, createVectorIndex } from '@nexus/systems-memory';

const memory = createMemoryStore();
const vectorIndex = createVectorIndex();

// Create nodes with shared store
const retrieveNode = createMemoryNode({
  id: 'retrieve-prefs',
  name: 'Retrieve Preferences',
  operation: 'retrieve',
  memoryType: 'persistent',
  query: 'user preferences',
  limit: 5,
  memoryStore: memory  // Shared store
});

const storeNode = createMemoryNode({
  id: 'store-interaction',
  name: 'Store Interaction',
  operation: 'store',
  memoryType: 'session',
  memoryStore: memory  // Same instance
});

const searchNode = createMemoryNode({
  id: 'search-knowledge',
  name: 'Search Knowledge Base',
  operation: 'search',
  query: 'authentication',
  limit: 10,
  memoryStore: memory,
  vectorIndex: vectorIndex  // Semantic search
});

const archiveNode = createMemoryNode({
  id: 'cleanup-old',
  name: 'Archive Old Memories',
  operation: 'archive',
  memoryStore: memory
});
```

### Memory Node Operations

| Operation | Description | Parameters |
|-----------|-------------|------------|
| `retrieve` | Fetch memories matching query | `query`, `memoryType`, `limit` |
| `store` | Store new memory entry | `memoryType` |
| `delete` | Delete specific memory or clear session | `memoryId` or `sessionId` |
| `search` | Semantic search via vector index | `query`, `limit` |
| `archive` | Archive memories older than date | `olderThanDays` |

## Execution Flow Diagram

```
Task Input
    │
    ▼
┌─────────────────────┐
│   Orchestrator     │
│   execute()        │
└─────────────────────┘
    │
    ├── [If contextEngine set]
    │       │
    │       ▼
    │   ┌─────────────────────┐
    │   │ Context Engine      │
    │   │ prepareContext()    │
    │   └─────────────────────┘
    │       │
    │       ├── Query Memory
    │       ├── Route Request
    │       ├── Prioritize
    │       ├── Compress
    │       │
    │       ▼
    │   ┌─────────────────────┐
    │   │ ExecutionContext   │
    │   │ memory = Snapshot  │
    │   │ variables.context  │
    │   │   Slice = {...}    │
    │   └─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   Build DAG         │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   Execute Nodes     │
│   (Sequential or    │
│    Parallel)        │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   ExecutionResult   │
│   - status          │
│   - output          │
│   - metrics         │
│   - nodeOutputs     │
└─────────────────────┘
```

## Related Files

- [`core/contracts/orchestrator.ts`](../core/contracts/orchestrator.ts) - Orchestrator contracts
- [`core/contracts/node.ts`](../core/contracts/node.ts) - Node contracts
- [`systems/orchestration/engine/orchestrator.ts`](../systems/orchestration/engine/orchestrator.ts) - MinimalOrchestrator implementation
- [`systems/orchestration/nodes/memory.ts`](../systems/orchestration/nodes/memory.ts) - Memory node with shared store
- [`systems/context/src/engine/service.ts`](../systems/context/src/engine/service.ts) - Context engine service
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [CONTEXT.md](CONTEXT.md) - Context engine system
- [MEMORY.md](MEMORY.md) - Memory system
- [ADR-005: DAG-Based Orchestration](../decisions/ADR-005-DAG-Based-Orchestration.md)
