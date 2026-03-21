# Error Codes Reference

> **Phase 1 Stub** — This documents the error interface contracts. Error handling will be implemented in Phase 2+.

## Contract Source

Interface contracts defined in [`core/contracts/errors.ts`](../../core/contracts/errors.ts).

## Error Code Categories

### Orchestration Errors (ORC-xxx)

| Code | Description |
|------|-------------|
| `ORC_001` | Orchestration failed |
| `ORC_002` | Node execution failed |
| `ORC_003` | DAG construction failed |
| `ORC_004` | Dependency resolution failed |

### Node Errors (ND-xxx)

| Code | Description |
|------|-------------|
| `ND_001` | Node not found |
| `ND_002` | Node timeout |
| `ND_003` | Node retry exhausted |
| `ND_004` | Invalid node configuration |

### Memory Errors (MEM-xxx)

| Code | Description |
|------|-------------|
| `MEM_001` | Memory retrieval failed |
| `MEM_002` | Memory storage failed |
| `MEM_003` | Memory not found |
| `MEM_004` | Memory quota exceeded |

### Tool Errors (TOL-xxx)

| Code | Description |
|------|-------------|
| `TOL_001` | Tool not found |
| `TOL_002` | Tool execution failed |
| `TOL_003` | Tool timeout |
| `TOL_004` | Invalid tool input |
| `TOL_005` | Tool not authorized |

### Model Provider Errors (MOD-xxx)

| Code | Description |
|------|-------------|
| `MOD_001` | Model provider unavailable |
| `MOD_002` | Model inference failed |
| `MOD_003` | Invalid model configuration |
| `MOD_004` | Rate limit exceeded |

### Context Errors (CTX-xxx)

| Code | Description |
|------|-------------|
| `CTX_001` | Context compression failed |
| `CTX_002` | Context too large |
| `CTX_003` | Context retrieval failed |

### Runtime Errors (RT-xxx)

| Code | Description |
|------|-------------|
| `RT_001` | IPC communication failed |
| `RT_002` | Process spawn failed |
| `RT_003` | Sandbox execution failed |
| `RT_004` | Scheduler error |

### Data Errors (DAT-xxx)

| Code | Description |
|------|-------------|
| `DAT_001` | Database connection failed |
| `DAT_002` | Migration failed |
| `DAT_003` | Repository error |

### Generic Errors (GEN-xxx)

| Code | Description |
|------|-------------|
| `GEN_001` | Unknown error |
| `GEN_002` | Invalid input |
| `GEN_003` | Not implemented |

## Error Classes

### Base Error Class

```typescript
abstract class NexusError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    cause?: Error
  );

  toJSON(): Record<string, unknown>;
}
```

### Specialized Error Classes

```typescript
class OrchestrationError extends NexusError { /* ... */ }
class NodeError extends NexusError { /* ... */ }
class MemoryError extends NexusError { /* ... */ }
class ToolError extends NexusError { /* ... */ }
class ModelError extends NexusError { /* ... */ }
class ContextError extends NexusError { /* ... */ }
class RuntimeError extends NexusError { /* ... */ }
class DataError extends NexusError { /* ... */ }
class ValidationError extends NexusError { /* ... */ }
class NotImplementedError extends NexusError { /* ... */ }
```

## Utility Functions

### isNexusError

Type guard to check if an error is a NexusError:

```typescript
function isNexusError(value: unknown): value is NexusError;
```

### createErrorResponse

Creates a safe error response for API transmission:

```typescript
function createErrorResponse(error: unknown): Record<string, unknown>;
```

## Usage Example

```typescript
import { 
  NexusError, 
  ErrorCode, 
  OrchestrationError,
  isNexusError,
  createErrorResponse 
} from '@nexus/core/errors';

// Throwing a specialized error
function executeTask(taskId: string) {
  throw new OrchestrationError(
    'Task execution failed',
    ErrorCode.ORC_002,
    { taskId, reason: 'Node timeout' }
  );
}

// Handling errors
try {
  executeTask('task-123');
} catch (error) {
  if (isNexusError(error)) {
    console.log('Code:', error.code);       // ORC_002
    console.log('Message:', error.message); // Task execution failed
    console.log('Details:', error.details); // { taskId: 'task-123', reason: 'Node timeout' }
    console.log('Timestamp:', error.timestamp);
  }
}

// Creating API error response
const errorResponse = createErrorResponse(error);
// Returns: { name, message, code, details, timestamp, stack, cause }
```

## Error Response Format

All error responses follow this structure:

```json
{
  "name": "OrchestrationError",
  "message": "Task execution failed",
  "code": "ORC_002",
  "details": {
    "taskId": "task-123",
    "reason": "Node timeout"
  },
  "timestamp": "2026-03-21T12:00:00.000Z",
  "stack": "Error: Task execution failed\n    at executeTask ...",
  "cause": "Node ND_002 timeout after 30000ms"
}
```

## Best Practices

1. **Always use specific error codes** — Don't use generic errors when a specific code is available
2. **Include relevant details** — Add context to the `details` object for debugging
3. **Chain errors** — Use the `cause` parameter to preserve the original error
4. **Serialize for transmission** — Use `toJSON()` or `createErrorResponse()` for API responses

## Implementation Status

- **Phase 1:** Contract definitions (complete)
- **Phase 2:** Error classes implementation
- **Phase 3:** Error handling middleware

---

See also: [INDEX.md](./INDEX.md) | [REST.md](./REST.md) | [WebSocket.md](./WebSocket.md)
