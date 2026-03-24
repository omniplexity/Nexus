# Nexus Systems Documentation

This directory contains detailed documentation for each major system in the Nexus architecture.

## Overview

Nexus is built on a layered architecture with clear separation of concerns. Each system has well-defined responsibilities and communicates through contracts defined in [`core/contracts/`](../core/contracts/).

## Systems Index

| System | Description | Status |
|--------|-------------|--------|
| [ORCHESTRATION.md](ORCHESTRATION.md) | DAG-based task orchestration and workflow execution with Context Engine and Capability Fabric integration | Phase 5 |
| [CONTEXT.md](CONTEXT.md) | Context management, compression, prioritization, and routing (ContextEngineService) | Phase 4 |
| [MODELS.md](MODELS.md) | Multi-provider model abstraction and routing | Phase 1 |
| [CAPABILITIES.md](CAPABILITIES.md) | Tool capability fabric, runtime execution, policy enforcement, and built-in tools | Phase 5 |
| [COGNITIVE.md](COGNITIVE.md) | Intent recognition, planning, and strategy systems | Future |
| [MEMORY.md](MEMORY.md) | Persistent and ephemeral memory management with Vector Index | Phase 4 |
| [EXECUTION.md](EXECUTION.md) | Runtime execution engine and sandboxing | Future |

## Phase Status

### Phase 1: Core Contracts (Complete)
- [`core/contracts/orchestrator.ts`](../core/contracts/orchestrator.ts) - Orchestration interfaces
- [`core/contracts/node.ts`](../core/contracts/node.ts) - DAG node types
- [`core/contracts/memory.ts`](../core/contracts/memory.ts) - Memory/context interfaces
- [`core/contracts/model-provider.ts`](../core/contracts/model-provider.ts) - Model abstraction
- [`core/contracts/tool.ts`](../core/contracts/tool.ts) - Tool capability interfaces

### Phase 2: Vertical Slice (Complete)
- Minimal task execution
- Basic orchestration without parallel processing
- Simple memory interface

### Phase 3: Graph Execution Engine (Complete)
- DAG-based execution engine
- Node implementations (Reasoning, Tool, Memory, Control, etc.)
- Parallel execution support
- Priority and resource scheduling

### Phase 4: Context Engine (Complete)
- [`core/contracts/context-engine.ts`](../core/contracts/context-engine.ts) - Context engine contracts
- [`systems/context/src/engine/service.ts`](../systems/context/src/engine/service.ts) - ContextEngineService implementation
- Context routing with complexity detection
- Memory prioritization with weighted scoring
- Context compression (truncate, summarize, hybrid)
- Vector index integration for semantic search
- Multi-session context aggregation
- Memory Node with shared store support in DAG
- Orchestrator integration: `setMemoryService()` and `setContextEngine()`
- Automatic context preparation in task execution

### Phase 5: Capability Fabric (Complete)
- [`core/contracts/tool.ts`](../../core/contracts/tool.ts) - `ToolInvoker` execution boundary
- [`modules/tools/index.ts`](../../modules/tools/index.ts) - Tool workspace package entry point
- Registry, cache, executor, and validation runtime
- Filesystem and network policy enforcement
- Built-in tools: `filesystem.read_file`, `filesystem.list_directory`, `http.get`
- Orchestrator integration through injected tool runtime

### Future Phases
Implementation of systems beyond the control surface will proceed in subsequent phases:

- **Phase 7**: Optimization Layer

See [ARCHITECTURE](../architecture/OVERVIEW.md) for full phase details.

## Documentation Conventions

Each system document follows this structure:

1. **Overview** - System purpose and responsibilities
2. **Contracts** - Interface definitions from `core/contracts/`
3. **Architecture** - Component breakdown
4. **Implementation Status** - What's implemented vs. planned
5. **Usage** - How to use the system
6. **Related Files** - Links to related documentation

## Related Documentation

- [Architecture Overview](../architecture/OVERVIEW.md)
- [Layered Architecture](../architecture/LAYERS.md)
- [Component Map](../architecture/COMPONENT_MAP.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [Core Contracts](../../core/contracts/)
