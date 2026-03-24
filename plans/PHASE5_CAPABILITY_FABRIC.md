# Phase 5: Capability Fabric Implementation Plan

## Overview

This document captures the Phase 5 implementation plan for Nexus and the design that was executed. Phase 5 delivers the **Capability Fabric**: a real tool runtime under `modules/tools`, policy-aware built-in tools, and orchestration integration through a core-facing execution boundary.

**Phase 5 Goal**: turn tool contracts into a usable runtime without violating architecture boundaries. Systems continue to depend only on `core`, while `modules/tools` owns concrete tool execution, validation, caching, and policy enforcement.

---

## Current State Analysis

### What Was Complete Before Phase 5

| Component | Status | Notes |
|-----------|--------|-------|
| Phase 4 Context Engine | ✅ Complete | Memory, routing, compression, prioritization, and orchestrator context preparation were already implemented |
| Core Tool Contracts | ✅ Complete | Minimal tool primitives already existed in `core/contracts/tool.ts` |
| Extended Tool Contracts | ✅ Complete | Tool, registry, and schema contracts already existed in `modules/tools/contracts/` |
| ToolNode Shell | ⚠️ Partial | `systems/orchestration/nodes/tool.ts` existed as a simulation stub |

### Gaps Addressed by Phase 5

| Gap | Status Before | Phase 5 Action |
|-----|---------------|----------------|
| `modules/tools` workspace package | ❌ Missing | Added package metadata, tsconfig, exports, and tests |
| Runtime registry and executor | ❌ Missing | Implemented registry, executor, cache, and validation helpers |
| Policy enforcement | ❌ Missing | Added filesystem and network policy contracts plus enforcement helpers |
| Built-in tools | ❌ Missing | Added `filesystem.read_file`, `filesystem.list_directory`, and `http.get` |
| Orchestration integration | ❌ Missing | Added `ToolInvoker` boundary and wired `ToolNode` to real runtime execution |

---

## Phase 5 Architecture

### Execution Boundary

```text
systems/orchestration -> core/contracts/tool.ts -> modules/tools
```

- `core/contracts/tool.ts` defines the minimal `ToolInvoker` bridge.
- `systems/orchestration` injects a `ToolInvoker` into `ToolNode` and never imports `modules/tools`.
- `modules/tools` owns concrete runtime behavior: registry, cache, executor, policies, and built-in tools.

### Package Structure

```text
modules/tools/
├── contracts/
│   ├── tool.ts
│   ├── registry.ts
│   ├── schema.ts
│   └── policy.ts
├── runtime/
│   ├── base-tool.ts
│   ├── schema-validator.ts
│   ├── registry.ts
│   ├── cache.ts
│   ├── executor.ts
│   ├── invoker.ts
│   └── policy.ts
├── builtins/
│   ├── filesystem/
│   │   ├── read-file.ts
│   │   └── list-directory.ts
│   └── http/
│       └── get.ts
└── test-helpers/
    └── fake-tool.ts
```

---

## Phase 5 Deliverables

### 5.1 Package and Contract Enablement

- Add `modules/*` to npm workspaces.
- Create `modules/tools/package.json`, `modules/tools/tsconfig.json`, and `modules/tools/index.ts`.
- Extend `core/contracts/tool.ts` with `ToolInvocationRequest` and `ToolInvoker`.
- Add `modules/tools/contracts/policy.ts` for filesystem and network policy definitions.

### 5.2 Tool Runtime Core

- Implement `InMemoryToolRegistry` for registration, search, stats, and duplicate protection.
- Implement `MemoryToolCache` with TTL-aware caching and cache metrics.
- Implement `DefaultToolExecutor` for lookup, input validation, capability checks, timeout/cancel, retry, cache integration, and output validation.
- Implement shared schema validation helpers and a reusable `BaseTool`.

### 5.3 Built-in Tools

- `filesystem.read_file`
- `filesystem.list_directory`
- `http.get`

