# REST API Reference

> **Phase 1 Stub** — This documents the REST API interface contracts. Some endpoints are implemented, others are planned for Phase 2+.

## Contract Source

Interface contracts defined in [`interfaces/contracts/api.ts`](../../interfaces/contracts/api.ts).

## Interfaces

### ApiMethod

```typescript
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
```

### ApiRequest

```typescript
interface ApiRequest {
  method: ApiMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}
```

### ApiResponse

```typescript
interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  error?: ApiError;
  headers?: Record<string, string>;
}
```

### ApiError

```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### ApiRoute

```typescript
interface ApiRoute {
  method: ApiMethod;
  path: string;
  handler: ApiHandler;
  middleware?: ApiMiddleware[];
  schema?: ApiSchema;
}
```

## Server Interface

### ApiServer

```typescript
interface ApiServer {
  /** Server port */
  port: number;
  
  /** Server host */
  host: string;
  
  /** Start the server */
  start(): Promise<void>;
  
  /** Stop the server */
  stop(): Promise<void>;
  
  /** Register a route */
  register(route: ApiRoute): void;
  
  /** Check if server is running */
  isRunning(): boolean;
  
  /** Get server info */
  getInfo(): ServerInfo;
}
```

### ServerInfo

```typescript
interface ServerInfo {
  port: number;
  host: string;
  uptime: number;
  version: string;
}
```

## Router Interface

### ApiRouter

```typescript
interface ApiRouter {
  /** Add a route */
  add(route: ApiRoute): void;
  
  /** Remove a route */
  remove(method: ApiMethod, path: string): boolean;
  
  /** Find matching route */
  match(method: ApiMethod, path: string): ApiRoute | null;
  
  /** List all routes */
  list(): ApiRoute[];
}
```

## Implemented Endpoints

> **Note:** These endpoints are currently implemented and available.

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health status |
| GET | `/api/status` | System status (uptime, version) |
| GET | `/api/status/readiness` | Readiness probe |
| GET | `/api/status/liveness` | Liveness probe |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Create and execute a task |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get task status and result |

### Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/models` | List available models |

## Planned Endpoints (Phase 2+)

> **Note:** These endpoints are planned for future implementation.

### Orchestration

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orchestration/tasks` | Create a new task |
| GET | `/orchestration/tasks/:id` | Get task status |
| GET | `/orchestration/tasks` | List all tasks |
| DELETE | `/orchestration/tasks/:id` | Cancel a task |

### Nodes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/nodes` | List all nodes |
| GET | `/nodes/:id` | Get node details |
| POST | `/nodes` | Create a new node |
| PUT | `/nodes/:id` | Update a node |
| DELETE | `/nodes/:id` | Delete a node |

### Tools

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tools` | List all registered tools |
| GET | `/tools/:name` | Get tool schema |
| POST | `/tools/:name/execute` | Execute a tool |

### Memory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/memory` | Retrieve memory entries |
| POST | `/memory` | Store a memory entry |
| DELETE | `/memory/:id` | Delete a memory entry |
| POST | `/memory/search` | Search memory |

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List all agents |
| POST | `/agents` | Create a new agent |
| GET | `/agents/:id` | Get agent details |
| DELETE | `/agents/:id` | Delete an agent |
| POST | `/agents/:id/run` | Run an agent |

## Usage Example

```typescript
import { ApiServer, ApiRoute, ApiMethod } from '@nexus/api';

const routes: ApiRoute[] = [
  {
    method: 'GET' as ApiMethod,
    path: '/health',
    handler: async (request) => ({
      status: 200,
      data: { status: 'ok' }
    })
  }
];

const server: ApiServer = {
  port: 3000,
  host: 'localhost',
  async start() {
    routes.forEach(route => this.register(route));
  },
  register(route) { /* ... */ },
  isRunning() { return true; },
  getInfo() { return { port: 3000, host: 'localhost', uptime: 0, version: '0.0.1' }; },
  async stop() { /* ... */ }
};
```

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async processing) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Implementation Status

- **Phase 1:** Contract definitions (complete)
- **Phase 2:** Minimal server implementation (complete: health, tasks, status, models)
- **Phase 3:** Full endpoint implementation (in progress)

---

See also: [ERRORS.md](./ERRORS.md) | [WebSocket.md](./WebSocket.md)
