# Nexus Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.0-alpha.1] - 2026-03-21

### Added

#### Core Contracts (`core/contracts/`)

- **Orchestrator contracts** ([`core/contracts/orchestrator.ts`](core/contracts/orchestrator.ts))
  - `Orchestrator` interface for task execution and DAG management
  - `Task`, `TaskStatus`, `TaskConstraints` for task definitions
  - `ExecutionContext`, `ExecutionResult`, `ExecutionMetrics` for execution
  - `DAG` interface for directed acyclic graph representation

- **Node contracts** ([`core/contracts/node.ts`](core/contracts/node.ts))
  - `Node`, `NodeType` (REASONING, TOOL, MEMORY, CONTROL, AGGREGATOR, TRANSFORM, CONDITIONAL)
  - `NodeConfig`, `NodeInput`, `NodeOutput` for node execution
  - `NodeExecutor`, `NodeFactory` for node management

- **Tool contracts** ([`core/contracts/tool.ts`](core/contracts/tool.ts))
  - `CapabilitySet`, `ToolCapability`, `ToolMetadata` for capability definitions
  - Minimal core layer tool interfaces

- **Memory contracts** ([`core/contracts/memory.ts`](core/contracts/memory.ts))
  - `Memory` interface for memory operations
  - `MemoryType` enum (ephemeral, session, persistent, derived)
  - `MemoryEntry`, `MemoryQuery`, `MemoryResult`, `MemorySnapshot`

- **Model Provider contracts** ([`core/contracts/model-provider.ts`](core/contracts/model-provider.ts))
  - `ModelProvider` interface for model abstraction
  - `ModelRole` enum (fast, reasoning, specialized)
  - `ModelConfig`, `ModelResponse`, `Prompt` for model interactions

- **Event contracts** ([`core/contracts/events.ts`](core/contracts/events.ts))
  - `TaskEvent`, `NodeEvent`, `MemoryEvent`, `SystemEvent` for inter-component communication

- **Error contracts** ([`core/contracts/errors.ts`](core/contracts/errors.ts))
  - `NexusError` base class and derived error types
  - `ValidationError`, `ExecutionError`, `TimeoutError`, `MemoryError`, `ToolError`

#### Module Contracts

- **Agent contracts** ([`modules/agents/contracts/`](modules/agents/contracts/))
  - [`agent.ts`](modules/agents/contracts/agent.ts) - Agent definition contracts
  - [`executor.ts`](modules/agents/contracts/executor.ts) - Agent execution contracts

- **Tool contracts** ([`modules/tools/contracts/`](modules/tools/contracts/))
  - [`tool.ts`](modules/tools/contracts/tool.ts) - Tool interface with input/output schemas
  - [`schema.ts`](modules/tools/contracts/schema.ts) - JSON Schema types
  - [`registry.ts`](modules/tools/contracts/registry.ts) - Tool registry for discovery

- **Integration contracts** ([`modules/integrations/contracts/`](modules/integrations/contracts/))
  - [`provider.ts`](modules/integrations/contracts/provider.ts) - Integration provider contracts
  - [`adapter.ts`](modules/integrations/contracts/adapter.ts) - Adapter pattern contracts

#### Interface Contracts

- **API contracts** ([`interfaces/contracts/api.ts`](interfaces/contracts/api.ts))
  - REST API interface definitions

- **WebSocket contracts** ([`interfaces/contracts/websocket.ts`](interfaces/contracts/websocket.ts))
  - WebSocket interface definitions

- **CLI contracts** ([`interfaces/contracts/cli.ts`](interfaces/contracts/cli.ts))
  - CLI interface definitions

#### Documentation

- [`plans/PHASE1_CORE_CONTRACTS.md`](plans/PHASE1_CORE_CONTRACTS.md) - Phase 1 implementation plan
- Updated [`README.md`](README.md) with Phase 1 completion status
- Architecture documentation in [`docs/architecture/`](docs/architecture/)
- API documentation in [`docs/api/`](docs/api/)
- System documentation in [`docs/systems/`](docs/systems/)
- Guide documentation in [`docs/guides/`](docs/guides/)

### Fixed

- [`core/types/index.ts`](core/types/index.ts) - Removed broken export, re-enabled contract exports
- [`systems/orchestration/index.ts`](systems/orchestration/index.ts) - Commented out invalid module exports

### Breaking Changes

None. This is an alpha release focused on establishing the contract layer.

### Migration Notes

This is the first alpha release. There are no migration paths as this is the initial implementation of the core contract layer.

---

## [v0.0.0] - Pre-alpha

### Added

- Initial project structure
- AGENTS.md with development protocols
- Basic project configuration (TypeScript, ESLint, Prettier)
- Architecture decision records (ADRs)
- Documentation framework

[v1.0.0-alpha.1]: https://github.com/omniplexity/nexus/releases/v1.0.0-alpha.1
[v0.0.0]: https://github.com/omniplexity/nexus/releases/v0.0.0
