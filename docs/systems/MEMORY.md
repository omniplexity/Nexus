# Memory System

The memory system provides persistent and ephemeral storage for memory entries, enabling long-term context and knowledge retention.

## Overview

The memory system provides:

- **Persistent storage** - Long-term memory retention
- **Ephemeral storage** - Session-scoped temporary storage
- **Memory indexing** - Fast retrieval via embeddings
- **Memory validation** - Quota enforcement and validation

> **Note**: The core memory interfaces are defined in [`core/contracts/memory.ts`](../core/contracts/memory.md). This document covers the storage implementation in `systems/memory/`.

## Architecture

The memory system is organized in `systems/memory/`:

```
systems/memory/
└── (storage implementations)
```

### Storage Backends

The memory system supports multiple storage backends:

| Backend | Use Case | Status |
|---------|----------|--------|
| In-Memory | Development, testing | Future |
| SQLite | Local persistence | Future |
| PostgreSQL | Production with complex queries | Future |
| Vector Store | Embedding similarity search | Future |

### Memory Entry Lifecycle

```
Created → Active → Archived → Expired → Deleted
              ↓
         (Restored)
```

### Storage Schema

```typescript
// Memory entry stored in database
interface StoredMemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding: number[] | null;
  session_id: string | null;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
  accessed_at: Date | null;
  expires_at: Date | null;
  tags: string[];
  source: string | null;
  importance: number;
  metadata: Record<string, unknown>;
}

// Index table for embeddings
interface MemoryIndexEntry {
  memory_id: string;
  embedding: number[];
  created_at: Date;
}
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Core Contracts | ✅ Complete | Defined in core/contracts/memory.ts |
| Storage Interface | 🔄 Future | Phase 3+ implementation |
| In-Memory Backend | 🔄 Future | Phase 3+ implementation |
| SQLite Backend | 🔄 Future | Phase 3+ implementation |
| Vector Index | 🔄 Future | Phase 3+ implementation |
| Migration System | 🔄 Future | Phase 3+ implementation |

## Usage

### Creating a Memory Store

```typescript
import { Memory, MemoryConfig } from '@nexus/core/contracts/memory';
import { createMemoryStore } from '@nexus/systems/memory';

const config: MemoryConfig = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7, // 7 days
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7
};

const memory: Memory = createMemoryStore(config);
```

### Storing Memories

```typescript
import { MemoryEntry, MemoryType } from '@nexus/core/contracts/memory';

const entry: MemoryEntry = {
  id: 'mem-001',
  type: MemoryType.PERSISTENT,
  content: 'User prefers concise responses',
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['preference', 'user'],
    importance: 0.9,
    source: 'conversation'
  }
};

await memory.store(entry);
```

### Retrieving with Similarity Search

```typescript
// Get embedding for query
const queryEmbedding = await getEmbedding('user preferences');

const results = await memory.retrieve({
  embedding: queryEmbedding,
  limit: 5,
  minImportance: 0.5
});

console.log(results.entries.map(e => e.content));
```

### Memory Statistics

```typescript
const stats = await memory.getStats();

console.log(stats.totalEntries);
console.log(stats.byType);
console.log(stats.totalTokens);
console.log(stats.sessionsActive);
```

### Archiving Old Memories

```typescript
// Archive memories older than 30 days
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30);

const archived = await memory.archive(cutoffDate);
console.log(`Archived ${archived} memories`);
```

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Memory    │────▶│   Context    │────▶│    LLM      │
│   Query     │     │  Compressor  │     │   Prompt    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│   Memory    │     │   Memory     │
│   Index     │     │   Store      │
│  (Vectors)  │     │  (SQLite)    │
└─────────────┘     └──────────────┘
```

## Configuration

### Memory Configuration Options

```typescript
interface MemoryConfig {
  // Token limits
  maxTokensPerSession: number;      // Default: 4000
  maxTokensPersistent: number;      // Default: 10000
  
  // Entry limits
  maxEntriesPerSession: number;     // Default: 100
  
  // TTL (Time To Live) in seconds
  defaultTTL: number;                // Default: 7 days
  
  // Embedding configuration
  embeddingModel: string;            // Default: 'text-embedding-3-small'
  similarityThreshold: number;      // Default: 0.7
}
```

## Related Files

- [`core/contracts/memory.ts`](../core/contracts/memory.ts) - Memory contracts
- [CONTEXT.md](CONTEXT.md) - Context engine (uses memory)
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [ADR-007: Local-First Data Storage](../decisions/ADR-007-Local-First-Data-Storage.md)
