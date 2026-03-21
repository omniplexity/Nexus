# ADR-007: Local-First Data Storage

- **Status**: Accepted
- **Date**: 2026-03-21
- **Deciders**: Nexus Core Team
- **Related ADRs**: [ADR-002](./ADR-002-Layered-Architecture.md), [ADR-005](./ADR-005-DAG-Based-Orchestration.md)

## Context

Nexus is designed as a local-first AI operating system:

- **Privacy**: User data stays on their machine
- **Offline capability**: Works without internet connection
- **Low latency**: Local storage is faster than remote
- **Cost reduction**: No cloud storage costs
- **User control**: Users own their data
- **Security**: Reduced attack surface with local data

The PRE-PROJECT-MASTER-SPEC.md explicitly defines "Local-First Execution" as a secondary objective and specifies the runtime architecture using local storage (SQLite → PostgreSQL migration path) with a desktop Electron application.

## Decision

Nexus will implement a local-first data storage strategy:

### Storage Architecture

```
┌─────────────────────────────────────────────┐
│           Data Layer                        │
├─────────────────────────────────────────────┤
│  Relational    │  Vector      │  File       │
│  SQLite        │  Embeddings  │  System     │
│  (Primary)     │  (FAISS/     │  (Blobs,    │
│                │   Pinecone)  │  Assets)    │
└─────────────────────────────────────────────┘
```

### Data Domains

| Domain | Storage | Description |
|--------|---------|-------------|
| Users | SQLite | User preferences, settings |
| Sessions | SQLite | Conversation history |
| Tasks | SQLite | Task definitions and state |
| Memory | SQLite + Vector | Long-term memory with embeddings |
| Logs | SQLite | Execution logs, diagnostics |
| Cache | SQLite/FS | Cached responses, artifacts |

### Implementation

```
data/
├── adapters/      # Storage adapters
├── repositories/  # Data access patterns
├── schemas/      # Database schemas
└── migrations/   # Schema migrations
```

### Key Principles

1. **Local by default**: All data stored locally
2. **SQLite primary**: Use SQLite for structured data
3. **Vector for embeddings**: Semantic search storage
4. **Migrations**: Schema versioning for upgrades
5. **Export/Import**: User data portability
6. **Optional cloud**: Future sync capability (not initial)

### Desktop Application

- **Electron**: Desktop runtime
- **Local LLM**: LM Studio or similar integration
- **File system**: Direct access for tool operations

## Consequences

### Positive

- **Privacy**: User data never leaves their machine
- **Offline operation**: Full functionality without internet
- **Low latency**: Fast local storage access
- **No cloud costs**: Eliminate storage expenses
- **User trust**: Users own their data
- **Security**: Reduced attack surface

### Negative

- **No cross-device sync**: Users can't switch devices seamlessly
- **Storage limits**: Local disk space is finite
- **Backup responsibility**: Users must manage backups
- **Migration complexity**: Moving to new machines requires transfer
- **Collaboration challenges**: Sharing data requires export/import
- **Enterprise limitations**: May not meet enterprise requirements

## Related Decisions

- [ADR-002: Layered Architecture](./ADR-002-Layered-Architecture.md) - Data layer is the foundation layer
- [ADR-005: DAG-Based Orchestration](./ADR-005-DAG-Based-Orchestration.md) - Task state stored locally for execution
