# Nexus Systems Documentation

This directory contains detailed documentation for each major system in the Nexus architecture.

## Overview

Nexus is built on a layered architecture with clear separation of concerns. Each system has well-defined responsibilities and communicates through contracts defined in [`core/contracts/`](../core/contracts/).

## Systems Index

| System | Description | Status |
|--------|-------------|--------|
| [ORCHESTRATION.md](ORCHESTRATION.md) | DAG-based task orchestration and workflow execution | Phase 1 |
| [CONTEXT.md](CONTEXT.md) | Context management, compression, and memory routing | Phase 1 |
| [MODELS.md](MODELS.md) | Multi-provider model abstraction and routing | Phase 1 |
| [CAPABILITIES.md](CAPABILITIES.md) | Tool capability system and execution | Phase 1 |
| [COGNITIVE.md](COGNITIVE.md) | Intent recognition, planning, and strategy systems | Future |
| [MEMORY.md](MEMORY.md) | Persistent and ephemeral memory management | Phase 1 |
| [EXECUTION.md](EXECUTION.md) | Runtime execution engine and sandboxing | Future |

## Phase Status

### Phase 1: Core Contracts (Complete)
- [`core/contracts/orchestrator.ts`](../core/contracts/orchestrator.ts) - Orchestration interfaces
- [`core/contracts/node.ts`](../core/contracts/node.ts) - DAG node types
- [`core/contracts/memory.ts`](../core/contracts/memory.ts) - Memory/context interfaces
- [`core/contracts/model-provider.ts`](../core/contracts/model-provider.ts) - Model abstraction
- [`core/contracts/tool.ts`](../core/contracts/tool.ts) - Tool capability interfaces

### Future Phases
Implementation of systems based on Phase 1 contracts will proceed in subsequent phases:

- **Phase 2**: Graph Execution Engine
- **Phase 3**: Context Engine
- **Phase 4**: Capability Fabric
- **Phase 5**: UI Control Surface
- **Phase 6**: Optimization Layer

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
- [Core Contracts](../core/contracts/)
