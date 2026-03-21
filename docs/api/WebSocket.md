# WebSocket Reference

> **Phase 1 Stub** — This documents the WebSocket interface contracts. Events and messages will be implemented in Phase 2+.

## Contract Source

Interface contracts defined in [`interfaces/contracts/websocket.ts`](../../interfaces/contracts/websocket.ts).

## Interfaces

### WebSocketMessageType

```typescript
type WebSocketMessageType = 'text' | 'binary' | 'ping' | 'pong' | 'close';
```

### WebSocketMessage

```typescript
interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: Date;
}
```

### WebSocketEvent

```typescript
type WebSocketEvent = 
  | 'connection'
  | 'disconnect'
  | 'message'
  | 'error'
  | 'open'
  | 'close';
```

### WebSocketClientMessage

```typescript
interface WebSocketClientMessage {
  event: string;
  data?: unknown;
}
```

### WebSocketServerMessage

```typescript
interface WebSocketServerMessage {
  event: string;
  data?: unknown;
  error?: string;
}
```

### WebSocketState

```typescript
enum WebSocketState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed'
}
```

## Client Interface

### WebSocketClient

```typescript
interface WebSocketClient {
  /** Unique client identifier */
  id: string;
  
  /** Current connection state */
  state: WebSocketState;
  
  /** Connect to WebSocket server */
  connect(url: string): Promise<void>;
  
  /** Disconnect from server */
  disconnect(): Promise<void>;
  
  /** Send a message */
  send(event: string, data?: unknown): void;
  
  /** Subscribe to an event */
  on(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  /** Unsubscribe from an event */
  off(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  /** Check if connected */
  isConnected(): boolean;
}
```

### WebSocketEventHandler

```typescript
type WebSocketEventHandler = (data?: unknown) => void;
```

## Server Interface

### WebSocketServer

```typescript
interface WebSocketServer {
  /** Server port */
  port: number;
  
  /** Start the server */
  start(): Promise<void>;
  
  /** Stop the server */
  stop(): Promise<void>;
  
  /** Broadcast to all clients */
  broadcast(event: string, data?: unknown): void;
  
  /** Send to specific client */
  send(clientId: string, event: string, data?: unknown): void;
  
  /** Register event handler */
  on(event: WebSocketEvent, handler: WebSocketServerEventHandler): void;
  
  /** Get connected clients */
  getClients(): string[];
  
  /** Check if server is running */
  isRunning(): boolean;
}
```

### WebSocketServerEventHandler

```typescript
type WebSocketServerEventHandler = (
  clientId: string,
  data?: unknown
) => void;
```

### WebSocketConfig

```typescript
interface WebSocketConfig {
  port: number;
  path?: string;
  pingInterval?: number;
  pingTimeout?: number;
  maxPayload?: number;
}
```

## Events Reference

> **Note:** These events will be implemented in Phase 2+. This is a reference for planned functionality.

### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `task:create` | `{ task: Task }` | Create a new task |
| `task:cancel` | `{ taskId: string }` | Cancel a task |
| `node:execute` | `{ nodeId: string, input: unknown }` | Execute a node |
| `tool:execute` | `{ toolName: string, input: unknown }` | Execute a tool |
| `agent:run` | `{ agentId: string }` | Run an agent |
| `agent:stop` | `{ agentId: string }` | Stop an agent |
| `memory:query` | `{ query: string }` | Query memory |

### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `task:status` | `{ taskId, status, progress }` | Task status update |
| `node:result` | `{ nodeId, output, error }` | Node execution result |
| `tool:result` | `{ toolName, output, error }` | Tool execution result |
| `agent:status` | `{ agentId, status, message }` | Agent status update |
| `memory:result` | `{ items: MemoryEntry[] }` | Memory query result |
| `error` | `{ code, message, details }` | Error notification |
| `connected` | `{ clientId }` | Connection confirmed |

### System Events

| Event | Description |
|-------|-------------|
| `connection` | New client connected |
| `disconnect` | Client disconnected |
| `message` | Generic message received |
| `error` | WebSocket error occurred |
| `open` | Connection opened |
| `close` | Connection closed |

## Usage Example

### Server

```typescript
import { WebSocketServer, WebSocketEvent } from '@nexus/websocket';

const wss: WebSocketServer = {
  port: 8080,
  
  async start() {
    console.log('WebSocket server starting on port 8080');
  },
  
  async stop() {
    console.log('WebSocket server stopped');
  },
  
  broadcast(event: string, data?: unknown) {
    console.log(`Broadcasting ${event}:`, data);
  },
  
  send(clientId: string, event: string, data?: unknown) {
    console.log(`Sending to ${clientId}:`, event, data);
  },
  
  on(event: WebSocketEvent, handler) {
    console.log(`Handler registered for ${event}`);
  },
  
  getClients() {
    return ['client-1', 'client-2'];
  },
  
  isRunning() {
    return true;
  }
};
```

### Client

```typescript
import { WebSocketClient, WebSocketState } from '@nexus/websocket';

const client: WebSocketClient = {
  id: 'client-1',
  state: WebSocketState.CONNECTING,
  
  async connect(url: string) {
    console.log(`Connecting to ${url}...`);
    this.state = WebSocketState.OPEN;
  },
  
  async disconnect() {
    console.log('Disconnecting...');
    this.state = WebSocketState.CLOSED;
  },
  
  send(event: string, data?: unknown) {
    console.log(`Sending ${event}:`, data);
  },
  
  on(event, handler) {
    console.log(`Subscribed to ${event}`);
  },
  
  off(event, handler) {
    console.log(`Unsubscribed from ${event}`);
  },
  
  isConnected() {
    return this.state === WebSocketState.OPEN;
  }
};
```

## Implementation Status

- **Phase 1:** Contract definitions (complete)
- **Phase 2:** Minimal WebSocket server
- **Phase 3:** Full event implementation

---

See also: [INDEX.md](./INDEX.md) | [EVENTS.md](./EVENTS.md) | [ERRORS.md](./ERRORS.md)
