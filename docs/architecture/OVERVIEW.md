# Nexus Architecture Overview

> **Version:** 1.0.0  
> **Status:** Phase 5 Complete (Capability Fabric)  
> **Last Updated:** 2026-03-24

---

## 1. Executive Summary

Nexus is a **deterministic autonomous development system** designed to orchestrate complex multi-step tasks through a directed acyclic graph (DAG) execution model. The architecture follows a **strict layered design** with contract-first development principles, ensuring type safety, testability, and maintainability across all subsystems.

### Key Characteristics

| Attribute | Value |
|-----------|-------|
| Execution Model | DAG-based task orchestration |
| Architecture Style | Layered, contract-first |
| Primary Language | TypeScript |
| Dependency Direction | Outer → Inner (apps → runtime) |
| Error Handling | Structured error codes with typed exceptions |

---

## 2. Design Principles

### 2.1 No Hallucination Policy

> The system MUST never invent files, APIs, or behaviors. Uncertain states must be explicitly declared.

- All contracts must be defined before implementations
- No assumptions about undocumented structure
- No fabricated dependencies

### 2.2 Structure First Policy

Before writing any code:

1. Ensure directory exists
2. Ensure correct domain placement
3. Ensure alignment with architecture specification

### 2.3 Contract-First Development

All systems begin with:

- **Interfaces** - Type definitions and contracts
- **Input/Output schemas** - Clear data contracts
- **No implementation before contracts**

### 2.4 Single Responsibility

Each file/module must:

- Do one thing only
- Be independently testable
- Avoid side effects unless explicitly required

### 2.5 No Cross-Layer Violations

Strict dependency direction:

```
apps → interfaces → systems → core → modules → data → runtime
```

---

## 3. System Boundaries

### 3.1 External Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     External Clients                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │   Web   │  │ Desktop │  │   CLI   │  │   API   │         │
│  │   App   │  │   App   │  │         │  │ Clients │         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Interfaces Layer                       │
│              (API, CLI, WebSocket, Events)                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Internal Boundaries

Each layer has strict boundaries:

| Layer | Responsibility | Dependencies | Status |
|-------|---------------|--------------|--------|
| `apps/` | Application entry points | interfaces | CLI ✅, Web ✗, Desktop ✗ |
| `interfaces/` | External I/O adapters | systems | API ✅, WebSocket ✗, CLI ✗ |
| `systems/` | Business logic orchestration | core | ✅ Mostly Complete |
| `core/` | Fundamental contracts | None (pure) | ✅ Complete |
| `modules/` | Capability implementations | core | Tools ✅, other modules contracts-only |
| `data/` | Persistence layer | core types | ✗ Planned |
| `runtime/` | Execution environment | core | ✗ Planned |

---

## 4. Phase Roadmap

### Phase 1: Core Contracts ✅ Complete

**Status:** Core contract interfaces implemented

| Contract | Location | Purpose |
|----------|----------|---------|
| Orchestrator | [`core/contracts/orchestrator.ts`](../../core/contracts/orchestrator.ts) | Task execution & DAG management |
| Node | [`core/contracts/node.ts`](../../core/contracts/node.ts) | DAG node types & execution |
| Tool | [`core/contracts/tool.ts`](../../core/contracts/tool.ts) | Tool capability primitives |
| Memory | [`core/contracts/memory.ts`](../../core/contracts/memory.ts) | Context & memory management |
| Model Provider | [`core/contracts/model-provider.ts`](../../core/contracts/model-provider.ts) | Multi-provider abstraction |
| Events | [`core/contracts/events.ts`](../../core/contracts/events.ts) | Inter-component communication |
| Errors | [`core/contracts/errors.ts`](../../core/contracts/errors.ts) | Structured error types |

### Phase 2: Minimal Vertical Slice ✅ Complete

- Basic orchestration engine
- Single node type execution
- CLI interface implementation
- REST API implementation

### Phase 3: Graph Execution Engine ✅ Complete

- Full DAG structure (see [`systems/orchestration/engine/dag.ts`](../../systems/orchestration/engine/dag.ts))
- Node execution logic (see [`systems/orchestration/nodes/`](../../systems/orchestration/nodes/))
- Task scheduler (see [`systems/orchestration/scheduler/`](../../systems/orchestration/scheduler/))
- Circuit breaker & retry strategies

### Phase 4: Context Engine ✅ Complete

- Memory abstraction (see [`systems/memory/`](../../systems/memory/))
- Retrieval system (vector-index)
- Context compression (see [`systems/context/src/compressor/`](../../systems/context/src/compressor/))
- Response caching (see [`systems/context/src/cache/`](../../systems/context/src/cache/))
- Context prioritization (see [`systems/context/src/prioritizer/`](../../systems/context/src/prioritizer/))

### Phase 5: Capability Fabric ✅ Complete

- Tool interface implementation (see [`modules/tools/contracts/`](../../modules/tools/contracts/))
- Tool registry, executor, cache, and policy runtime (see [`modules/tools/runtime/`](../../modules/tools/runtime/))
- Built-in read-only tools (see [`modules/tools/builtins/`](../../modules/tools/builtins/))
- Orchestration integration through `ToolInvoker` and real `ToolNode` execution
- Agent contracts remain in place for future implementation phases

### Phase 6: UI Control Surface (Planned)

- Web application (see [`apps/web/`](../../apps/web/))
- Desktop application (see [`apps/desktop/`](../../apps/desktop/))
- Workspace layout
- Execution visualization