These tools are read-only, policy-constrained, and validated through schemas.

### 5.4 Orchestration Integration

- Replace simulated `ToolNode` behavior with real `ToolInvoker` execution.
- Add `MinimalOrchestrator.setToolInvoker()` for runtime injection.
- Allow explicit DAG execution through `task.metadata.dag` so mixed reasoning/tool graphs can be validated without changing task contracts.

### 5.5 Documentation Alignment

- Update `README.md`, `docs/architecture/OVERVIEW.md`, `docs/systems/INDEX.md`, and `docs/systems/CAPABILITIES.md`.

---

## Implementation Order

| Step | Focus | Result |
|------|-------|--------|
| 1 | Workspace and contract setup | `modules/tools` becomes a real package and `ToolInvoker` is added |
| 2 | Runtime core | Registry, cache, executor, policy helpers, and validation utilities land |
| 3 | Built-in tools | Filesystem and HTTP tools are implemented |
| 4 | Orchestration bridge | `ToolNode` and `MinimalOrchestrator` execute real tools |
| 5 | Validation and docs | Tests, README, system docs, and architecture docs are updated |

---

## File Creation Summary

### New Files

```text
plans/PHASE5_CAPABILITY_FABRIC.md
modules/tools/package.json
modules/tools/tsconfig.json
modules/tools/index.ts
modules/tools/contracts/policy.ts
modules/tools/runtime/*
modules/tools/builtins/*
modules/tools/test-helpers/fake-tool.ts
modules/tools/vitest.config.ts
```

### Updated Files

```text
package.json
tsconfig.json
core/contracts/tool.ts
systems/orchestration/nodes/tool.ts
systems/orchestration/engine/orchestrator.ts
systems/orchestration/src/index.ts
systems/orchestration/src/nodes/index.ts
README.md
docs/architecture/OVERVIEW.md
docs/systems/INDEX.md
docs/systems/CAPABILITIES.md
```

---

## Documentation Updates

| Document | Update |
|----------|--------|
| `README.md` | Phase 5 status, runtime summary, validation surface |
| `docs/architecture/OVERVIEW.md` | Phase roadmap and module status |
| `docs/systems/INDEX.md` | Capabilities system marked as Phase 5 |
| `docs/systems/CAPABILITIES.md` | Real runtime, policy, and built-in tool documentation |

---

## Success Criteria

Phase 5 is complete when:

- [x] `modules/tools` is a workspace package
- [x] Registry, cache, executor, and policy helpers are implemented
- [x] Built-in read-only filesystem and HTTP tools are implemented
- [x] `ToolNode` executes real tools through a core-facing boundary
- [x] Phase 5 tests cover runtime behavior, policies, built-ins, and orchestration integration
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm test` passes

---

## Out of Scope

- plugin discovery and dynamic loading
- shell execution
- file write and delete tools
- code execution tools
- vector-search tool implementation
- agent implementations
- UI work

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Boundary violations between `systems` and `modules` | Use `ToolInvoker` in `core` as the only orchestration-facing bridge |
| Unsafe filesystem or network behavior | Enforce least-privilege policies by default |
| Tool result drift | Validate both input and output against schemas |
| Tool hangs | Use timeout, cancellation, and retry behavior in the executor |

---

## Testing Strategy

### Unit Coverage

- registry registration, search, and stats
- cache hit/miss behavior
- executor validation, retry, timeout, and cancellation
- policy enforcement helpers

### Built-in Tool Coverage

- file read success and traversal rejection
- directory listing behavior
- HTTP success, redirect handling, and response size rejection

### Integration Coverage

- `ToolNode` invoking a real registered tool
- tool execution failures from missing tools, schema violations, and denied capabilities
- `MinimalOrchestrator` executing an explicit mixed DAG with tool and reasoning nodes

---

**Last Updated**: 2026-03-24
**Phase Status**: ✅ Implemented
