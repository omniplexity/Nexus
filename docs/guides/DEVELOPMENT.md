# Development Guide

This guide covers the development environment setup, workflow, and coding standards for Nexus.

## Development Workflow

### 1. Create a Feature Branch

```bash
# Ensure you're on the latest main
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Changes

Follow the coding standards defined in [STYLEGUIDE](../../STYLEGUIDE.md).

### 3. Run Quality Checks

Before committing, always run:

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

### 4. Commit Changes

Follow the commit conventions in [COMMIT_GUIDE](COMMIT_GUIDE.md).

### 5. Create Pull Request

Push your branch and create a PR against `main`.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run all workspaces in development mode |
| `npm run build` | Build all workspaces |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Lint all code |
| `npm run lint:fix` | Fix lint issues automatically |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

## Coding Standards

### TypeScript Conventions

Follow these rules (see [STYLEGUIDE](../../STYLEGUIDE.md) for full details):

#### Explicit Typing

```typescript
// ✅ Good - explicit types
const nodeCount: number = calculateNodeCount(graph);
function processTask(task: Task): Promise<TaskResult> { ... }

// ❌ Bad - implicit any
const nodeCount = calculateNodeCount(graph);
```

#### Naming

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `executionContext` |
| Functions | camelCase | `executeNode()` |
| Classes | PascalCase | `Orchestrator` |
| Interfaces | PascalCase | `NodeConfig` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Enums | PascalCase | `NodeType` |
| Files | kebab-case | `orchestrator.ts` |

#### Error Handling

```typescript
// ✅ Good - proper error handling with types
try {
  return await executeNode(node);
} catch (error) {
  if (error instanceof NexusError) {
    throw new NodeError(
      `Node ${node.id} failed`,
      ErrorCode.ND_002,
      { nodeId: node.id },
      error
    );
  }
  throw new NodeError('Unknown node error', ErrorCode.ND_002, {}, error);
}

// ❌ Bad - silent failures
try {
  return await executeNode(node);
} catch {
  return { success: false };
}
```

### File Organization

- One export per file preferred for contracts
- Use `index.ts` for barrel exports
- Group related functionality in directories

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

## Project Structure

### Directory Placement

Follow the dependency flow:

```
apps/          → Entry point applications
interfaces/    → External boundaries (API, CLI, WebSocket)
systems/       → Primary systems (orchestration, context, cognitive)
modules/       → Pluggable extensions (tools, agents, integrations)
core/          → System kernel (types, contracts, errors)
data/          → Data layer (repositories, adapters, schemas)
runtime/       → Runtime environment (process, scheduler, state)
```

### Cross-Layer Rules

**Never** import from a lower layer to an upper layer:

- ✅ `systems` can import from `core`
- ✅ `modules` can import from `core` and `systems`
- ❌ `core` cannot import from `systems` or `modules`

## Working with Contracts

Nexus follows contract-first development. See [CONTRACT_DEVELOPMENT](CONTRACT_DEVELOPMENT.md) for details.

## Testing

Write tests for all new functionality. See [TESTING](TESTING.md) for patterns.

## Common Development Tasks

### Adding a New Node Type

1. Define the contract in `core/contracts/node.ts`
2. Implement the node in `systems/orchestration/nodes/`
3. Register the node type in the orchestrator
4. Add tests

### Adding a New Tool

1. Define the tool schema in `modules/tools/contracts/schema.ts`
2. Implement the tool in `modules/tools/<tool-name>/`
3. Register the tool in the registry
4. Add tests

### Adding a New Model Provider

1. Define the provider contract in `core/contracts/model-provider.ts`
2. Implement the provider in `systems/models/`
3. Add configuration support
4. Add tests

## Debugging

### VS Code Debugging

Create a `.vscode/launch.json`:

```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceRoot}/node_modules/jest/bin/jest.js",
      "args": ["--runInBand"],
      "cwd": "${workspaceRoot}"
    }
  ]
}
```

### Logging

Use the event system for observability:

```typescript
import { EventEmitter, EventTypes } from '@nexus/core/events';

const emitter = new EventEmitter();

emitter.emit({
  id: 'event-1',
  namespace: EventNamespace.ORCHESTRATION,
  type: EventTypes.ORCHESTRATION_STARTED,
  timestamp: new Date(),
  payload: { taskId: 'task-1' },
  priority: EventPriority.NORMAL
});
```

## Environment Variables

See [infra/local/.env.example](../../infra/local/.env.example) for required environment variables.

## Additional Resources

- [Architecture Overview](../architecture/OVERVIEW.md)
- [Component Map](../architecture/COMPONENT_MAP.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [API Documentation](../api/INDEX.md)

---

*Last updated: March 2024*
