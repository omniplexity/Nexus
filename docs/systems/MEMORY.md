# Memory System

The memory system provides persistent and ephemeral storage for memory entries, enabling long-term context and knowledge retention.

## Overview

The memory system provides:

- **Persistent storage** - Long-term memory retention
- **Ephemeral storage** - Session-scoped temporary storage
- **Memory indexing** - Fast retrieval via embeddings
- **Vector Index** - Semantic search capability
- **Memory validation** - Quota enforcement and validation
- **Context Engine Integration** - Shared with orchestration for context preparation

> **Note**: The core memory interfaces are defined in [`core/contracts/memory.ts`](../core/contracts/memory.md). This document covers the storage implementation in `systems/memory/`.

## Phase 4 Integration

The memory system is now integrated with the Context Engine (Phase 4) and supports shared memory across the orchestration system:

```
systems/orchestration
        │
        ├── setMemoryService(memory) ──────────┐
        │                                         │
        └── setContextEngine(contextEngine)      │
                                                     │
                                                     ▼
                      ┌────────────────────────────────────────┐
                      │     Context Engine Service             │
                      │                                        │
                      │  1. Query Memory                       │
                      │  2. Route Request                     │
                      │  3. Prioritize                         │
                      │  4. Compress                           │
                      │  5. Return ContextSlice                │
                      └────────────────────────────────────────┘
```

## Architecture

The memory system is organized in `systems/memory/`:

```
systems/memory/
├── src/
│   ├── store.ts           # In-memory store implementation
│   ├── vector-index.ts    # Vector similarity search
│   ├── archive.ts         # Memory archival
│   ├── types.ts           # Type definitions
│   └── index.ts           # Module exports
```

### Components

#### Memory Store (`store.ts`)
- In-memory storage for memory entries
- Session-based and persistent storage
- Token budget tracking per session
- CRUD operations for memory entries
- Statistics and health monitoring

#### Vector Index (`vector-index.ts`)
- Vector-based similarity search
- Cosine similarity calculation
- Text-based keyword search
- Embedding management
- Batch operations

#### Archive (`archive.ts`)
- Automatic archival of old memories
- TTL-based cleanup
- Date-based deletion

### Storage Backends

The memory system supports multiple storage backends:

| Backend | Use Case | Status |
|---------|----------|--------|
| In-Memory | Development, testing | ✅ Complete |
| SQLite | Local persistence | Future |
| PostgreSQL | Production with complex queries | Future |
| Vector Store | Embedding similarity search | ✅ Complete |

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
| Storage Interface | ✅ Complete | Phase 1 |
| In-Memory Backend | ✅ Complete | Implemented in systems/memory/src/store.ts |
| Vector Index | ✅ Complete | Implemented in systems/memory/src/vector-index.ts |
| Archive System | ✅ Complete | Implemented in systems/memory/src/archive.ts |
| Integration with Orchestration | ✅ Complete | Phase 4 - Shared memory service |
| MemoryNode in DAG | ✅ Complete | Phase 4 - MemoryNode in systems/orchestration/nodes/memory.ts |

## Usage

### Creating a Memory Store

```typescript
import { createMemoryStore } from '@nexus/systems-memory';

const config = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7, // 7 days
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7
};

const memory = createMemoryStore(config);
```

### Creating a Vector Index

```typescript
import { createVectorIndex } from '@nexus/systems-memory';

const vectorIndex = createVectorIndex({
  similarityThreshold: 0.7,
  maxResults: 20,
  useANN: false
});
```

### Storing Memories

```typescript
import { MemoryEntry, MemoryType } from '@nexus/core/contracts/memory';

const entry: MemoryEntry = {
  id: 'mem-001',
  type: MemoryType.PERSISTENT,
  content: 'User prefers concise responses',
  embedding: [0.1, 0.2, 0.3, /* ... */],
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['preference', 'user'],
    importance: 0.9,
    source: 'conversation'
  }
};

await memory.store(entry);

// Also index in vector store if embeddings available
await vectorIndex.index(entry);
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

### Using Vector Index Directly

```typescript
// Search by embedding
const memoryIds = await vectorIndex.search(queryEmbedding, 10);

