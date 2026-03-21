# ADR-003: TypeScript as Primary Language

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-001](./ADR-001-Contract-First-Development.md), [ADR-002](./ADR-002-Layered-Architecture.md)

## Context

Nexus requires a language choice that supports:

- **Type safety**: Critical for a complex system with multiple interdependent layers
- **Strong tooling**: IDE support, refactoring capabilities, and linting
- **Cross-platform**: Desktop (Electron), CLI, and potential server deployments
- **Ecosystem**: Rich libraries for AI/ML, networking, and data processing
- **Developer experience**: Fast iteration cycles and clear error messages

The PRE-PROJECT-MASTER-SPEC.md specifies Node.js for the backend and the project uses TypeScript configuration.

## Decision

TypeScript will be the primary and canonical language for Nexus development:

1. **All new code must be written in TypeScript** - No JavaScript files except for specific build artifacts
2. **Strict type checking** - Full strict mode enabled in tsconfig.json
3. **Type definitions first** - Contracts and interfaces defined before implementations
4. **No `any` type** - Explicit types required; use `unknown` with type guards when necessary

### TypeScript Configuration Standards

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### When TypeScript Cannot Be Used

- **Build tooling**: Some build tools may require JavaScript
- **Configuration files**: Package.json, ESLint config, etc.
- **Templates**: Some third-party templates

## Consequences

### Positive

- **Compile-time safety**: Catch errors before runtime
- **Self-documenting code**: Types serve as documentation
- **Better IDE support**: IntelliSense, refactoring, navigation
- **Easier maintenance**: Clear contract violations at compile time
- **Refactoring confidence**: Rename, move, and extract with safety
- **Consistent codebase**: Single language reduces cognitive load

### Negative

- **Compilation overhead**: Build step adds time to development
- **Learning curve**: Team members unfamiliar with TypeScript need training
- **Type complexity**: Some advanced patterns can be complex
- **Bundle size**: TypeScript adds to final bundle (mitigated by stripping)
- **Migration effort**: Existing codebases may be slower to migrate

## Related Decisions

- [ADR-001: Contract-First Development](./ADR-001-Contract-First-Development.md) - TypeScript enables compile-time contract validation
- [ADR-002: Layered Architecture](./ADR-002-Layered-Architecture.md) - TypeScript interfaces define cross-layer contracts
