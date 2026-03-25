<!-- markdownlint-disable MD033 MD041 -->

# Nexus

> Cognitive operating system for AI orchestration

Nexus is a TypeScript monorepo for building a local-first orchestration system around contracts, DAG execution, memory, and context preparation. The codebase is organized so each layer depends only on the layer below it, with contracts defined before implementation.

[![License: MIT](https://img.shields.io/badge/License-MIT-%23FF6B6B.svg?style=flat-square)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?logo=typescript&style=flat-square)](#)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&style=flat-square)](#)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?style=flat-square)](#validation)

## Current Status

Nexus has completed Phase 7 and is now in the post-roadmap continuation state.

| Phase | Status | Notes |
|---|---:|---|
| Phase 0 | Complete | Repository structure and kernel scaffolding |
| Phase 1 | Complete | Core contracts and versioned interfaces |
| Phase 2 | Complete | Minimal vertical slice |
| Phase 3 | Complete | Graph execution engine and orchestration |
| Phase 4 | Complete | Context engine, memory, prioritization, routing, compression |
| Phase 5 | Complete | Capability fabric, tool runtime, policy, and orchestration integration |
| Phase 6 | Complete | UI control surface, websocket live stream, web and desktop shells |
| Phase 7 | Complete | Optimization layer, adaptive budgets, normalized caches, cache-aware metrics |

## What Phase 5 Added

Phase 5 turned tool contracts into a usable runtime instead of a placeholder.

- Core `ToolInvoker` boundary in `core/contracts/tool.ts`
- Buildable `@nexus/tools` workspace package in `modules/tools/`
- Runtime registry, cache, executor, schema validation, and policy helpers
- Built-in tools: `filesystem.read_file`, `filesystem.list_directory`, `http.get`
- Real `ToolNode` execution through injected runtime instead of simulation
- Explicit DAG execution path through `task.metadata.dag`
- Phase 5 tests for runtime, policies, built-ins, and orchestration integration

## What Phase 6 Added

Phase 6 exposed the backend through a real control surface.

- Workspace snapshot endpoint at `/api/workspace`
- Native WebSocket live stream on `/ws` for task, log, status, and graph updates
- Browser workspace shell in `apps/web/`
- Desktop launcher in `apps/desktop/`
- CLI `inspect` and `watch` commands for the workspace control surface
- Shared workspace state hub in `interfaces/api/src/workspace.ts`

## What Phase 7 Added

Phase 7 tightened the runtime without changing user-facing behavior.

- Shared optimization contracts in `core/contracts/optimization.ts`
- Adaptive context token budgeting and snapshot reuse
- Stable cache-key normalization for context and tool caches
- Explicit tool cache TTLs for read-only built-ins
- Cache-aware orchestration metrics and adaptive concurrency limits

## Continuation

The original 0-7 phase sequence is complete. Future work will be tracked as a new continuation stream instead of extending the completed phase roadmap.

- Phase docs remain as the historical record of what was implemented
- New work should be added as separate roadmap entries when it is defined
- The current codebase is stable enough to continue from without reopening prior phases

## Repository Layout

| Path | Purpose |
|---|---|
| `core/` | Shared contracts and types |
| `modules/tools/` | Capability fabric runtime, built-in tools, and tool contracts |
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
| Capabilities | Tool runtime, policies, and built-in tools | [docs/systems/CAPABILITIES.md](docs/systems/CAPABILITIES.md) |

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

Workspace build scripts exist, but the current clean validation baseline for the repo is `lint`, `typecheck`, and `test`.

```bash
npm run build
```

### Manual Launchers

For manual testing and UI design work, use the root launchers:

```bash
npm run launch -- api
npm run launch -- web
npm run launch -- desktop
npm run launch -- cli status
npm run launch -- cli run "What should the first screen show?"
```

The launchers do the following:

- `api` starts the API server alone
- `web` starts the API server plus the browser workspace shell from source
- `desktop` starts the API server plus the desktop shell from source
- `cli` starts the API server and runs the CLI command you pass in from source

If you need task execution through `nexus run`, set `OPENAI_API_KEY` before launching the API server.

### Workspace Commands

The repo uses npm workspaces. You can also run package-level commands directly:

```bash
npm run test --workspaces --if-present
npm run build --workspaces
```

## Development Notes

- Contracts live in `core/contracts/` and should be updated before implementation changes.
- The capability fabric is the primary Phase 5 surface area.
- The memory system is responsible for storage, retrieval, snapshots, archiving, and indexing.
- The orchestration engine consumes context services through contracts, not concrete memory internals.
- The orchestration engine consumes tool execution through the core `ToolInvoker` boundary.
- Tests use Vitest in the `systems/context`, `systems/memory`, and `modules/tools` packages.

## Useful Entry Points

| File | Purpose |
|---|---|
| [core/contracts/tool.ts](core/contracts/tool.ts) | Core tool and invoker contracts |
| [modules/tools/index.ts](modules/tools/index.ts) | Phase 5 capability fabric entry point |
| [modules/tools/runtime/executor.ts](modules/tools/runtime/executor.ts) | Tool execution runtime |
| [modules/tools/builtins/index.ts](modules/tools/builtins/index.ts) | Built-in tool registration |
| [systems/orchestration/nodes/tool.ts](systems/orchestration/nodes/tool.ts) | Real ToolNode execution path |
| [interfaces/api/src/workspace.ts](interfaces/api/src/workspace.ts) | Workspace snapshot and live state hub |
| [apps/web/src/index.ts](apps/web/src/index.ts) | Browser workspace shell |
| [apps/desktop/src/index.ts](apps/desktop/src/index.ts) | Desktop launcher for the workspace shell |

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
