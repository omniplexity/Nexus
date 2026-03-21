# Contract-First Development Guide

This guide explains how to create new contracts using Nexus's contract-first development methodology.

## What is Contract-First Development?

Contract-first development means defining interfaces (contracts) before writing implementation code. This ensures:

- **Clear API boundaries** - Components interact through well-defined interfaces
- **Independent development** - Teams can work on different parts simultaneously
- **Type safety** - TypeScript types are defined upfront
- **Testability** - Contracts can be mocked for testing

## Contract Locations

Contracts are organized by layer:

| Layer | Location | Purpose |
|-------|----------|---------|
| Core | `core/contracts/` | System-wide interfaces |
| Systems | `<system>/contracts/` | System-specific interfaces |
| Modules | `modules/*/contracts/` | Module-specific interfaces |
| Interfaces | `interfaces/contracts/` | External API contracts |

## Creating a New Contract

### Step 1: Choose the Right Location

- Core contracts go in `core/contracts/`
- System-specific contracts go in the respective system directory
- Module-specific contracts go in `modules/<module>/contracts/`

### Step 2: Define the Contract

Create a new file or add to an existing contract file. Follow these patterns:

#### Interface Definition

```typescript
// core/contracts/my-feature.ts

/**
 * My Feature Contracts for Nexus
 * 
 * Defines interfaces for the new feature.
 */

/**
 * Configuration for my feature
 */
export interface MyFeatureConfig {
  enabled: boolean;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Input for my feature
 */
export interface MyFeatureInput {
  id: string;
  data: unknown;
}

/**
 * Output from my feature
 */
export interface MyFeatureOutput {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * My feature interface
 * @version 1.0.0
 */
export interface MyFeature {
  /**
   * Execute the feature with given input
   */
  execute(input: MyFeatureInput): Promise<MyFeatureOutput>;
  
  /**
   * Initialize the feature
   */
  initialize(config: MyFeatureConfig): Promise<void>;
  
  /**
   * Get feature status
   */
  getStatus(): 'idle' | 'running' | 'stopped';
}
```

#### Enumeration Definition

```typescript
/**
 * Status enumeration for my feature
 */
export enum MyFeatureStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error'
}
```

#### Error Codes (if needed)

Add error codes to `core/contracts/errors.ts`:

```typescript
// In ErrorCode enum
MYF_001 = 'MYF_001', // Feature initialization failed
MYF_002 = 'MYF_002', // Feature execution failed
MYF_003 = 'MYF_003', // Feature timeout

// Create error class
export class MyFeatureError extends NexusError {
  constructor(
    message: string,
    code: ErrorCode.MYF_001 | ErrorCode.MYF_002 | ErrorCode.MYF_003,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code, details, cause);
  }
}
```

### Step 3: Export from Barrel Files

Add exports to the appropriate `index.ts`:

```typescript
// core/contracts/index.ts
export * from './my-feature.js';
```

### Step 4: Version Contracts

Always include version annotations for contracts:

```typescript
/**
 * My feature interface
 * @version 1.0.0
 */
export interface MyFeature { ... }
```

## Contract Patterns

### Minimal Contracts

Keep contracts minimal. Only define what's necessary:

```typescript
// ✅ Good - minimal contract
export interface Tool {
  execute(input: ToolInput): Promise<ToolResult>;
  getSchema(): ToolSchema;
}

// ❌ Bad - bloated contract
export interface Tool {
  execute(input: ToolInput): Promise<ToolResult>;
  getSchema(): ToolSchema;
  // Too many methods - consider splitting
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  getMetrics(): Metrics;
  getConfig(): Config;
  // ... more methods
}
```

### Composition

Compose contracts from smaller contracts:

```typescript
export interface Node {
  id: string;
  type: NodeType;
  execute(input: NodeInput): Promise<NodeOutput>;
}

export interface DAG {
  id: string;
  nodes: Record<string, Node>;
  edges: DAGEdge[];
}
```

### Factory Functions

Provide factory functions for complex creation:

```typescript
export interface MyFeatureFactory {
  create(config: MyFeatureConfig): MyFeature;
  createDefault(): MyFeature;
}
```

## Contract Examples

### From core/contracts/node.ts

```typescript
export enum NodeType {
  REASONING = 'reasoning',
  TOOL = 'tool',
  MEMORY = 'memory',
  CONTROL = 'control',
  AGGREGATOR = 'aggregator',
  TRANSFORM = 'transform',
  CONDITIONAL = 'conditional'
}

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  
  execute(input: NodeInput): Promise<NodeOutput>;
  validate(): boolean;
  getDependencies(): string[];
  clone(): Node;
}
```

### From core/contracts/memory.ts

```typescript
export interface Memory {
  retrieve(query: MemoryQuery): Promise<MemoryResult>;
  store(entry: MemoryEntry): Promise<void>;
  update(id: string, updates: Partial<MemoryEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(sessionId: string): Promise<void>;
  getSnapshot(sessionId: string, maxTokens: number): Promise<MemorySnapshot>;
}
```

### From core/contracts/model-provider.ts

```typescript
export interface ModelProvider {
  id: string;
  name: string;
  status: ProviderStatus;
  
  complete(request: ModelRequest): Promise<ModelResponse>;
  completeWithStreaming(request: ModelRequest): AsyncIterable<StreamingChunk>;
  listModels(): Promise<ModelInfo[]>;
  healthCheck(): Promise<boolean>;
}
```

## Best Practices

1. **Always use explicit types** - No `any` in contracts
2. **Document with JSDoc** - Explain purpose and parameters
3. **Version interfaces** - Use `@version` annotation
4. **Use strict typing** - Prefer specific types over generics when appropriate
5. **Keep contracts stable** - Once published, minimize breaking changes
6. **Group related contracts** - Put related interfaces in the same file
7. **Use barrel exports** - Export through `index.ts` files

## Testing Contracts

Test contracts by:

1. **Mock implementations** - Create mock classes that implement the contract
2. **Contract tests** - Test that implementations satisfy the contract
3. **Interface compliance** - Use TypeScript to verify implementation matches interface

```typescript
// Test mock implements contract
class MockMyFeature implements MyFeature {
  async execute(input: MyFeatureInput): Promise<MyFeatureOutput> {
    return { success: true, result: input.data };
  }
  
  async initialize(config: MyFeatureConfig): Promise<void> {
    // Implementation
  }
  
  getStatus(): 'idle' | 'running' | 'stopped' {
    return 'idle';
  }
}
```

## Related Documentation

- [ADR-001: Contract-First Development](../decisions/ADR-001-Contract-First-Development.md)
- [ADR-002: Layered Architecture](../decisions/ADR-002-Layered-Architecture.md)
- [STYLEGUIDE](../../STYLEGUIDE.md)
- [GLOSSARY](../../GLOSSARY.md) - Contract definition

---

*Last updated: March 2024*
