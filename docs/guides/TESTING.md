# Testing Guide

This guide covers testing patterns, conventions, and best practices for Nexus.

## Testing Philosophy

Nexus follows these testing principles:

- **Test behavior, not implementation** - Focus on what the code does, not how
- **Test edge cases** - Include error conditions and boundary cases
- **Use descriptive names** - Test names should describe the scenario
- **Follow AAA pattern** - Arrange, Act, Assert

## Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific workspace
npm run test --workspace=@nexus/core

# Run tests in watch mode (if supported)
npm run test -- --watch
```

## Test Structure

### File Organization

```
<package>/
├── src/
│   ├── index.ts
│   └── my-module.ts
├── tests/
│   ├── my-module.test.ts      # Unit tests
│   ├── my-module.integration.ts # Integration tests
│   └── fixtures/
│       └── test-data.json     # Test fixtures
```

### Test File Naming

| Type | Naming Convention | Example |
|------|-------------------|---------|
| Unit tests | `<module>.test.ts` | `orchestrator.test.ts` |
| Integration | `<module>.integration.ts` | `orchestrator.integration.ts` |
| Test fixtures | `<name>.fixture.ts` | `test-dag.fixture.ts` |

## Writing Tests

### AAA Pattern

```typescript
describe('DAGExecutor', () => {
  describe('execute', () => {
    it('should execute nodes in topological order', () => {
      // Arrange - Set up test data and dependencies
      const dag = createTestDAG();
      const executor = new DAGExecutor({ maxConcurrentNodes: 2 });
      
      // Act - Execute the function being tested
      const result = await executor.execute(dag, context);
      
      // Assert - Verify the expected outcome
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.nodeOutputs['node-1'].status).toBe(NodeStatus.COMPLETED);
    });
  });
});
```

### Descriptive Test Names

```typescript
// ✅ Good - describes the scenario and expected behavior
it('should return TaskStatus.FAILED when node execution throws an error');

it('should execute independent nodes in parallel for better performance');

// ❌ Bad - vague or missing context
it('should work');
it('test1');
it('handles errors');
```

### Testing Edge Cases

```typescript
describe('execute', () => {
  // Happy path
  it('should execute nodes in topological order', () => { ... });
  
  // Error cases
  it('should handle circular dependencies gracefully', () => { ... });
  it('should return FAILED status when a node throws', () => { ... });
  it('should timeout long-running nodes', () => { ... });
  
  // Edge cases
  it('should handle empty DAG', () => { ... });
  it('should handle single-node DAG', () => { ... });
  it('should handle nodes with no dependencies', () => { ... });
});
```

## Mocking

### Using Mocks

```typescript
import { MockProvider } from '@nexus/test-utils';

describe('ModelRouter', () => {
  let router: ModelRouter;
  let mockProvider: MockProvider;
  
  beforeEach(() => {
    // Create mock provider
    mockProvider = new MockProvider({
      id: 'mock-provider',
      name: 'Mock Provider',
      status: ProviderStatus.AVAILABLE
    });
    
    router = new ModelRouter();
    router.addProvider(mockProvider);
  });
  
  it('should select available provider', async () => {
    // Use mock
    mockProvider.complete.mockResolvedValue({
      id: 'response-1',
      model: 'mock-model',
      content: 'test response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      latency: 100
    });
    
    const selection = await router.selectModel(request);
    expect(selection.provider.id).toBe('mock-provider');
  });
});
```

### Mocking Contracts

```typescript
// Create mock implementation of a contract
class MockMemory implements Memory {
  private store: Map<string, MemoryEntry> = new Map();
  
  async retrieve(query: MemoryQuery): Promise<MemoryResult> {
    return {
      entries: Array.from(this.store.values()),
      total: this.store.size,
      query
    };
  }
  
  async store(entry: MemoryEntry): Promise<void> {
    this.store.set(entry.id, entry);
  }
  
  // ... implement other methods
}

// Use in tests
const memory = new MockMemory();
const context = { memory } as ExecutionContext;
```

## Test Fixtures

### Creating Fixtures

```typescript
// tests/fixtures/test-dag.fixture.ts
import { DAG, Node, NodeType } from '@nexus/core/contracts';

export function createTestDAG(): DAG {
  return {
    id: 'test-dag',
    nodes: {
      'node-1': {
        id: 'node-1',
        type: NodeType.REASONING,
        name: 'Reasoning Node',
        config: {},
        async execute() { /* ... */ },
        validate() { return true; },
        getDependencies() { return []; },
        clone() { return this; }
      }
    },
    edges: []
  };
}

export function createDAGWithDependencies(): DAG {
  // DAG with node dependencies
}
```

### Using Fixtures

```typescript
import { createTestDAG } from './fixtures/test-dag.fixture';

describe('DAGExecutor', () => {
  it('should execute simple DAG', () => {
    const dag = createTestDAG();
    // ... test
  });
});
```

## Testing Errors

### Error Handling Tests

```typescript
describe('execute', () => {
  it('should throw NodeError when node is not found', async () => {
    const executor = new DAGExecutor({});
    const dag = createTestDAG();
    
    // Reference non-existent node
    dag.edges = [{ sourceId: 'node-1', targetId: 'non-existent' }];
    
    await expect(executor.execute(dag, context))
      .rejects.toThrow(NodeError);
  });
  
  it('should include error details in result', async () => {
    const result = await executor.execute(failingDag, context);
    
    expect(result.status).toBe(TaskStatus.FAILED);
    expect(result.error).toContain('Node node-1 failed');
  });
});
```

## Testing Async Code

### Promises

```typescript
it('should resolve with result on success', async () => {
  const result = await myFeature.execute(input);
  expect(result.success).toBe(true);
});

it('should reject with error on failure', async () => {
  await expect(myFeature.execute(invalidInput))
    .rejects.toThrow(ValidationError);
});
```

### Async Iterables

```typescript
it('should stream chunks correctly', async () => {
  const chunks: StreamingChunk[] = [];
  
  for await (const chunk of provider.completeWithStreaming(request)) {
    chunks.push(chunk);
  }
  
  expect(chunks).toHaveLength(3);
  expect(chunks[0].delta).toBe('Hello');
});
```

## Coverage

Run coverage to identify untested code:

```bash
npm run test -- --coverage
```

Aim for:

| Category | Target |
|----------|--------|
| Statements | > 80% |
| Branches | > 75% |
| Functions | > 80% |
| Lines | > 80% |

## Integration Tests

### Setup

```typescript
// tests/integration/my-feature.integration.ts
describe('MyFeature Integration', () => {
  let feature: MyFeature;
  let testEnv: TestEnvironment;
  
  beforeAll(async () => {
    // Set up test environment
    testEnv = await TestEnvironment.create();
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  beforeEach(() => {
    feature = new MyFeature();
  });
  
  it('should work end-to-end', async () => {
    // Integration test logic
  });
});
```

## Best Practices

1. **Test one thing per test** - Each test should verify a single behavior
2. **Use meaningful assertions** - Don't just check for truthy/falsy
3. **Clean up after tests** - Use `afterEach` or `afterAll` for cleanup
4. **Avoid test interdependencies** - Each test should run independently
5. **Keep tests fast** - Slow tests discourage running them
6. **Use realistic test data** - Don't use magic numbers or random values

## Related Documentation

- [STYLEGUIDE - Testing Section](../../STYLEGUIDE.md#testing)
- [GLOSSARY - Test Terms](../../GLOSSARY.md)
- [Architecture Testing](../architecture/)

---

*Last updated: March 2024*
