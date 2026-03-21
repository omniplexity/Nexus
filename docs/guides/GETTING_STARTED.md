# Getting Started with Nexus

This guide walks you through setting up your development environment and running your first task in Nexus.

## Prerequisites

Ensure you have the following installed:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 20.0.0 | LTS recommended |
| npm | >= 10.0.0 | Comes with Node.js |
| Git | Any recent version | For version control |

## Step 1: Clone the Repository

```bash
git clone https://github.com/omniplexity/nexus.git
cd nexus
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs all dependencies for the monorepo workspaces:

- `apps/` - Entry point applications
- `core/` - System kernel (types, contracts, errors)
- `systems/` - Primary systems (orchestration, context, cognitive)
- `modules/` - Pluggable extensions (tools, agents)
- `interfaces/` - External boundaries

## Step 3: Verify TypeScript Compilation

```bash
npm run typecheck
```

This ensures all TypeScript types are valid across the codebase.

## Step 4: Run the Tests

```bash
npm run test
```

All tests should pass before making changes.

## Step 5: Format and Lint

Before writing code, format and lint your work:

```bash
npm run format
npm run lint
```

## Project Structure Overview

```
nexus/
├── apps/              # Entry point applications (CLI, web, desktop)
├── core/              # System kernel
│   ├── contracts/     # Interface definitions
│   ├── types/         # TypeScript types
│   ├── errors/        # Error classes
│   └── utils/         # Utility functions
├── systems/           # Primary systems
│   ├── orchestration/ # DAG execution engine
│   ├── context/       # Memory and context management
│   └── cognitive/     # Intent, planning, strategy
├── modules/           # Pluggable extensions
│   ├── tools/         # Tool implementations
│   ├── agents/        # Agent types
│   └── integrations/  # External integrations
├── interfaces/        # External boundaries (API, CLI, WebSocket)
├── docs/              # Documentation
└── infra/             # Infrastructure (Docker, CI)
```

## Understanding the Architecture

Nexus follows a **layered architecture**:

```
apps → interfaces → systems → core
                      ↓
                   modules
                      ↓
                    data
                      ↓
                 runtime
```

For more details, see:

- [Architecture Overview](../architecture/OVERVIEW.md)
- [Layered Architecture](../architecture/LAYERS.md)
- [Architecture Decisions](../decisions/INDEX.md)

## Creating Your First Task

After setup, you can create a simple task execution. Here's a conceptual example:

```typescript
import { Task, TaskStatus, Orchestrator } from '@nexus/core/contracts';

// Define a task
const task: Task = {
  id: 'my-first-task',
  type: 'reasoning',
  input: {
    prompt: 'What is the capital of France?'
  }
};

// Execute through orchestrator (implementation details vary)
const result = await orchestrator.execute(task, context);

console.log(`Task status: ${result.status}`);
console.log(`Output: ${result.output}`);
```

## Common First Steps

After getting started, consider:

1. **Read the Architecture** - Understand how the DAG execution works
2. **Explore Contracts** - Review [`core/contracts/`](../../core/contracts/) for interfaces
3. **Follow Contract-First** - See [CONTRACT_DEVELOPMENT](CONTRACT_DEVELOPMENT.md) guide
4. **Write Tests** - See [TESTING](TESTING.md) guide

## Next Steps

- [DEVELOPMENT](DEVELOPMENT.md) - Development workflow and coding standards
- [CONTRACT_DEVELOPMENT](CONTRACT_DEVELOPMENT.md) - Creating new contracts
- [TESTING](TESTING.md) - Writing tests
- [COMMIT_GUIDE](COMMIT_GUIDE.md) - Making commits

## Troubleshooting

If you encounter issues:

1. Check the [TROUBLESHOOTING](TROUBLESHOOTING.md) guide
2. Ensure Node.js version is correct: `node --version`
3. Try a clean install: `rm -rf node_modules && npm install`

---

*Last updated: March 2024*
