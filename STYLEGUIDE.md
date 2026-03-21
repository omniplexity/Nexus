# Style Guide

This style guide defines coding conventions for Nexus. All code should follow these standards.

## General Principles

- **Explicit over implicit** — Clear code over clever code
- **Single responsibility** — Each file/module does one thing
- **No magic values** — Use constants instead of hardcoded values
- **Fail loudly** — Don't silently ignore errors

## TypeScript

### Formatting

We use Prettier for code formatting. Run `npm run format` before committing.

```typescript
// ✅ Good
const config: NexusConfig = {
  maxTokens: 4096,
  temperature: 0.7,
};

// ❌ Bad - inconsistent spacing
const config: NexusConfig={maxTokens:4096,temperature:0.7};
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `executionContext` |
| Functions | camelCase | `executeNode()` |
| Classes | PascalCase | `Orchestrator` |
| Interfaces | PascalCase | `NodeConfig` |
| Types | PascalCase | `TaskStatus` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Enums | PascalCase | `NodeType` |
| Enum Values | PascalCase | `NodeType.REASONING` |
| Files | kebab-case | `orchestrator.ts` |

### Type Definitions

```typescript
// ✅ Good - explicit types
const nodeCount: number = calculateNodeCount(graph);

// ❌ Bad - implicit any
const nodeCount = calculateNodeCount(graph);

// ✅ Good - interface for objects
interface NodeConfig {
  id: string;
  type: NodeType;
  inputs: Record<string, unknown>;
}

// ❌ Bad - loose object typing
const nodeConfig = { id: '1', type: 'reasoning', inputs: {} };
```

### Error Handling

```typescript
// ✅ Good - typed errors
function executeNode(node: Node): NodeResult {
  try {
    return node.executor.execute(node.input);
  } catch (error) {
    if (error instanceof NexusError) {
      throw new ExecutionError(`Node ${node.id} failed`, error);
    }
    throw new ExecutionError('Unknown execution error', error);
  }
}

// ❌ Bad - catching all errors silently
function executeNode(node: Node): NodeResult {
  try {
    return node.executor.execute(node.input);
  } catch {
    return { success: false };
  }
}
```

## Project Structure

Follow the directory structure defined in [AGENTS.md](AGENTS.md):

```
apps/          → Entrypoint applications
core/           → System kernel (types, contracts, errors)
systems/        → Primary systems (orchestration, context, cognitive)
modules/        → Pluggable extensions
interfaces/     → External boundaries
```

### File Organization

- One export per file preferred for contracts
- Group related functionality in directories
- Use `index.ts` for barrel exports

```typescript
// core/contracts/orchestrator.ts
export interface Orchestrator { ... }
export interface Task { ... }
export interface DAG { ... }

// core/contracts/index.ts
export * from './orchestrator.js';
export * from './node.js';
// ...
```

## Git & Commits

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting only
- `refactor` — code restructuring
- `test` — adding tests
- `chore` — maintenance

```bash
# ✅ Good
feat(orchestrator): add parallel node execution

Implements parallel execution for independent nodes
in the DAG, reducing overall execution time.

Closes #42

# ❌ Bad
fixed stuff
```

## Testing

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases and error conditions

```typescript
describe('DAGExecutor', () => {
  describe('execute', () => {
    it('should execute nodes in topological order', () => {
      // Arrange
      const dag = createTestDAG();
      
      // Act
      const result = executor.execute(dag);
      
      // Assert
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });
  });
});
```

## Documentation

### Comments

- Explain **why**, not **what**
- Use JSDoc for public APIs
- Keep comments updated with code changes

```typescript
/**
 * Executes a task within the orchestration graph.
 * 
 * @param task - The task to execute
 * @param context - Execution context with memory and constraints
 * @returns The result of task execution
 * 
 * @remarks
 * This function handles parallel node execution,
 * error propagation, and metrics collection.
 */
export async function executeTask(
  task: Task,
  context: ExecutionContext
): Promise<ExecutionResult> { ... }
```

### README Files

Each module should have a README explaining:
- Purpose and functionality
- Key interfaces
- Usage examples

## Running Checks

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run typecheck

# Run tests
npm run test
```

---

*Last updated: March 2026*
