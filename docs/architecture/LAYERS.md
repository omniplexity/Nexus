# Nexus Layer Architecture

> **Version:** 1.0.0  
> **Related:** [OVERVIEW.md](OVERVIEW.md), [BOUNDARIES.md](BOUNDARIES.md)

---

## 1. Layer Overview

Nexus follows a **7-layer architecture** with strict dependency rules. Each layer can only depend on layers beneath it, ensuring clean separation of concerns and maintainability.

```
Dependency Direction: Outer → Inner

┌─────────────────────────────────────────────────────────────┐
│  Layer 7: apps/        (Entry Points - Web, Desktop, CLI)   │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: interfaces/  (External I/O - API, WebSocket)      │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: systems/     (Business Logic - Orchestration)     │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: core/        (Contracts - Interfaces & Types)     │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: modules/     (Capabilities - Tools, Agents)       │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: data/        (Persistence - DB, Cache)            │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: runtime/    (Execution - Process, IPC)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Layer-by-Layer Breakdown

### Layer 7: Applications (`apps/`)

**Purpose:** Entry points for end-users and external systems

| Component | Description | Status |
|-----------|-------------|--------|
| `apps/cli/` | Command-line interface | ✅ Implemented |
| `apps/web/` | Web application workspace shell | ✅ Implemented |
| `apps/desktop/` | Desktop launcher for the workspace shell | ✅ Implemented |

**Dependencies:** `interfaces/`

---

### Layer 6: Interfaces (`interfaces/`)

**Purpose:** External I/O adapters that translate between external protocols and internal systems

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| API | [`interfaces/contracts/api.ts`](../../interfaces/contracts/api.ts) | REST API contracts | ✅ Implemented |
| WebSocket | [`interfaces/contracts/websocket.ts`](../../interfaces/contracts/websocket.ts) | Real-time communication | ✅ Implemented |
| CLI | [`interfaces/contracts/cli.ts`](../../interfaces/contracts/cli.ts) | CLI input/output | Contracts ✅ |
| Events | `interfaces/events/` | Event interface adapters | ✗ Planned |

**Dependencies:** `systems/`

**Key Contracts:**

```typescript
// From interfaces/contracts/api.ts
interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: RequestHandler;
}

// From interfaces/contracts/websocket.ts
interface WebSocketMessage {
  type: string;
  payload: unknown;
  sessionId: string;
}
```

---

### Layer 5: Systems (`systems/`)

**Purpose:** Business logic orchestration - coordinates how capabilities work together

| Component | Subdirectory | Description | Status |
|-----------|--------------|-------------|--------|
| Orchestration | `systems/orchestration/` | DAG execution engine | ✅ Complete |
| Context | `systems/context/` | Context management & compression | ✅ Complete |
| Cognitive | `systems/cognitive/` | Reasoning & planning | ✗ Planned |
| Execution | `systems/execution/` | Task execution | ✗ Planned |
| Memory | `systems/memory/` | Memory systems | ✅ Complete |
| Models | `systems/models/` | Model abstraction layer | ✅ Complete |
| Capabilities | `systems/capabilities/` | Capability management | ✗ Planned |

**Dependencies:** `core/`

**Phase:** Phase 2-5 (Most systems implemented)

**Key Systems:**

#### Orchestration System (`systems/orchestration/`)

```
systems/orchestration/
├── index.ts           # ✅ Exports
├── engine/            # ✅ DAG execution engine
│   ├── dag.ts         # DAG structure
│   ├── orchestrator.ts # Main orchestrator
│   ├── executor.ts    # Node executor
│   └── src/           # Advanced features
│       ├── circuit-breaker.ts
│       ├── error-handler.ts
│       ├── execution-planner.ts
│       ├── parallel-executor.ts
│       ├── retry-strategy.ts
│       └── worker-pool.ts
├── nodes/             # ✅ Node implementations
│   ├── aggregator.ts
│   ├── conditional.ts
│   ├── control.ts
│   ├── memory.ts
│   ├── tool.ts
│   └── transform.ts
├── runtime/           # Runtime placeholder
└── scheduler/         # ✅ Task scheduling
    ├── priority-scheduler.ts
    ├── resource-scheduler.ts
    └── scheduler-strategies.ts
