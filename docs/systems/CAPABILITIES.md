# Capabilities (Tools) System

The capabilities system implements Phase 5 of Nexus: a real tool runtime under `modules/tools` with policy-aware built-in tools and orchestration integration through a core contract boundary.

## Overview

Phase 5 provides:

- a buildable `@nexus/tools` workspace package
- tool registration and discovery
- tool execution with validation, timeout, retry, and cancellation
- cache support for read-oriented tools
- filesystem and network policy enforcement
- built-in read-only filesystem and HTTP tools
- orchestration integration through `ToolInvoker`

## Contracts

### Core Contracts

`core/contracts/tool.ts` defines the minimal orchestration-facing surface:

- `CapabilitySet`
- `ToolContext`
- `ToolInvocationRequest`
- `ToolInvoker`
- `ToolResult`

This keeps `systems/orchestration` dependent only on `core`, not `modules/tools`.

### Tool Module Contracts

`modules/tools/contracts/` defines the tool runtime surface:

- `tool.ts` for `Tool`, `ToolExecutionContext`, `ToolExecutionResult`, and `ToolLifecycleStatus`
- `registry.ts` for `ToolRegistry`, `ToolExecutor`, and `ToolCache`
- `schema.ts` for tool input/output schemas
- `policy.ts` for `ToolPolicy`, `FilesystemPolicy`, and `NetworkPolicy`

## Runtime Architecture

```text
modules/tools/
├── contracts/    # Public tool contracts
├── runtime/      # Registry, cache, executor, invoker, validation, policy
├── builtins/     # First-party tool implementations
└── test-helpers/ # Fake tools for executor and orchestration tests
```

### Key Runtime Components

| Component | Purpose |
|-----------|---------|
| `InMemoryToolRegistry` | Registers tools, supports lookup, search, stats, and duplicate protection |
| `MemoryToolCache` | Caches tool results with TTL and hit/miss metrics |
| `DefaultToolExecutor` | Validates input/output, enforces capabilities, applies policy, manages timeout/retry/cancel |
| `DefaultToolInvoker` | Adapts the module runtime to the core `ToolInvoker` contract |
| `BaseTool` | Reusable tool base class with schema validation helpers |

## Built-in Tools

### `filesystem.read_file`

- reads UTF-8 text files
- confines access to the configured workspace root
- rejects files over the policy size limit

### `filesystem.list_directory`

- lists directory entries without reading file bodies
- confines access to the configured workspace root
- truncates large listings according to policy

### `http.get`

- performs GET requests only
- defaults to HTTPS-only access
- blocks localhost and private network targets by default
- enforces redirect, timeout, and response-size limits

## Policy Model

Phase 5 defaults to least-privilege behavior.

### Filesystem Policy

- `rootDirectory`
- `allowRead`
- `allowList`
- `maxFileSizeBytes`
- `maxDirectoryEntries`

### Network Policy

- `allowHttpGet`
- `allowedProtocols`
- `allowLocalhost`
- `allowPrivateNetwork`
- `allowedHosts`
- `blockedHosts`
- `timeoutMs`
- `maxResponseBytes`
- `maxRedirects`

## Orchestration Integration

`systems/orchestration/nodes/tool.ts` now executes real tools through `ToolInvoker`.

- `ToolNode` no longer simulates tool output
- `MinimalOrchestrator.setToolInvoker()` injects the runtime bridge
- explicit DAG execution can pass a DAG through `task.metadata.dag`
- the layer boundary remains intact because orchestration never imports `modules/tools`

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Core tool contracts | ✅ Complete | Includes `ToolInvoker` execution boundary |
| Tool module contracts | ✅ Complete | Tool, registry, schema, and policy contracts |
| Registry runtime | ✅ Complete | In-memory registry with usage stats |
| Executor runtime | ✅ Complete | Validation, policy, timeout, retry, cancel, and cache |
| Built-in tools | ✅ Complete | `filesystem.read_file`, `filesystem.list_directory`, `http.get` |
| Orchestration integration | ✅ Complete | Real ToolNode execution through injected invoker |
| Plugin discovery/loading | ✗ Deferred | Beyond Phase 5 |

## Usage

```typescript
import { createToolRegistry, createToolExecutor, createToolInvoker, registerBuiltInTools } from '@nexus/tools';

const registry = createToolRegistry();
registerBuiltInTools(registry);

const executor = createToolExecutor(registry);
const invoker = createToolInvoker(executor);
```

The invoker can then be passed to orchestration:

```typescript
orchestrator.setToolInvoker(invoker);
```

## Validation

Phase 5 coverage includes:

- registry and cache behavior
- executor validation, retry, timeout, and cancellation
- filesystem and network policy enforcement
- built-in tool behavior
- `ToolNode` and orchestrator integration

## Related Files

- [`core/contracts/tool.ts`](../../core/contracts/tool.ts)
- [`modules/tools/index.ts`](../../modules/tools/index.ts)
- [`modules/tools/contracts/policy.ts`](../../modules/tools/contracts/policy.ts)
- [`modules/tools/runtime/executor.ts`](../../modules/tools/runtime/executor.ts)
- [`modules/tools/runtime/invoker.ts`](../../modules/tools/runtime/invoker.ts)
- [`systems/orchestration/nodes/tool.ts`](../../systems/orchestration/nodes/tool.ts)
