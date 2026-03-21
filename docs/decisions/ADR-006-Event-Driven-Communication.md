# ADR-006: Event-Driven Communication

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-001](./ADR-001-Contract-First-Development.md), [ADR-002](./ADR-002-Layered-Architecture.md), [ADR-005](./ADR-005-DAG-Based-Orchestration.md)

## Context

Nexus is a complex system with multiple interconnected components that need to communicate:

- **Decoupling**: Components should not have direct dependencies on each other
- **Reactivity**: The system should respond to state changes and external events
- **Observability**: Events provide a natural mechanism for monitoring and debugging
- **Extensibility**: New capabilities can subscribe to relevant events
- **Concurrency**: Asynchronous event handling supports parallel execution
- **User feedback**: Real-time updates to users during long-running operations

The PRE-PROJECT-MASTER-SPEC.md defines an Event contract in core/contracts, and the system needs to support multiple interfaces (CLI, API, WebSocket) that benefit from event-based updates.

## Decision

Nexus will implement an event-driven communication system:

### Event Architecture

```
┌─────────────────────────────────────────────┐
│              Event Bus                      │
│   (Central event distribution)              │
└─────────────────────────────────────────────┘
         ↑                    ↓
┌─────────────────┐   ┌─────────────────────┐
│   Publishers    │   │    Subscribers      │
│  (Nodes, Tools, │   │  (UI, Memory,       │
│   Orchestrator) │   │   Logging, etc.)    │
└─────────────────┘   └─────────────────────┘
```

### Event Types

| Category | Events | Description |
|----------|--------|-------------|
| Orchestration | `task.start`, `task.complete`, `task.fail` | Task lifecycle |
| Node | `node.start`, `node.complete`, `node.fail` | Node execution |
| Tool | `tool.invoke`, `tool.complete`, `tool.error` | Tool operations |
| Memory | `memory.store`, `memory.retrieve`, `memory.evict` | Memory operations |
| Model | `model.request`, `model.response`, `model.error` | Model calls |
| System | `system.ready`, `system.error`, `config.change` | System state |

### Contract Requirements

```
core/contracts/events.ts
├── Event types (discriminated union)
├── Event emitter interface
├── Event handler type
└── Event listener registration
```

### Implementation Patterns

1. **Typed events**: All events have TypeScript types
2. **Async handling**: Event handlers are async by default
3. **Error isolation**: Handler errors don't break the event emitter
4. **Subscription management**: Easy subscribe/unsubscribe patterns
5. **Filtering**: Subscribers can filter events

## Consequences

### Positive

- **Loose coupling**: Publishers and subscribers don't know about each other
- **Flexibility**: Easy to add new subscribers without modifying publishers
- **Real-time updates**: WebSocket clients receive live updates
- **Debugging**: Event logs provide execution history
- **Testing**: Events can be easily mocked
- **Extensibility**: Plugin system can subscribe to relevant events
- **Scalability**: Event processing can be distributed

### Negative

- **Complexity**: Event flows can be harder to trace than direct calls
- **Race conditions**: Out-of-order events can cause issues
- **Memory leaks**: Forgotten subscriptions can cause memory issues
- **Debugging challenges**: Asynchronous event chains can be hard to debug
- **Overhead**: Event system adds some latency

## Related Decisions

- [ADR-001: Contract-First Development](./ADR-001-Contract-First-Development.md) - Event contract defined in core/contracts
- [ADR-002: Layered Architecture](./ADR-002-Layered-Architecture.md) - Events span across layers
- [ADR-005: DAG-Based Orchestration](./ADR-005-DAG-Based-Orchestration.md) - DAG execution emits events for visibility
