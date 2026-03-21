# Nexus Module Boundaries

> **Version:** 1.0.0  
> **Related:** [OVERVIEW.md](OVERVIEW.md), [LAYERS.md](LAYERS.md), [COMPONENT_MAP.md](COMPONENT_MAP.md)

---

## 1. Layer Boundaries

### 1.1 Dependency Direction Rule

```
OUTER → INNER

apps/        → interfaces/  → systems/  → core/
   ▲            ▲              ▲           ▲
   │            │              │           │
   └────────────┴──────────────┴───────────┘
         (only through contracts)
```

### 1.2 Allowed Dependencies

| From | To | Example |
|------|----|---------|
| `apps/` | `interfaces/` | Web app calls API handler |
| `interfaces/` | `systems/` | API handler calls Orchestrator |
| `systems/` | `core/` | Orchestrator uses Node contract |
| `modules/` | `core/` | Tool implements Tool contract |
| `data/` | `core/types/` | Repository uses MemoryEntry |
| `runtime/` | `core/` | IPC uses Event contract |

### 1.3 Forbidden Dependencies

| From | To | Reason |
|------|----|--------|
| `core/` | Any | Core must have zero dependencies |
| `systems/` | `modules/` | Systems orchestrate, don't implement |
| `modules/` | `systems/` | Modules are capabilities, not orchestration |
| `runtime/` | `apps/` | Runtime is infrastructure |

---

## 2. Core Contracts Boundaries

### 2.1 Contract Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                      core/contracts/                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Pure Interfaces & Types (No Implementation)        │    │
│  │                                                     │    │
│  │  • orchestrator.ts  → Orchestrator, Task, DAG       │    │
│  │  • node.ts          → Node, NodeType, NodeInput     │    │
│  │  • memory.ts        → Memory, MemoryEntry, Query    │    │
│  │  • model-provider.ts→ ModelProvider, Router         │    │
│  │  • tool.ts          → Tool, CapabilitySet           │    │
│  │  • events.ts       → Event types, Emitter           │    │
│  │  • errors.ts       → Error classes, codes           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│                           ▼                                 │
│              NO DEPENDENCIES ON OUTER LAYERS                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Contract Dependencies

```typescript
// core/contracts/orchestrator.ts
import type { Node, NodeOutput } from './node';
import type { MemorySnapshot } from './memory';
import type { CapabilitySet } from './tool';

// Uses type imports only to avoid circular dependencies
// No runtime imports from outer layers
```

---

## 3. System Boundaries

### 3.1 Orchestration System

**Boundary:** `systems/orchestration/` ↔ `core/contracts/`

| Interface | Direction | Purpose |
|-----------|-----------|---------|
| `Orchestrator` | Input | Task execution entry point |
| `DAG` | Input | Graph structure definition |
| `Node` | Input | Node contract |
| `ExecutionResult` | Output | Execution results |

**Implementation Location:** [`systems/orchestration/`](../../systems/orchestration/)

### 3.2 Context System

**Boundary:** `systems/context/` ↔ `core/contracts/`

| Interface | Direction | Purpose |
|-----------|-----------|---------|
| `Memory` | Input | Memory operations |
| `MemorySnapshot` | Input/Output | Context state |
| `ContextCompressor` | Input | Token compression |

**Implementation Location:** [`systems/context/`](../../systems/context/)

### 3.3 Model System

**Boundary:** `systems/models/` ↔ `core/contracts/`

| Interface | Direction | Purpose |
|-----------|-----------|---------|
| `ModelProvider` | Input | Provider interface |
| `ModelRouter` | Input | Multi-provider routing |
| `ModelRequest` | Input | Model call request |
| `ModelResponse` | Output | Model response |

**Implementation Location:** [`systems/models/`](../../systems/models/)

---

## 4. Module Boundaries

### 4.1 Tools Module

**Boundary:** `modules/tools/` ↔ `core/`

```
modules/tools/
├── contracts/           # Tool contracts (depends on core)
│   ├── tool.ts         # Tool interface
│   ├── schema.ts       # JSON Schema types
│   └── registry.ts     # Tool registry
├── code-exec/          # Tool implementation
├── filesystem/         # Tool implementation
├── http/               # Tool implementation
└── vector-search/      # Tool implementation
```

| Interface | Direction | Purpose |
|-----------|-----------|---------|
| `Tool` | Input | Tool capability |
| `ToolResult` | Output | Execution result |
| `ToolContext` | Input | Execution context |
| `CapabilitySet` | Input | Available capabilities |

### 4.2 Agents Module

**Boundary:** `modules/agents/` ↔ `core/`

```
modules/agents/
├── contracts/           # Agent contracts
│   ├── agent.ts        # Agent definition
│   └── executor.ts     # Agent execution
└── implementations/    # Agent implementations
```

| Interface | Direction | Purpose |
|-----------|-----------|---------|
| `Agent` | Input | Agent definition |
| `Executor` | Input | Agent runner |
| `Task` | Input | Task to execute |

### 4.3 Integrations Module

**Boundary:** `modules/integrations/` ↔ `core/`

```
modules/integrations/
├── contracts/           # Integration contracts
│   ├── provider.ts     # Provider interface
│   └── adapter.ts      # Adapter pattern
└── implementations/    # Provider implementations
```

| Interface | Direction | Purpose |
|-----------|-----------|---------|
| `Provider` | Input | External service provider |
| `Adapter` | Input | Protocol adapter |
| `ProviderConfig` | Input | Provider configuration |

---

## 5. Interface Boundaries

### 5.1 API Interface

**Boundary:** `interfaces/api/` ↔ `systems/`

