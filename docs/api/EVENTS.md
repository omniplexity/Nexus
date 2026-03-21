# Event System Reference

> **Phase 1 Stub** — This documents the event system interface contracts. Events will be implemented in Phase 2+.

## Contract Source

Interface contracts defined in [`core/contracts/events.ts`](../../core/contracts/events.ts).

## Event Namespaces

```typescript
enum EventNamespace {
  ORCHESTRATION = 'orchestration',
  NODE = 'node',
  TOOL = 'tool',
  MEMORY = 'memory',
  MODEL = 'model',
  CONTEXT = 'context',
  RUNTIME = 'runtime',
  AGENT = 'agent',
  SYSTEM = 'system'
}
```

## Event Priorities

```typescript
enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}
```

## Base Interfaces

### BaseEvent

```typescript
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

### EventListener

```typescript
type EventListener<T = unknown> = (event: BaseEvent<T>) => void | Promise<void>;
```

### EventEmitter

```typescript
interface EventEmitter {
  on<T = unknown>(event: string, listener: EventListener<T>): void;
  once<T = unknown>(event: string, listener: EventListener<T>): void;
  off<T = unknown>(event: string, listener: EventListener<T>): void;
  emit<T = unknown>(event: BaseEvent<T>): void;
}
```

### EventSubscription

```typescript
interface EventSubscription {
  unsubscribe(): void;
}
```

### EventBusConfig

```typescript
interface EventBusConfig {
  maxListeners?: number;
  enableLogging?: boolean;
  enablePersistence?: boolean;
  flushInterval?: number;
}
```

## Event Payloads

### OrchestrationEventPayload

```typescript
interface OrchestrationEventPayload {
  taskId: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}
```

### NodeEventPayload

```typescript
interface NodeEventPayload {
  nodeId: string;
  taskId: string;
  status: 'started' | 'completed' | 'failed';
  output?: unknown;
  error?: string;
  duration?: number;
}
```

### ToolEventPayload

```typescript
interface ToolEventPayload {
  toolId: string;
  toolName: string;
  status: 'started' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
}
```

### MemoryEventPayload

```typescript
interface MemoryEventPayload {
  operation: 'retrieve' | 'store' | 'clear' | 'update';
  memoryId?: string;
  sessionId?: string;
  success: boolean;
  itemCount?: number;
  error?: string;
}
```

### ModelEventPayload

```typescript
interface ModelEventPayload {
  providerId: string;
  modelId: string;
  operation: 'request' | 'response' | 'error';
  tokensUsed?: number;
  latency?: number;
  error?: string;
}
```

### ContextEventPayload

```typescript
interface ContextEventPayload {
  operation: 'compress' | 'expand' | 'slice' | 'cache';
  sessionId: string;
  tokensBefore?: number;
  tokensAfter?: number;
  success: boolean;
  error?: string;
}
```

### RuntimeEventPayload

```typescript
interface RuntimeEventPayload {
  operation: string;
  status: 'started' | 'stopped' | 'error';
  processId?: number;
  error?: string;
}
```

### AgentEventPayload

```typescript
interface AgentEventPayload {
  agentId: string;
  agentType: string;
  status: 'created' | 'started' | 'paused' | 'stopped' | 'error';
  message?: string;
  error?: string;
}
```

### SystemHealthEventPayload

```typescript
interface SystemHealthEventPayload {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    cpu?: number;
    memory?: number;
    latency?: number;
    errorRate?: number;
  };
  timestamp: Date;
}
```

## Event Types

```typescript
const EventTypes = {
  // Orchestration events
  ORCHESTRATION_STARTED: 'orchestration:started',
  ORCHESTRATION_PROGRESS: 'orchestration:progress',
  ORCHESTRATION_COMPLETED: 'orchestration:completed',
  ORCHESTRATION_FAILED: 'orchestration:failed',
  
  // Node events
  NODE_STARTED: 'node:started',
  NODE_COMPLETED: 'node:completed',
  NODE_FAILED: 'node:failed',
  
  // Tool events
  TOOL_STARTED: 'tool:started',
  TOOL_COMPLETED: 'tool:completed',
  TOOL_FAILED: 'tool:failed',
  
  // Memory events
  MEMORY_RETRIEVED: 'memory:retrieved',
  MEMORY_STORED: 'memory:stored',
  MEMORY_CLEARED: 'memory:cleared',
  MEMORY_ERROR: 'memory:error',
  
  // Model events
  MODEL_REQUEST: 'model:request',
  MODEL_RESPONSE: 'model:response',
  MODEL_ERROR: 'model:error',
  
  // Context events
  CONTEXT_COMPRESSED: 'context:compressed',
  CONTEXT_EXPANDED: 'context:expanded',
  CONTEXT_ERROR: 'context:error',
  
  // Runtime events
  RUNTIME_STARTED: 'runtime:started',
  RUNTIME_STOPPED: 'runtime:stopped',
  RUNTIME_ERROR: 'runtime:error',
  
  // Agent events
  AGENT_CREATED: 'agent:created',
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  
  // System events
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_SHUTDOWN: 'system:shutdown'
} as const;

type EventType = typeof EventTypes[keyof typeof EventTypes];
```

## Usage Example

```typescript
import { 
  EventEmitter, 
  EventNamespace, 
  EventPriority,
  EventTypes,
  BaseEvent 
} from '@nexus/core/events';

class EventBus implements EventEmitter {
  private listeners = new Map<string, Set<Function>>();

  on<T = unknown>(event: string, listener: (event: BaseEvent<T>) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  once<T = unknown>(event: string, listener: (event: BaseEvent<T>) => void): void {
    const wrappedListener = (e: BaseEvent<T>) => {
      listener(e);
      this.off(event, wrappedListener);
    };
    this.on(event, wrappedListener);
  }

  off<T = unknown>(event: string, listener: (event: BaseEvent<T>) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<T = unknown>(event: BaseEvent<T>): void {
    this.listeners.get(event.type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }
}

// Emit an event
const eventBus = new EventBus();

eventBus.emit({
  id: 'evt-001',
  namespace: EventNamespace.ORCHESTRATION,
  type: EventTypes.ORCHESTRATION_STARTED,
  timestamp: new Date(),
  payload: {
    taskId: 'task-123',
    status: 'started'
  },
  priority: EventPriority.HIGH
});

// Subscribe to events
eventBus.on(EventTypes.NODE_COMPLETED, (event) => {
  console.log('Node completed:', event.payload);
});
```

## Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Event Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    emit()    ┌──────────┐    on()             │
│  │ Emitter  │ ───────────► │ EventBus │ ──────────────►     │
│  └──────────┘              └──────────┘    Listeners        │
│                                                             │
│  Events flow from components → EventBus → Subscribers       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Status

- **Phase 1:** Contract definitions (complete)
- **Phase 2:** Event bus implementation
- **Phase 3:** Event subscriptions and persistence

---

See also: [INDEX.md](./INDEX.md) | [WebSocket.md](./WebSocket.md) | [ERRORS.md](./ERRORS.md)
