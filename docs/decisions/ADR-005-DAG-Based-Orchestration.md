# ADR-005: DAG-Based Task Orchestration

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-001](./ADR-001-Contract-First-Development.md), [ADR-002](./ADR-002-Layered-Architecture.md), [ADR-004](./ADR-004-Multi-Provider-Model-Abstraction.md)

## Context

Nexus replaces traditional linear prompt-response loops with structured task execution. The system needs to:

- **Orchestrate complex workflows**: Multi-step tasks with dependencies
- **Enable parallel execution**: Independent nodes run simultaneously
- **Handle failures gracefully**: Isolate and retry failed components
- **Provide visibility**: Full trace of execution path
- **Support branching**: Conditional logic based on results
- **Maintain determinism**: All steps must be traceable and reproducible

The PRE-PROJECT-MASTER-SPEC.md explicitly defines "Execution Model" using Directed Acyclic Graphs (DAGs), and AGENTS.md requires "deterministic" and "no hidden execution paths" for orchestration.

## Decision

Nexus will use a DAG (Directed Acyclic Graph) based orchestration system:

### Graph Structure

```
Task Graph
├── Reasoning Node (LLM call)
├── Tool Node (external/internal function)
├── Memory Node (retrieval or storage)
└── Control Node (conditional branching, looping, retry)
```

### Execution Model

1. **Dependency Resolution**: Nodes execute only when their dependencies are satisfied
2. **Parallel Execution**: Independent nodes run concurrently
3. **Failure Isolation**: Failed nodes don't cascade unless explicitly connected
4. **State Checkpoints**: Save state at key points for recovery

### Node Types

| Node Type | Purpose | Example |
|-----------|---------|---------|
| Reasoning | LLM calls | Generate response |
| Tool | External functions | File operations, API calls |
| Memory | Data retrieval/storage | Context fetch, result storage |
| Control | Flow control | Conditionals, loops, retries |

### Implementation Requirements

```
systems/orchestration/
├── engine/      # DAG execution engine
├── nodes/       # Node type definitions
├── runtime/     # Runtime context
└── scheduler/   # Execution scheduling
```

## Consequences

### Positive

- **Parallelism**: Maximize throughput with concurrent node execution
- **Visualization**: Easy to visualize and understand workflows
- **Debugging**: Clear failure points and execution paths
- **Reusability**: Graphs can be composed and reused
- **Optimization**: Scheduler can optimize execution order
- **Determinism**: Full traceability of execution

### Negative

- **Complexity**: More complex than linear execution
- **Graph building**: Requires upfront design of task structure
- **Debugging challenges**: Distributed failures can be harder to trace
- **Overhead**: Graph structure adds execution overhead
- **Cyclic dependencies**: Must ensure no cycles in the graph

## Related Decisions

- [ADR-001: Contract-First Development](./ADR-001-Contract-First-Development.md) - Node contract defined in core/contracts
- [ADR-002: Layered Architecture](./ADR-002-Layered-Architecture.md) - Orchestration is in the System Layer
- [ADR-004: Multi-Provider Model Abstraction](./ADR-004-Multi-Provider-Model-Abstraction.md) - DAG can specify which model role each reasoning node uses