### Phase 7: Optimization Layer (Planned)

- Caching
- Token reduction
- Parallel execution tuning

---

## 5. Core Abstractions

### 5.1 Task & Execution

```typescript
// From core/contracts/orchestrator.ts
interface Task {
  id: string;
  type: string;
  input: unknown;
  constraints?: TaskConstraints;
}

interface ExecutionContext {
  sessionId: string;
  userId?: string;
  memory: MemorySnapshot;
  capabilities: CapabilitySet;
  variables: Record<string, unknown>;
}
```

### 5.2 DAG Structure

```typescript
// From core/contracts/orchestrator.ts
interface DAG {
  id: string;
  nodes: Record<string, Node>;
  edges: DAGEdge[];
}

interface Node {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  execute(input: NodeInput): Promise<NodeOutput>;
}
```

### 5.3 Node Types

```typescript
// From core/contracts/node.ts
enum NodeType {
  REASONING = 'reasoning',    // LLM call node
  TOOL = 'tool',              // Tool execution node
  MEMORY = 'memory',          // Memory retrieval/storage node
  CONTROL = 'control',        // Control flow node (branch, loop, retry)
  AGGREGATOR = 'aggregator',  // Merges multiple inputs
  TRANSFORM = 'transform',    // Data transformation node
  CONDITIONAL = 'conditional'  // Conditional routing node
}
```

---

## 6. Error Handling

### Error Code Hierarchy

| Prefix | Domain | Example |
|--------|--------|---------|
| `ORC-xxx` | Orchestration | ORC_001: Orchestration failed |
| `ND-xxx` | Node | ND_001: Node not found |
| `MEM-xxx` | Memory | MEM_001: Memory retrieval failed |
| `TOL-xxx` | Tool | TOL_001: Tool not found |
| `MOD-xxx` | Model | MOD_001: Provider unavailable |
| `CTX-xxx` | Context | CTX_001: Compression failed |
| `RT-xxx` | Runtime | RT_001: IPC communication failed |
| `DAT-xxx` | Data | DAT_001: Database connection failed |

All errors extend [`NexusError`](../../core/contracts/errors.ts) for consistent handling.

---

## 7. Event System

### Event Namespaces

```typescript
// From core/contracts/events.ts
enum EventNamespace {
  ORCHESTRATION = 'orchestration',
  NODE = 'node',
  TOOL = 'tool',
  MEMORY = 'memory',
  MODEL = 'model',
  CONTEXT = 'context',
  RUNTIME = 'runtime',
  AGENT = 'agent',
  SYSTEM = 'system'
}
```

---

## 8. Forward References

### Planned Features (Phase 2-7)

| Feature | Phase | Description |
|---------|-------|-------------|
| DAG Execution | 3 | Full directed acyclic graph execution engine |
| Context Compression | 4 | Token budget management for LLM prompts |
| Tool Registry | 5 | Dynamic tool discovery and execution |
| Multi-Provider | 5 | OpenAI, Anthropic, local model support |
| Web UI | 6 | Execution visualization and control |
| Caching Layer | 7 | Response caching and token optimization |

---

## 9. Quick Reference

### Directory Structure

```
Nexus/
├── apps/              # Application entry points (cli ✅, web ✗, desktop ✗)
├── interfaces/        # External I/O adapters (api ✅, cli ✗, websocket ✗)
├── systems/           # Business logic orchestration
│   ├── orchestration/ # ✅ DAG execution engine (complete)
│   ├── context/        # ✅ Context management (complete)
│   ├── cognitive/     # ✗ Reasoning & planning (planned)
│   ├── execution/     # ✗ Task execution (planned)
│   ├── memory/        # ✅ Memory systems (complete)
│   └── models/        # ✅ Model abstraction (complete)
├── core/              # ✅ Fundamental contracts (complete)
│   └── contracts/    # Interface definitions
├── modules/           # Capability implementations
│   ├── agents/       # Contracts defined
│   ├── tools/        # ✅ Tool runtime and contracts
│   ├── integrations/ # Contracts defined
│   └── workflows/    # Planned
├── data/              # ✗ Persistence layer (planned)
│   ├── adapters/     # Database adapters
│   ├── repositories/ # Data access
│   └── schemas/      # Data schemas
└── runtime/          # ✗ Execution environment (planned)
    ├── process/      # Process management
    ├── scheduler/    # Task scheduling
    └── sandbox/      # Execution sandbox
```

> **Legend:** ✅ = Implemented | ✗ = Not Yet Implemented | Contracts = Interface contracts defined

### Key Files

| File | Purpose |
|------|---------|
| [`core/contracts/index.ts`](../../core/contracts/index.ts) | Core contract exports |
| [`core/contracts/orchestrator.ts`](../../core/contracts/orchestrator.ts) | Orchestration interface |
| [`core/contracts/node.ts`](../../core/contracts/node.ts) | Node interface |
| [`core/contracts/memory.ts`](../../core/contracts/memory.ts) | Memory interface |
| [`AGENTS.md`](../../AGENTS.md) | Architecture rules |

---

## 10. Related Documentation

- [LAYERS.md](LAYERS.md) - Detailed layer breakdown
- [DATA_FLOW.md](DATA_FLOW.md) - Data flow through system
- [COMPONENT_MAP.md](COMPONENT_MAP.md) - Component relationships
- [BOUNDARIES.md](BOUNDARIES.md) - Module boundaries & interfaces
