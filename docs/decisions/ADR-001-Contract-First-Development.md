# ADR-001: Contract-First Development

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-002](./ADR-002-Layered-Architecture.md), [ADR-003](./ADR-003-TypeScript-First.md)

## Context

Nexus is a complex cognitive operating system with multiple interconnected subsystems. Before implementing any feature, there needs to be a clear definition of what each component should do, what inputs it accepts, and what outputs it produces. Without this clarity, we risk:

- Inconsistent interfaces between components
- Difficulties in testing and mocking
- Rewriting implementations due to unclear contracts
- Cross-layer dependency violations
- Difficulty in swapping implementations

The AGENTS.md explicitly mandates "Contract-First Development" as a non-negotiable rule, requiring all systems to begin with interfaces, type definitions, and input/output schemas before any implementation.

## Decision

Nexus will follow a Contract-First Development approach where:

1. **All systems begin with contracts** - Interfaces, type definitions, and input/output schemas are defined before implementation
2. **Core contracts are prioritized** - The following contracts must be defined first in `/core/contracts`:
   - Orchestrator contract
   - Node contract
   - Tool contract
   - Memory contract
   - Model Provider contract
3. **Interfaces are versionable** - Contracts must not depend on implementation details, enabling future evolution
4. **Single responsibility** - Each contract defines one specific capability or behavior

### Implementation Structure

```
core/contracts/
├── orchestrator.ts  # Orchestration contract
├── node.ts           # Node execution contract
├── tool.ts           # Tool capability contract
├── memory.ts         # Memory abstraction contract
├── model-provider.ts # Model provider contract
├── errors.ts         # Error contract
└── events.ts         # Event contract
```

## Consequences

### Positive

- **Clear boundaries**: Each component has well-defined responsibilities and interfaces
- **Testability**: Contracts can be mocked or stubbed for testing
- **Extensibility**: New implementations can be swapped without breaking consumers
- **Type safety**: TypeScript interfaces provide compile-time safety
- **Documentation**: Contracts serve as executable documentation
- **Parallel development**: Teams can work on different components once contracts are agreed
- **Reduced rework**: Clear contracts reduce the likelihood of implementing wrong behavior

### Negative

- **Upfront time investment**: Designing contracts takes time before implementation can begin
- **Potential over-abstraction**: Risk of creating interfaces that are too generic
- **Contract evolution**: Changing contracts after implementation requires coordinated updates

## Related Decisions

- [ADR-002: Layered Architecture](./ADR-002-Layered-Architecture.md) - Contract-first supports the layered architecture by ensuring clean interfaces between layers
- [ADR-003: TypeScript First](./ADR-003-TypeScript-First.md) - TypeScript enables compile-time contract validation