// Search by text keywords
const textResults = await vectorIndex.searchByText('authentication login', 10);
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

## Integration with Orchestration

### Setting Memory Service in Orchestrator

```typescript
import { createOrchestrator } from '@nexus/systems-orchestration';
import { createMemoryStore } from '@nexus/systems-memory';

const memory = createMemoryStore();
const orchestrator = createOrchestrator();

// Set memory service for context retrieval
orchestrator.setMemoryService(memory);
```

### Memory Node in DAG Execution

The MemoryNode supports injected memory store and vector index for shared instance usage:

```typescript
import { createMemoryNode } from '@nexus/systems-orchestration/nodes/memory';
import { createMemoryStore } from '@nexus/systems-memory';

// Create shared memory store
const memory = createMemoryStore();

// Create memory node with injected store
const retrieveNode = createMemoryNode({
  id: 'retrieve-memory',
  name: 'Retrieve Memory',
  operation: 'retrieve',
  memoryType: 'session',
  query: 'user preferences',
  limit: 10,
  memoryStore: memory  // Injected shared store
});

const storeNode = createMemoryNode({
  id: 'store-memory',
  name: 'Store Memory',
  operation: 'store',
  memoryType: 'session',
  memoryStore: memory  // Same shared instance
});

const searchNode = createMemoryNode({
  id: 'search-memory',
  name: 'Search Memory',
  operation: 'search',
  query: 'authentication',
  memoryStore: memory,
  vectorIndex: vectorIndex  // For semantic search
});

const archiveNode = createMemoryNode({
  id: 'archive-memory',
  name: 'Archive Memory',
  operation: 'archive',
  memoryStore: memory
});
```

### Memory Node Operations

| Operation | Description |
|-----------|-------------|
| `retrieve` | Fetch memories matching query |
| `store` | Store new memory entry |
| `delete` | Delete specific memory or clear session |
| `search` | Semantic search via vector index |
| `archive` | Archive memories older than date |

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Task      │────▶│  Orchestrator │────▶│ Context     │
│             │     │               │     │ Engine      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   Memory     │     │   Memory    │
                    │   Node       │     │   Store     │
                    └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Vector     │
                    │  Index      │
                    └──────────────┘
```

### Context Preparation Flow

```
Task Input
    │
    ▼
┌─────────────────────┐
│ ExecutionContext    │
│ (sessionId, userId) │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Context Engine      │
│ prepareContext()    │
└─────────────────────┘
    │
    ├── Query Memory (session + persistent + derived)
    │       │
    │       ▼
    │   ┌──────────┐
    │   │ Vector   │───▶ Semantic Search
    │   │ Index    │
    │   └──────────┘
    │
    ├── Route Request (determine pipeline)
    │
    ├── Prioritize (score by recency, importance, relevance)
    │
    ├── Compress (truncate/summarize/hybrid)
    │
    ▼
┌─────────────────────┐
│ ContextSlice        │
│ (system, conversation, tools, totalTokens) │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ LLM Execution       │
└─────────────────────┘
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

### Vector Index Configuration

```typescript
interface VectorIndexConfig {
  similarityThreshold: number;   // Default: 0.7
  maxResults: number;            // Default: 20
  useANN: boolean;               // Default: false
}
```

## Related Files

- [`core/contracts/memory.ts`](../core/contracts/memory.ts) - Memory contracts
- [CONTEXT.md](CONTEXT.md) - Context engine (uses memory)
- [`systems/context/src/engine/service.ts`](../systems/context/src/engine/service.ts) - Context engine service
- [`systems/orchestration/engine/orchestrator.ts`](../systems/orchestration/engine/orchestrator.ts) - Orchestrator with memory integration
- [`systems/orchestration/nodes/memory.ts`](../systems/orchestration/nodes/memory.ts) - Memory node in DAG
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [ORCHESTRATION.md](ORCHESTRATION.md) - Orchestration system
- [ADR-007: Local-First Data Storage](../decisions/ADR-007-Local-First-Data-Storage.md)
