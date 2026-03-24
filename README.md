<!-- markdownlint-disable MD033 MD041 -->

# Nexus

> Cognitive operating system for AI orchestration

Nexus is a TypeScript monorepo for building a local-first orchestration system around contracts, DAG execution, memory, and context preparation. The codebase is organized so each layer depends only on the layer below it, with contracts defined before implementation.

[![License: MIT](https://img.shields.io/badge/License-MIT-%23FF6B6B.svg?style=flat-square)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?logo=typescript&style=flat-square)](#)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&style=flat-square)](#)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?style=flat-square)](#validation)

## Current Status

Nexus is currently at the end of Phase 4.

| Phase | Status | Notes |
|---|---:|---|
| Phase 0 | Complete | Repository structure and kernel scaffolding |
| Phase 1 | Complete | Core contracts and versioned interfaces |
| Phase 2 | Complete | Minimal vertical slice |
| Phase 3 | Complete | Graph execution engine and orchestration |
| Phase 4 | Complete | Context engine, memory, prioritization, routing, compression |
| Phase 5 | Planned | Capability fabric |
| Phase 6 | Planned | UI control surface |
| Phase 7 | Planned | Optimization layer |

## What Phase 4 Added

Phase 4 turned the context layer into a real subsystem instead of a placeholder.

- Context engine contracts in `core/contracts/context-engine.ts`
- `DefaultContextEngineService` in `systems/context/src/engine/service.ts`
- Memory query support for `sessionIds`
- Context routing with complexity-aware budgets
- Context compression strategies: truncate, summarize, hybrid
- Memory prioritization with weighted scoring
- Multi-session aggregation and deduplication
- Vector index aware filtering for semantic retrieval
- Orchestrator integration with automatic context preparation

## Repository Layout

| Path | Purpose |
|---|---|
| `core/` | Shared contracts and types |
| `systems/context/` | Context engine, cache, prioritizer, router, compressor |
| `systems/memory/` | In-memory memory store, archive, vector index |
| `systems/orchestration/` | DAG execution engine and node implementations |
| `interfaces/` | External entry points and API surfaces |
| `apps/` | CLI and application shells |
| `docs/` | Architecture, system, guide, and API docs |
| `meta/` | Roadmap, changelog, and governance |

## Architecture

Nexus follows a contract-first, layered design:

```text
apps -> interfaces -> systems -> core
                  -> modules
                  -> data
                  -> runtime
```

The important rule is simple: implementation flows downward, never upward.

### Core Systems

| System | Responsibility | Docs |
|---|---|---|
| Orchestration | DAG execution, scheduling, and node coordination | [docs/systems/ORCHESTRATION.md](docs/systems/ORCHESTRATION.md) |
| Context | Routing, compression, prioritization, and context slicing | [docs/systems/CONTEXT.md](docs/systems/CONTEXT.md) |
| Memory | Retrieval, storage, archiving, and vector indexing | [docs/systems/MEMORY.md](docs/systems/MEMORY.md) |
| Models | Model provider abstraction | [docs/systems/MODELS.md](docs/systems/MODELS.md) |
| Capabilities | Tool and capability contracts | [docs/systems/CAPABILITIES.md](docs/systems/CAPABILITIES.md) |

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer

### Install

```bash
npm install
```

### Validate

```bash
npm run lint
npm run typecheck
npm test
```

### Build

```bash
npm run build
```

### Workspace Commands

The repo uses npm workspaces. You can also run package-level commands directly:

```bash
npm run test --workspaces --if-present
npm run build --workspaces
```

## Development Notes

- Contracts live in `core/contracts/` and should be updated before implementation changes.
- The context engine is the primary Phase 4 surface area.
- The memory system is responsible for storage, retrieval, snapshots, archiving, and indexing.
- The orchestration engine consumes context services through contracts, not concrete memory internals.
- Tests use Vitest in the `systems/context` and `systems/memory` packages.

## Useful Entry Points

| File | Purpose |
|---|---|
| [core/contracts/context-engine.ts](core/contracts/context-engine.ts) | Phase 4 context engine contracts |
| [systems/context/src/engine/service.ts](systems/context/src/engine/service.ts) | Context engine implementation |
| [systems/context/src/router/index.ts](systems/context/src/router/index.ts) | Context routing |
| [systems/memory/src/store.ts](systems/memory/src/store.ts) | In-memory memory store |
| [systems/orchestration/engine/orchestrator.ts](systems/orchestration/engine/orchestrator.ts) | DAG orchestrator integration |

## Documentation

### Guides

- [docs/guides/GETTING_STARTED.md](docs/guides/GETTING_STARTED.md)
- [docs/guides/DEVELOPMENT.md](docs/guides/DEVELOPMENT.md)
- [docs/guides/CONTRACT_DEVELOPMENT.md](docs/guides/CONTRACT_DEVELOPMENT.md)
- [docs/guides/TESTING.md](docs/guides/TESTING.md)
- [docs/guides/CONTEXT.md](docs/guides/CONTEXT.md)
- [docs/guides/MEMORY.md](docs/guides/MEMORY.md)

### Architecture

- [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md)
- [docs/architecture/LAYERS.md](docs/architecture/LAYERS.md)
- [docs/architecture/DATA_FLOW.md](docs/architecture/DATA_FLOW.md)
- [docs/architecture/COMPONENT_MAP.md](docs/architecture/COMPONENT_MAP.md)
- [docs/architecture/BOUNDARIES.md](docs/architecture/BOUNDARIES.md)

### System Docs

- [docs/systems/INDEX.md](docs/systems/INDEX.md)
- [docs/systems/ORCHESTRATION.md](docs/systems/ORCHESTRATION.md)
- [docs/systems/CONTEXT.md](docs/systems/CONTEXT.md)
- [docs/systems/MODELS.md](docs/systems/MODELS.md)
- [docs/systems/MEMORY.md](docs/systems/MEMORY.md)

### Reference

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [STYLEGUIDE.md](STYLEGUIDE.md)
- [GLOSSARY.md](GLOSSARY.md)
- [AGENTS.md](AGENTS.md)
- [meta/roadmap/ROADMAP.md](meta/roadmap/ROADMAP.md)
- [meta/changelog/CHANGELOG.md](meta/changelog/CHANGELOG.md)

## Validation

The current baseline for the repository is:

- `npm run lint` passes
- `npm run typecheck` passes
- `npm test` passes

## License

MIT. See [LICENSE](LICENSE).

<!-- markdownlint-enable MD033 MD041 -->
