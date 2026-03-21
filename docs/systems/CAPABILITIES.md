# Capabilities (Tools) System

The capabilities system defines and manages tool execution, providing a unified interface for extending Nexus with custom capabilities.

## Overview

The capabilities system provides:

- **Tool definition** - Structured interfaces for capability definition
- **Tool execution** - Safe execution environment for tools
- **Capability sets** - Permission-like system for controlling access
- **Tool registry** - Centralized tool discovery and management

## Contracts

The capabilities system is defined by contracts in [`core/contracts/tool.ts`](../core/contracts/tool.ts):

### Core Interfaces

#### Tool Result

```typescript
interface ToolResult {
  success: boolean;
  output: unknown;
  error?: ToolExecutionError;
  metadata: {
    toolId: string;
    duration: number;
    tokensUsed?: number;
  };
}

type ToolExecutionError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

### Tool Execution Status

```typescript
enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

### Tool Context

```typescript
interface ToolContext {
  sessionId: string;
  userId?: string;
  capabilities: CapabilitySet;
  variables: Record<string, unknown>;
}
```

### Capability Set

```typescript
interface CapabilitySet {
  canAccessFilesystem: boolean;
  canExecuteCode: boolean;
  canAccessNetwork: boolean;
  canUseVectorSearch: boolean;
  customCapabilities: Record<string, boolean>;
}
```

### Tool Schema

```typescript
interface ToolSchema {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}
```

## Extended Tool Contracts

Additional tool contracts are defined in [`modules/tools/contracts/tool.ts`](../../modules/tools/contracts/tool.ts):

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  schema: ToolSchema;
  
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
  validate(input: unknown): boolean;
  getCapabilities(): string[];
}
```

### Tool Registry

```typescript
interface ToolRegistry {
  register(tool: Tool): void;
  unregister(toolId: string): void;
  get(toolId: string): Tool | null;
  list(): Tool[];
  findByCapability(capability: string): Tool[];
}
```

## Architecture

The capabilities system is organized in `systems/capabilities/` and `modules/tools/`:

```
systems/capabilities/
└── (tool execution infrastructure)

modules/tools/
├── contracts/
│   ├── tool.ts         # Extended tool contracts
│   ├── registry.ts     # Tool registry interface
│   └── schema.ts       # Schema definitions
├── code-exec/          # Code execution tools
├── filesystem/         # Filesystem access tools
├── http/               # HTTP request tools
└── vector-search/      # Vector search tools
```

### Built-in Tools

| Tool | Description | Capabilities Required |
|------|-------------|----------------------|
| Code Execution | Execute code in sandbox | `canExecuteCode` |
| File Read/Write | Read/write filesystem | `canAccessFilesystem` |
| HTTP Request | Make HTTP calls | `canAccessNetwork` |
| Vector Search | Search embeddings | `canUseVectorSearch` |

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Core Contracts | ✅ Complete | Minimal tool contracts in Phase 1 |
| Tool Interface | ✅ Complete | Extended in modules/tools |
| Tool Registry | ✅ Complete | Contract defined |
| Tool Schema | ✅ Complete | JSON Schema definitions |
| Built-in Tools | 🔄 Future | Phase 4+ implementation |
| Custom Tools | 🔄 Future | Phase 4+ implementation |

## Usage

### Defining a Tool

```typescript
import { Tool, ToolContext, ToolResult } from '@nexus/tools/contracts/tool';

const myTool: Tool = {
  id: 'my-custom-tool',
  name: 'My Custom Tool',
  description: 'Does something useful',
  schema: {
    input: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    output: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    }
  },
  
  async execute(input, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Check capabilities
      if (!context.capabilities.customCapabilities.canRun) {
        return {
          success: false,
          output: null,
          error: { code: 'FORBIDDEN', message: 'Missing capability' },
          metadata: { toolId: 'my-custom-tool', duration: 0 }
        };
      }
      
      const result = doSomething(input.query);
      
      return {
        success: true,
        output: { result },
        metadata: { toolId: 'my-custom-tool', duration: Date.now() - startTime }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: { code: 'EXECUTION_ERROR', message: error.message },
        metadata: { toolId: 'my-custom-tool', duration: Date.now() - startTime }
      };
    }
  },
  
  validate(input): boolean {
    return typeof input.query === 'string';
  },
  
  getCapabilities(): string[] {
    return ['canRun'];
  }
};
```

### Registering Tools

```typescript
import { ToolRegistry } from '@nexus/tools/contracts/registry';

const registry: ToolRegistry = createRegistry();
registry.register(myTool);
registry.register(anotherTool);

// List all tools
const tools = registry.list();

// Find by capability
const searchTools = registry.findByCapability('canUseVectorSearch');
```

### Executing Tools

```typescript
const context: ToolContext = {
  sessionId: 'session-123',
  userId: 'user-456',
  capabilities: {
    canAccessFilesystem: true,
    canExecuteCode: false,
    canAccessNetwork: true,
    canUseVectorSearch: false,
    customCapabilities: {
      canRun: true
    }
  },
  variables: {}
};

const result = await myTool.execute({ query: 'search term' }, context);

if (result.success) {
  console.log(result.output);
} else {
  console.error(result.error);
}
```

## Related Files

- [`core/contracts/tool.ts`](../core/contracts/tool.ts) - Core tool contracts
- [`modules/tools/contracts/tool.ts`](../modules/tools/contracts/tool.ts) - Extended tool contracts
- [`modules/tools/contracts/registry.ts`](../modules/tools/contracts/registry.ts) - Registry interface
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