```

**Current Status:** ✅ Complete - Full implementation with DAG execution, parallel execution, circuit breaker, retry strategies, and advanced scheduling.

#### Context System (`systems/context/`)

```
systems/context/
├── cache/            # ✅ Response caching
│   └── response-cache.ts
├── compressor/       # ✅ Context compression
│   ├── hybrid.ts
│   ├── summarize.ts
│   └── truncate.ts
├── priorititizer/    # ✅ Context prioritization
│   └── scorer.ts
└── router/          # ✅ Context routing
```

**Current Status:** ✅ Complete - Full implementation with response caching, hybrid/summarize/truncate compression, context prioritization, and routing.

#### Cognitive System (`systems/cognitive/`)

```
systems/cognitive/
├── constraints/     # Constraint handling
├── intent/          # Intent recognition
├── planner/         # Task planning
└── strategy/        # Strategy formation
```

**Phase:** Planned

---

### Layer 4: Core (`core/`)

**Purpose:** Fundamental contracts - interfaces, types, and error definitions

| Component | File | Description |
|-----------|------|-------------|
| Contracts | `core/contracts/` | All interface definitions |
| Types | `core/types/` | Shared type exports |
| Config | `core/config/` | Configuration types |
| Errors | `core/errors/` | Error classes |
| Utils | `core/utils/` | Utility functions |

**Dependencies:** None (pure - no runtime dependencies)

**Phase:** ✅ Complete (Phase 1)

**Contract Files:**

| Contract | Path | Purpose |
|----------|------|---------|
| Orchestrator | [`core/contracts/orchestrator.ts`](../../core/contracts/orchestrator.ts) | Task execution & DAG |
| Node | [`core/contracts/node.ts`](../../core/contracts/node.ts) | Node types & execution |
| Tool | [`core/contracts/tool.ts`](../../core/contracts/tool.ts) | Tool capabilities |
| Memory | [`core/contracts/memory.ts`](../../core/contracts/memory.ts) | Context & memory |
| Model Provider | [`core/contracts/model-provider.ts`](../../core/contracts/model-provider.ts) | Multi-provider |
| Events | [`core/contracts/events.ts`](../../core/contracts/events.ts) | Inter-component comms |
| Errors | [`core/contracts/errors.ts`](../../core/contracts/errors.ts) | Error types |

---

### Layer 3: Modules (`modules/`)

**Purpose:** Capability implementations - concrete tools, agents, and integrations

| Component | Subdirectory | Description |
|-----------|--------------|-------------|
| Tools | `modules/tools/` | Tool implementations |
| Agents | `modules/agents/` | Agent definitions |
| Integrations | `modules/integrations/` | External integrations |
| Workflows | `modules/workflows/` | Workflow definitions |
| UI Extensions | `modules/ui-extensions/` | UI components |

**Dependencies:** `core/`

**Phase:** Contracts defined; implementation planned

**Module Structure:**

#### Tools Module (`modules/tools/`)

```
modules/tools/
├── contracts/        # Tool contracts
│   ├── tool.ts       # Tool interface
│   ├── schema.ts     # JSON Schema types
│   └── registry.ts   # Tool registry
├── code-exec/        # Code execution tool
├── filesystem/       # Filesystem access tool
├── http/             # HTTP client tool
└── vector-search/   # Vector search tool
```

#### Agents Module (`modules/agents/`)

```
modules/agents/
├── contracts/        # Agent contracts
│   ├── agent.ts      # Agent definition
│   └── executor.ts   # Agent execution
└── implementations/ # Agent implementations
```

#### Integrations Module (`modules/integrations/`)

```
modules/integrations/
├── contracts/        # Integration contracts
│   ├── provider.ts   # Provider interface
│   └── adapter.ts    # Adapter pattern
└── implementations/  # External integrations
```

---

### Layer 2: Data (`data/`)

**Purpose:** Persistence layer - database adapters, repositories, and schemas

| Component | Subdirectory | Description |
|-----------|--------------|-------------|
| Adapters | `data/adapters/` | Database adapters |
| Repositories | `data/repositories/` | Data access objects |
| Schemas | `data/schemas/` | Data schemas |
| Migrations | `data/migrations/` | Database migrations |
| Seed | `data/seed/` | Test data |

**Dependencies:** `core/types/`

**Phase:** Planned

**Data Schemas:**

```typescript
// Memory entry schema example
interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
}
```

---

### Layer 1: Runtime (`runtime/`)

**Purpose:** Execution environment - process management, IPC, and sandboxing

| Component | Subdirectory | Description |
|-----------|--------------|-------------|
| Process | `runtime/process/` | Process management |
| IPC | `runtime/ipc/` | Inter-process communication |
| Scheduler | `runtime/scheduler/` | Task scheduling |
| Sandbox | `runtime/sandbox/` | Execution sandboxing |
| State | `runtime/state/` | State management |

**Dependencies:** `core/`

**Phase:** Planned

**Runtime Responsibilities:**

- Process spawning and management
- Inter-process communication (IPC)
- Task scheduling and queuing
- Sandbox execution for untrusted code
- State management across sessions

---

## 3. Dependency Rules

### 3.1 Allowed Dependencies

```
apps/       → interfaces/
interfaces/ → systems/
systems/    → core/
modules/    → core/
data/       → core/types/
runtime/    → core/
```

### 3.2 Forbidden Dependencies

| From | To | Reason |
|------|-----|--------|
| `core/` | Any | Core must be pure |
| `systems/` | `modules/` | Systems orchestrate, don't implement |
| `modules/` | `systems/` | Modules are capabilities, not orchestration |
| `runtime/` | `apps/` | Runtime is infrastructure |

### 3.3 Cross-Layer Violation Example

```typescript
// ❌ FORBIDDEN: Systems depending on modules
// systems/orchestration/engine.ts
import { ToolExecutor } from 'modules/tools/executor'; // VIOLATION

