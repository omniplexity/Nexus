# Troubleshooting Guide

This guide covers common issues encountered while developing Nexus and their solutions.

## Development Environment

### Node.js Version Issues

**Problem**: `npm install` fails or shows unexpected behavior

**Solution**: Ensure you're using Node.js >= 20.0.0

```bash
# Check Node version
node --version

# If needed, use nvm to switch versions
nvm use 20
# or
nvm install 20
nvm use 20
```

### Dependencies Not Installing

**Problem**: `npm install` fails or hangs

**Solutions**:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules
npm install

# If using a monorepo, clean all workspaces
npm run clean  # if available
rm -rf node_modules apps/*/node_modules core/*/node_modules
npm install
```

### TypeScript Errors

**Problem**: TypeScript compilation errors

**Solutions**:

```bash
# Check TypeScript version
npm run typecheck

# If errors, update TypeScript
npm install typescript@latest

# Clear TypeScript cache
rm -rf node_modules/.cache
```

## Build & Compilation

### Circular Dependency Errors

**Problem**: Build fails with circular dependency warnings

**Solution**: 
1. Identify the circular import
2. Restructure to use `type` imports
3. Create a shared types file for common types

```typescript
// Instead of value imports
import { Node } from './node';  // Can cause circular dependency

// Use type imports
import type { Node } from './node';  // Safe
```

### Module Not Found

**Problem**: `Cannot find module '@nexus/...'` or similar

**Solutions**:

```bash
# Ensure workspace is built
npm run build

# Or build specific workspace
npm run build --workspace=@nexus/core
```

### Outdated Type Definitions

**Problem**: Types out of sync with implementation

**Solution**:

```bash
# Rebuild all workspaces
npm run build

# Then run typecheck
npm run typecheck
```

## Testing

### Tests Not Running

**Problem**: `npm run test` shows no tests or fails immediately

**Solutions**:

```bash
# Check test configuration
cat jest.config.js  # or vitest.config.ts

# Run tests with verbose output
npm run test -- --verbose

# Check test file patterns
```

### Test Timeouts

**Problem**: Tests timeout, especially async operations

**Solutions**:

```typescript
// Increase timeout for specific test
it('should complete async operation', async () => {
  await expect(promise).resolves.toBeDefined();
}, 10000); // 10 second timeout

// Or configure globally in test setup
```

### Mock Not Working

**Problem**: Mock functions not being called or returning wrong values

**Solutions**:

```typescript
// Ensure mock is reset between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Verify mock was called
expect(mockFunction).toHaveBeenCalled();

// Verify mock was called with specific args
expect(mockFunction).toHaveBeenCalledWith(expectedArg);
```

## Runtime Errors

### Import Errors

**Problem**: `Module not found` or `Cannot import from` errors at runtime

**Solution**:
1. Ensure all exports are in `index.ts` barrel files
2. Check `tsconfig.json` has correct paths
3. Ensure build output is in correct location

### Environment Variables

**Problem**: Missing environment variables cause runtime errors

**Solution**:

```bash
# Copy example env file
cp infra/local/.env.example infra/local/.env

# Edit with your values
nano infra/local/.env
```

### Memory Issues

**Problem**: Out of memory errors during build or runtime

**Solution**:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or in package.json scripts
"build": "NODE_OPTIONS='--max-old-space-size=4096' tsc"
```

## Linting & Formatting

### Prettier Conflicts

**Problem**: ESLint and Prettier conflict on formatting

**Solution**:

```bash
# Run Prettier first
npm run format

# Then run lint
npm run lint

# Or use lint:fix
npm run lint:fix
```

### ESLint Not Recognizing TypeScript

**Problem**: ESLint errors on TypeScript syntax

**Solution**:

```bash
# Ensure TypeScript ESLint parser is installed
npm install @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Check .eslintrc.json includes TypeScript parser
```

## Git & Version Control

### Merge Conflicts in lockfiles

**Problem**: Conflicts in `package-lock.json`

**Solution**:

```bash
# Remove lockfile and regenerate
rm package-lock.json
npm install
# Commit the new lockfile
```

### Large Files in Git

**Problem**: Pushing large files fails

**Solution**:

```bash
# Check .gitignore is correct
# Add large files to .gitignore if needed

# If already committed, remove from history
git filter-branch --tree-filter 'rm -rf large-folder' HEAD
# Or use git-filter-repo for larger repos
```

## Common Error Codes

See [core/contracts/errors.ts](../../core/contracts/errors.ts) for error codes:

| Code | Category | Description |
|------|----------|-------------|
| ORC-001 to ORC-004 | Orchestration | Task/DAG execution errors |
| ND-001 to ND-004 | Node | Node execution errors |
| MEM-001 to MEM-004 | Memory | Memory operations errors |
| TOL-001 to TOL-005 | Tool | Tool execution errors |
| MOD-001 to MOD-004 | Model | Model provider errors |
| CTX-001 to CTX-003 | Context | Context management errors |

## Getting Help

If issues persist:

1. Search existing [GitHub Issues](https://github.com/omniplexity/nexus/issues)
2. Check [Discussions](https://github.com/omniplexity/nexus/discussions)
3. Create a new issue with:
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Operating system
   - Full error message
   - Steps to reproduce

## Related Documentation

- [CONTRIBUTING](../../CONTRIBUTING.md)
- [DEVELOPMENT](DEVELOPMENT.md)
- [TESTING](TESTING.md)
- [API Errors Documentation](../api/ERRORS.md)

---

*Last updated: March 2024*
