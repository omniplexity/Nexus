# ADR-004: Multi-Provider Model Abstraction

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-001](./ADR-001-Contract-First-Development.md), [ADR-005](./ADR-005-DAG-Based-Orchestration.md)

## Context

Nexus is designed as a model-agnostic system that can leverage multiple AI providers:

- **Provider diversity**: OpenAI, Anthropic, Google, local models, and future providers
- **Hot-swapping**: Ability to switch providers without code changes
- **Cost optimization**: Route requests based on cost constraints
- **Latency optimization**: Choose fastest model for the task
- **Specialization**: Use specialized models for specific tasks
- **Vendor independence**: Avoid lock-in to any single provider

The PRE-PROJECT-MASTER-SPEC.md explicitly states "Model-agnostic architecture" as a secondary objective, and AGENTS.md mandates "No direct model calls outside provider layer."

## Decision

Nexus will implement a model provider abstraction layer:

### Architecture

```
┌─────────────────────────────────────┐
│         System Layer                │
│   (Orchestration, Context, etc.)    │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│      systems/models/                │
│   ┌─────────────────────────────┐   │
│   │     Model Router            │   │
│   │  (Task → Provider mapping)  │   │
│   └─────────────────────────────┘   │
│                    ↓                │
│   ┌─────────────────────────────┐   │
│   │   Model Provider Interface  │   │
│   └─────────────────────────────┘   │
│                    ↓                │
│   ┌─────────────────────────────┐   │
│   │ ┌──────┐ ┌──────┐ ┌───────┐ │   │
│   │ │OpenAI│ │Anthro│ │Local  │ │   │
│   │ │Adapt.│ │Adapt.│ │Adapt. │ │   │
│   │ └──────┘ └──────┘ └───────┘ │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Contract Requirements

The model provider abstraction must define:

1. **Unified interface**: Standard methods for chat, completion, embedding
2. **Configuration schema**: Provider-specific settings
3. **Response normalization**: Consistent response format across providers
4. **Error handling**: Provider-agnostic error types

### Model Roles

| Role | Description | Use Case |
|------|-------------|----------|
| Fast Model | Low latency | Simple queries, routing |
| Reasoning Model | Complex tasks | Planning, analysis |
| Specialized Model | Domain-specific | Code, math, vision |

### Routing Strategy

- **Task complexity**: Route based on task complexity
- **Cost constraints**: Optimize for budget limits
- **Latency targets**: Choose fastest suitable model
- **Capabilities**: Match model capabilities to task needs

## Consequences

### Positive

- **Provider independence**: Not locked into any single vendor
- **Flexibility**: Easy to add new providers
- **Optimization**: Route based on cost/latency
- **Testing**: Mock providers for testing
- **Future-proof**: New models can be integrated easily
- **Consistency**: Unified API across all providers

### Negative

- **Abstraction complexity**: Some provider-specific features may not translate
- **Performance overhead**: Abstraction layer adds latency
- **Feature gaps**: Not all providers support all features
- **Maintenance**: Each provider adapter needs updates

## Related Decisions

- [ADR-001: Contract-First Development](./ADR-001-Contract-First-Development.md) - Model provider contract defined in core/contracts
- [ADR-005: DAG-Based Orchestration](./ADR-005-DAG-Based-Orchestration.md) - DAG nodes can specify which model role to use
