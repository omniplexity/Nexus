# ADR-002: 7-Layered Architecture

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-001](./ADR-001-Contract-First-Development.md), [ADR-005](./ADR-005-DAG-Based-Orchestration.md)

## Context

Nexus is designed as a Cognitive Operating System (COS) that orchestrates reasoning, amplifies user cognition, and executes structured work. The system requires clear separation of concerns to:

- Enable independent evolution of each layer
- Maintain clear dependency directions
- Support multiple interface types (CLI, API, WebSocket)
- Allow different deployment configurations
- Facilitate testing at each level

The PRE-PROJECT-MASTER-SPEC.md defines 6 core layers, and AGENTS.md defines a strict dependency direction. We need to formalize this into a clear 7-layer architecture.

## Decision

Nexus will implement a 7-layer architecture with strict dependency direction:

```
┌─────────────────────────────────────────────┐
│           1. Experience Layer               │
│        (Apps, CLI, Desktop, Web)            │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│          2. Interface Layer                 │
│    (API, CLI Contracts, WebSocket)          │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│          3. System Layer                    │
│  (Orchestration, Context, Capabilities)     │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│           4. Module Layer                   │
│    (Agents, Tools, Integrations, etc.)      │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│           5. Core Layer                     │
│     (Contracts, Types, Config, Errors)      │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│           6. Data Layer                     │
│  (Adapters, Repositories, Schemas)          │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│          7. Runtime Layer                   │
│    (IPC, Process, Scheduler, State)         │
└─────────────────────────────────────────────┘
```

### Dependency Rules

- Each layer can only depend on layers below it
- Cross-layer violations are not allowed
- Interfaces in upper layers depend on contracts in lower layers

### Directory Structure

```
apps/           # Experience Layer
interfaces/     # Interface Layer
systems/        # System Layer
modules/        # Module Layer
core/           # Core Layer
data/           # Data Layer
runtime/        # Runtime Layer
```

## Consequences

### Positive

- **Clear separation of concerns**: Each layer has a specific responsibility
- **Testability**: Layers can be tested in isolation with mocks
- **Maintainability**: Changes in one layer don't cascade to others
- **Scalability**: Layers can be evolved independently
- **Team organization**: Teams can own specific layers
- **Deployment flexibility**: Different deployment options per layer
- **Dependency enforcement**: Prevents circular dependencies and tight coupling

### Negative

- **Indirection overhead**: Multiple layers can add complexity for simple operations
- **Initial design effort**: Requires careful planning of layer boundaries
- **Potential performance impact**: Layer transitions may add latency
- **Over-abstraction risk**: May be overkill for small features

## Related Decisions

- [ADR-001: Contract-First Development](./ADR-001-Contract-First-Development.md) - Core contracts define interfaces between layers
- [ADR-005: DAG-Based Orchestration](./ADR-005-DAG-Based-Orchestration.md) - Orchestration layer implements the DAG execution model
