# Architecture Decision Records (ADR) Index

This directory contains Architecture Decision Records (ADRs) for the Nexus project. ADRs document significant architectural decisions made during the development of Nexus, including the context, decision, and consequences.

## What is an ADR?

An Architecture Decision Record is a document that captures an important architectural decision made along with its context and consequences. ADRs help maintain a historical record of why certain architectural choices were made.

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: Title

- **Status**: [Proposed | Accepted | Deprecated | Superseded]
- **Date**: YYYY-MM-DD
- **Deciders**: [List of decision makers]
- **Related ADRs**: [List of related ADR numbers]

## Context

[Description of the issue motivating this decision]

## Decision

[Description of the chosen solution]

## Consequences

### Positive
- [List of positive outcomes]

### Negative
- [List of negative outcomes or trade-offs]

## Related Decisions
- [ADR-XXX: Title] - [Brief relationship description]
```

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./ADR-001-Contract-First-Development.md) | Contract-First Development | Accepted |
| [ADR-002](./ADR-002-Layered-Architecture.md) | 7-Layered Architecture | Accepted |
| [ADR-003](./ADR-003-TypeScript-First.md) | TypeScript as Primary Language | Accepted |
| [ADR-004](./ADR-004-Multi-Provider-Model-Abstraction.md) | Multi-Provider Model Abstraction | Accepted |
| [ADR-005](./ADR-005-DAG-Based-Orchestration.md) | DAG-Based Task Orchestration | Accepted |
| [ADR-006](./ADR-006-Event-Driven-Communication.md) | Event-Driven Communication | Accepted |
| [ADR-007](./ADR-007-Local-First-Data-Storage.md) | Local-First Data Storage | Accepted |

## Creating New ADRs

When making a new architectural decision:

1. Create a new file named `ADR-XXX-Title.md` in this directory
2. Use the format above
3. Update this INDEX.md to include the new ADR
4. Set status to "Proposed" initially
5. Update to "Accepted" once approved

## References

- [Michael Nygard's ADR Template](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)
- [GitHub ADR Repository](https://github.com/joelparkerhenderson/architecture_decision_record)