```typescript
// interfaces/contracts/api.ts
import type { Task, ExecutionResult } from 'core/contracts/orchestrator';

interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: (request: ApiRequest) => Promise<ApiResponse>;
}

interface ApiRequest {
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

interface ApiResponse {
  status: number;
  body: unknown;
}
```

### 5.2 WebSocket Interface

**Boundary:** `interfaces/websocket/` ↔ `systems/`

```typescript
// interfaces/contracts/websocket.ts
import type { ExecutionResult } from 'core/contracts/orchestrator';

interface WebSocketMessage {
  type: 'request' | 'response' | 'event' | 'error';
  payload: unknown;
  sessionId: string;
}

interface WebSocketHandler {
  onMessage(handler: (msg: WebSocketMessage) => void): void;
  send(message: WebSocketMessage): void;
}
```

### 5.3 CLI Interface

**Boundary:** `interfaces/cli/` ↔ `systems/`

```typescript
// interfaces/contracts/cli.ts
import type { Task, ExecutionResult } from 'core/contracts/orchestrator';

interface CliCommand {
  name: string;
  description: string;
  options: CliOption[];
  handler: (args: CliArgs) => Promise<CliOutput>;
}

interface CliArgs {
  positional: string[];
  options: Record<string, unknown>;
}
```

---

## 6. Runtime Boundaries

### 6.1 Process Management

**Boundary:** `runtime/process/` ↔ `core/`

| Interface | Purpose |
|-----------|---------|
| `ProcessManager` | Spawn and manage child processes |
| `ProcessConfig` | Process configuration |

### 6.2 IPC Communication

**Boundary:** `runtime/ipc/` ↔ `core/events`

| Interface | Purpose |
|-----------|---------|
| `IpcChannel` | Communication channel |
| `IpcMessage` | Message format |
| `IpcHandler` | Message handler |

### 6.3 Sandbox

**Boundary:** `runtime/sandbox/` ↔ `core/`

| Interface | Purpose |
|-----------|---------|
| `Sandbox` | Isolated execution environment |
| `SandboxConfig` | Sandbox configuration |

---

## 7. Data Boundaries

### 7.1 Repository Pattern

**Boundary:** `data/repositories/` ↔ `core/`

```typescript
// data/repositories/memory-repository.ts
import type { MemoryEntry } from 'core/contracts/memory';

interface MemoryRepository {
  findById(id: string): Promise<MemoryEntry | null>;
  findBySession(sessionId: string): Promise<MemoryEntry[]>;
  save(entry: MemoryEntry): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 7.2 Adapter Pattern

**Boundary:** `data/adapters/` ↔ `core/`

```typescript
// data/adapters/database-adapter.ts
import type { DatabaseConfig } from 'core/config';

interface DatabaseAdapter {
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}
```

---

## 8. Event Boundaries

### 8.1 Cross-System Events

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Flow                               │
│                                                             │
│  systems/orchestration ──Events──► systems/context          │
│         │                                   │               │
│         │              Events               │               │
│         │              Events               │               │
│         ▼                                   ▼               │
│  systems/models ◄──────Events──────► systems/memory         │
│         │                                   │               │
│         └───────────────Events──────────────┘               │
│                           │                                 │
│                           ▼                                 │
│                   All systems ──► runtime/                  │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Event Contract

```typescript
// core/contracts/events.ts
interface BaseEvent<T = unknown> {
  id: string;
  namespace: EventNamespace;
  type: string;
  timestamp: Date;
  payload: T;
  source?: string;
  priority: EventPriority;
}
```

---

## 9. Error Boundaries

### 9.1 Error Propagation

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Boundaries                          │
│                                                             │
│   modules/tools/ ──throws──► systems/orchestration          │
│         │                                                   │
│         │                 throws                            │
│         ▼                                                   │
│   core/errors/ ◄───extends──── systems/                     │
│         │                                                   │
│         │                 returns                           │
│         ▼                                                   │
│   interfaces/ ◄───creates─── apps/                          │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Error Contract

```typescript
// core/contracts/errors.ts
abstract class NexusError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly cause?: Error;
}
```

---

## 10. Cross-Layer Violations

### 10.1 Example Violations

```typescript
// ❌ VIOLATION: Systems depending on modules
// systems/orchestration/engine.ts
import { ToolExecutor } from 'modules/tools/executor';

// ❌ VIOLATION: Runtime depending on apps
// runtime/ipc/bridge.ts
import { WebSocketServer } from 'apps/web/server';

// ❌ VIOLATION: Core depending on systems
// core/contracts/tool.ts
import { ToolRegistry } from 'systems/tools/registry';
```

### 10.2 Correct Pattern

```typescript
// ✅ CORRECT: Systems using contracts only
// systems/orchestration/engine.ts
import type { Tool } from 'core/contracts/tool';
import { NexusError } from 'core/contracts/errors';

// ✅ CORRECT: Runtime using events only
// runtime/ipc/bridge.ts
import type { BaseEvent } from 'core/contracts/events';
```

---

## 11. Summary

| Boundary Type | Location | Pattern |
|---------------|----------|---------|
| Layer → Layer | `X/` → `Y/` | Contract interfaces |
| System → Core | `systems/*/` → `core/contracts/` | Type imports |
| Module → Core | `modules/*/` → `core/contracts/` | Contract implements |
| Data → Core | `data/*/` → `core/types/` | Data models |
| Runtime → Core | `runtime/*/` → `core/contracts/` | Event contracts |

---

## 12. Related Documentation

- [OVERVIEW.md](OVERVIEW.md) - High-level architecture
- [LAYERS.md](LAYERS.md) - Layer breakdown
- [DATA_FLOW.md](DATA_FLOW.md) - Data flow through system
- [COMPONENT_MAP.md](COMPONENT_MAP.md) - Component relationships
