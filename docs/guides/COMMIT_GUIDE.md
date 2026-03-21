# Commit Guide

This guide covers commit message conventions for Nexus. The conventions are based on [Conventional Commits](https://www.conventionalcommits.org/) and defined in [STYLEGUIDE.md](../../STYLEGUIDE.md).

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Components

| Component | Description | Rules |
|-----------|-------------|-------|
| `type` | Type of change | Required, must be one of the allowed types |
| `scope` | Area affected | Optional, but recommended |
| `description` | Short summary | Required, max 50 characters |
| `body` | Detailed description | Optional, wrap at 72 characters |
| `footer` | Breaking changes or issues | Optional |

## Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(orchestrator): add parallel node execution` |
| `fix` | Bug fix | `fix(memory): resolve memory leak in session cleanup` |
| `docs` | Documentation changes | `docs(api): update REST API endpoint descriptions` |
| `style` | Formatting, no code change | `style: fix inconsistent indentation` |
| `refactor` | Code restructuring | `refactor(context): simplify compression logic` |
| `test` | Adding or updating tests | `test(orchestrator): add tests for DAG validation` |
| `chore` | Maintenance, dependencies | `chore: update TypeScript to 5.3.3` |

## Scopes

Use scopes to indicate the area of change:

| Scope | Area |
|-------|------|
| `orchestrator` | DAG execution and scheduling |
| `node` | Node types and execution |
| `memory` | Memory and context management |
| `model` | Model provider abstraction |
| `tool` | Tool system |
| `context` | Context engine |
| `runtime` | Runtime environment |
| `api` | API interfaces |
| `cli` | Command-line interface |
| `config` | Configuration |
| `deps` | Dependencies |

## Examples

### Feature

```
feat(orchestrator): add parallel node execution

Implements parallel execution for independent nodes in the DAG,
reducing overall execution time for tasks with no dependencies.

Closes #42
```

### Bug Fix

```
fix(memory): resolve memory leak in session cleanup

The session cleanup was not properly releasing references to
memory entries, causing memory to accumulate over time.

Fixes #123
```

### Documentation

```
docs: add CONTRIBUTING.md

Adds contribution guidelines with development workflow,
coding standards, and pull request process.
```

### Refactor

```
refactor(context): simplify token compression algorithm

Replaces complex compression logic with a simpler approach
that achieves similar compression ratios with less overhead.
```

### Breaking Change

```
feat(api): change model provider configuration format

The model provider configuration has been restructured to support
multiple providers per role.

BREAKING CHANGE: The `ModelProviderConfig` interface has changed.
Migration guide available in docs/migration/v2.md
```

### Just Body

```
chore: update dependencies

Updates npm dependencies to latest compatible versions:
- typescript@5.3.3
- eslint@8.56.0
- prettier@3.2.4
```

## Rules

1. **Use imperative mood** - "add" not "added" or "adds"
2. **Lowercase type and scope** - `feat(core):` not `Feat(Core):`
3. **No period after description** - `feat: add feature` not `feat: add feature.`
4. **Separate subject from body with blank line**
5. **Reference issues** - Use `Closes`, `Fixes`, or `Resolves` with issue numbers

## Common Mistakes

### ❌ Bad Commits

```
fixed stuff
Update
feat: A new feature
Added new feature for better performance
WIP
```

### ✅ Good Commits

```
feat(memory): add priority-based memory retrieval
fix(api): handle rate limit errors gracefully
docs: update README with installation instructions
test(orchestrator): add DAG cycle detection tests
```

## Tools

### Commitizen

Use Commitizen for interactive commit creation:

```bash
npx cz commit
```

### Git Hooks

Pre-commit hooks run linting and formatting. Ensure they pass before committing:

```bash
# Manual check
npm run lint
npm run format
npm run typecheck
```

## Related Documentation

- [STYLEGUIDE - Git & Commits Section](../../STYLEGUIDE.md#git--commits)
- [CONTRIBUTING - Making Changes](../../CONTRIBUTING.md#making-changes)
- [GLOSSARY - Commit](GLOSSARY.md)

---

*Last updated: March 2024*