// ✅ CORRECT: Systems use core contracts
// systems/orchestration/engine.ts
import type { Tool } from 'core/contracts/tool';
```

---

## 4. Layer Communication

### 4.1 Vertical Communication (Downward)

```
User Input → apps → interfaces → systems → core
                ↓
            (contracts only)
```

Commands flow downward through layers via function calls.

### 4.2 Horizontal Communication (Event-Based)

```
systems/orchestration ──Events──► systems/context
         │                           │
         └─────────Events────────────┘
```

Components communicate horizontally via the event system defined in [`core/contracts/events.ts`](../../core/contracts/events.ts).

### 4.3 Return Flow (Upward)

```
core → systems → interfaces → apps → User Output
                ↑
          (results & events)
```

Results flow upward through layers via return values and events.

---

## 5. Phase Mapping

| Phase | Layer Focus | Status |
|-------|-------------|--------|
| Phase 1 | Core (Layer 4) | ✅ Complete |
| Phase 2 | Systems minimal (Layer 5) | ✅ Complete |
| Phase 3 | Orchestration (Layer 5) | ✅ Complete |
| Phase 4 | Context Engine (Layer 5) | ✅ Complete |
| Phase 5 | Modules (Layer 3) | Contracts ✅ / Impl ✗ |
| Phase 6 | Interfaces + Apps (Layer 6-7) | API ✅ / CLI ✅ / Web ✅ / Desktop ✅ |
| Phase 7 | Runtime + Optimization (Layer 1-2) | ✗ Planned |

---

## 6. Summary

| Layer | Name | Purpose | Status |
|-------|------|---------|--------|
| 7 | Apps | Entry points | CLI ✅, Web ✅, Desktop ✅ |
| 6 | Interfaces | External I/O | API ✅, WebSocket ✅, CLI ✗ |
| 5 | Systems | Business logic | ✅ Mostly Complete |
| 4 | Core | Contracts | ✅ Complete |
| 3 | Modules | Capabilities | Contracts ✅, Impl ✗ |
| 2 | Data | Persistence | ✗ Planned |
| 1 | Runtime | Execution | ✗ Planned |

---

## 7. Related Documentation

- [OVERVIEW.md](OVERVIEW.md) - High-level architecture
- [DATA_FLOW.md](DATA_FLOW.md) - Data flow through layers
- [COMPONENT_MAP.md](COMPONENT_MAP.md) - Component relationships
- [BOUNDARIES.md](BOUNDARIES.md) - Module boundaries
