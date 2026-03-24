# Memory System Guide

This guide provides practical guidance for using the Memory System in Nexus. For architectural details and implementation status, see [Memory System](../systems/MEMORY.md).

## Overview

The Memory System provides persistent and ephemeral storage for memory entries, enabling long-term context and knowledge retention. It is the foundation for building AI systems with memory capabilities.

### What is the Memory System?

The Memory System is a storage layer that manages memory entries with support for:

- **Multiple Memory Types** - Session, persistent, ephemeral, and derived memories
- **Vector Indexing** - Semantic search via embeddings
- **Archive Management** - Automatic cleanup of old memories
- **Token Budget Tracking** - Enforces memory size limits

### When to Use the Memory System

Use the Memory System when you need to:

- Store conversation history across sessions
- Implement user preferences and context
- Enable semantic search over memories
- Build AI assistants with persistent knowledge
- Manage memory lifecycle with archival

## Architecture

The Memory System consists of three main components:

```
systems/memory/
├── src/
│   ├── store.ts           # In-memory store implementation
│   ├── vector-index.ts    # Vector similarity search
│   ├── archive.ts         # Memory archival
│   ├── types.ts           # Type definitions
│   └── index.ts           # Module exports
```

### Memory Store

The Memory Store (`systems/memory/src/store.ts`) provides:

- In-memory storage for memory entries
- Session-based and persistent storage
- Token budget tracking per session
- CRUD operations for memory entries
- Statistics and health monitoring

### Vector Index

The Vector Index (`systems/memory/src/vector-index.ts`) provides:

- Vector-based similarity search
- Cosine similarity calculation
- Text-based keyword search
- Embedding management
- Batch operations

### Archive Manager

The Archive Manager (`systems/memory/src/archive.ts`) provides:

- Automatic archival of old memories
- TTL-based cleanup
- Date-based deletion
- Restoration from archive

### Memory Types

The system supports four memory types:

| Type | Description | Lifecycle |
|------|-------------|-----------|
| `EPHEMERAL` | Short-lived, temporary storage | Cleared on session end |
| `SESSION` | Session-scoped memory | Retained for session |
| `PERSISTENT` | Long-term storage | Retained indefinitely |
| `DERIVED` | Computed/generated memories | Updated periodically |

## Getting Started

### Installation

The Memory System is part of the `@nexus/systems-memory` package:

```bash
npm install @nexus/systems-memory
```

### Basic Setup

```typescript
import { createMemoryStore, createVectorIndex } from '@nexus/systems-memory';

// Create memory store
const memory = createMemoryStore({
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7, // 7 days
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7
});

// Create vector index (optional, for semantic search)
const vectorIndex = createVectorIndex({
  similarityThreshold: 0.7,
  maxResults: 20,
  useANN: false
});
```

## Configuration

### Memory Store Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxTokensPerSession` | number | 4000 | Maximum tokens for session memory |
| `maxTokensPersistent` | number | 10000 | Maximum tokens for persistent memory |
| `maxEntriesPerSession` | number | 100 | Maximum entries per session |
| `defaultTTL` | number | 86400 * 7 | Default time-to-live in seconds (7 days) |
| `embeddingModel` | string | text-embedding-3-small | Embedding model for vector search |
| `similarityThreshold` | number | 0.7 | Minimum similarity for search results |

### Vector Index Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `similarityThreshold` | number | 0.7 | Minimum similarity score for results |
| `maxResults` | number | 20 | Maximum results to return |
| `useANN` | boolean | false | Use approximate nearest neighbor (future) |

### Full Configuration Example

```typescript
const memory = createMemoryStore({
  // Token limits
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  
  // TTL (Time To Live) in seconds
  defaultTTL: 86400 * 7, // 7 days
  
  // Embedding configuration
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7
});

const vectorIndex = createVectorIndex({
  similarityThreshold: 0.7,
  maxResults: 20,
  useANN: false
});
```

## Usage Patterns

### Storing and Retrieving Memories

#### Storing a Memory

```typescript
import { MemoryEntry, MemoryType } from '@nexus/core/contracts/memory';

const entry: MemoryEntry = {
  id: 'mem-001',
  type: MemoryType.PERSISTENT,
  content: 'User prefers concise responses',
  embedding: [0.1, 0.2, 0.3, /* ... */],  // Optional embedding
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['preference', 'user'],
    importance: 0.9,
    source: 'conversation'
  }
};

// Store in memory
await memory.store(entry);

// Also index in vector store if embeddings available
if (entry.embedding) {
  await vectorIndex.index(entry);
}
```

#### Retrieving Memories

```typescript
// Simple retrieval by session
const sessionMemories = await memory.retrieve({
  sessionId: 'session-123',
  limit: 10
});

console.log(sessionMemories.entries);
```

#### Retrieving by Date Range

```typescript
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-12-31');

const memories = await memory.retrieve({
  sessionId: 'session-123',
  filters: {
    dateRange: { start: startDate, end: endDate }
  },
  limit: 20
});
```

### Using Semantic Search with Vector Index

#### Basic Semantic Search

```typescript
// Get embedding for query
const queryEmbedding = await getEmbedding('user preferences');

// Search using vector index
const memoryIds = await vectorIndex.search(queryEmbedding, 10);

// Retrieve the actual memories
const results = await memory.retrieve({
  ids: memoryIds
});
```

#### Combined Semantic Search

```typescript
// Search with similarity threshold
const results = await memory.retrieve({
  embedding: queryEmbedding,
  limit: 5,
  minImportance: 0.5,
  filters: {
    memoryTypes: ['session', 'persistent'],
    tags: ['preference']
  }
});

console.log(results.entries.map(e => ({
  id: e.id,
  content: e.content,
  similarity: e.metadata?.similarity
})));
```

#### Text-Based Keyword Search

```typescript
// Search by text keywords (without embeddings)
const textResults = await vectorIndex.searchByText('authentication login', 10);
```

### Managing Memory Lifecycle with Archive

#### Archiving Old Memories

```typescript
// Archive memories older than 30 days
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30);

const archived = await memory.archive(cutoffDate);
console.log(`Archived ${archived.count} memories`);
```

#### Restoring from Archive

```typescript
// Restore a specific memory
await memory.restore('mem-001');

// Restore all memories from a date range
await memory.restore(cutoffDate);
```

#### Automatic TTL Cleanup

```typescript
// Memories automatically expire based on TTL
const entry = {
  id: 'mem-002',
  type: MemoryType.SESSION,
  content: 'Temporary session data',
  metadata: {
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  }
};

await memory.store(entry);
```

### Memory Tagging and Filtering

#### Adding Tags

```typescript
const entry = {
  id: 'mem-003',
  type: MemoryType.PERSISTENT,
  content: 'Project deadline information',
  metadata: {
    tags: ['project', 'deadline', 'important']
  }
};

await memory.store(entry);
```

#### Filtering by Tags

```typescript
// Filter by specific tags
const projectMemories = await memory.retrieve({
  sessionId: 'session-123',
  filters: {
    tags: ['project']
  },
  limit: 10
});

// Filter by multiple tags (OR logic)
const taggedMemories = await memory.retrieve({
  sessionId: 'session-123',
  filters: {
    tags: ['important', 'urgent']
  },
  limit: 10
});
```

#### Filtering by Importance

```typescript
// Only retrieve high-importance memories
const importantMemories = await memory.retrieve({
  sessionId: 'session-123',
  filters: {
    minImportance: 0.7
  },
  limit: 5
});
```

## Memory Node Operations

The Memory System supports five primary operations through Memory Nodes in DAG execution:

### Retrieve

Fetch memories matching query parameters:

```typescript
const retrieveNode = createMemoryNode({
  id: 'retrieve-memory',
  name: 'Retrieve Memory',
  operation: 'retrieve',
  memoryType: 'session',
  query: 'user preferences',
  limit: 10,
  memoryStore: memory  // Injected shared store
});
```

### Store

Store new memory entry:

```typescript
const storeNode = createMemoryNode({
  id: 'store-memory',
  name: 'Store Memory',
  operation: 'store',
  memoryType: 'session',
  memoryStore: memory  // Same shared instance
});
```

### Delete

Delete specific memory or clear session:

```typescript
const deleteNode = createMemoryNode({
  id: 'delete-memory',
  name: 'Delete Memory',
  operation: 'delete',
  memoryType: 'session',
  memoryStore: memory
});
```

### Search

Semantic search via vector index:

```typescript
const searchNode = createMemoryNode({
  id: 'search-memory',
  name: 'Search Memory',
  operation: 'search',
  query: 'authentication',
  memoryStore: memory,
  vectorIndex: vectorIndex  // For semantic search
});
```

### Archive

Archive memories older than date:

```typescript
const archiveNode = createMemoryNode({
  id: 'archive-memory',
  name: 'Archive Memory',
  operation: 'archive',
  memoryStore: memory
});
```

## Integration

### Integration with Orchestrator

The Memory System integrates with the Orchestrator for DAG-based execution:

```typescript
import { createOrchestrator } from '@nexus/systems-orchestration';
import { createMemoryStore } from '@nexus/systems-memory';

const memory = createMemoryStore();
const orchestrator = createOrchestrator();

// Set memory service for context retrieval
orchestrator.setMemoryService(memory);
```

### Integration with Context Engine

The Memory System provides the foundation for context preparation:

```typescript
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';

const contextEngine = createContextEngineService(memory, vectorIndex, {
  compressionStrategy: 'hybrid',
  simpleTokenBudget: 2000,
  complexTokenBudget: 4000
});

// Context Engine automatically queries memory
const context = await contextEngine.prepareContext({
  sessionId: 'session-123',
  maxTokens: 3000
});
```

### Complete Integration Example

```typescript
import { createOrchestrator } from '@nexus/systems-orchestration';
import { createMemoryStore, createVectorIndex } from '@nexus/systems-memory';
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';

// 1. Create memory components
const memory = createMemoryStore();
const vectorIndex = createVectorIndex({ similarityThreshold: 0.7 });

// 2. Create context engine with memory
const contextEngine = createContextEngineService(memory, vectorIndex);

// 3. Create orchestrator with memory and context
const orchestrator = createOrchestrator();
orchestrator.setMemoryService(memory);
orchestrator.setContextEngine(contextEngine);

// 4. Now orchestrator can use memory in DAG execution
const dag = createDAG();
dag.addNode(createMemoryNode({ operation: 'retrieve', ... }));
dag.addNode(/* other nodes */);
```

## Best Practices

### When to Use Vector Search vs. Filtering

| Scenario | Recommended Approach |
|----------|---------------------|
| Exact keyword matches | Tag filtering or text search |
| Semantic similarity | Vector search with embeddings |
| Recent memories | Date range filter with recency sort |
| High-priority memories | Importance filtering |
| Combined needs | Vector search + filtering together |

```typescript
// Vector search with additional filters
const results = await memory.retrieve({
  embedding: queryEmbedding,
  limit: 10,
  filters: {
    memoryTypes: ['session', 'persistent'],
    minImportance: 0.5,
    tags: ['project']
  }
});
```

### Memory Retention Policies

1. **Session Memory** - Keep for active session, clear after
2. **Persistent Memory** - Keep indefinitely unless explicitly deleted
3. **Ephemeral Memory** - Use for temporary computations
4. **Derived Memory** - Refresh periodically based on source updates

```typescript
// Recommended retention policy
const config = {
  // Session: 7 days max
  maxTokensPerSession: 4000,
  
  // Persistent: 30 days with access refresh
  maxTokensPersistent: 10000,
  
  // Archive after 30 days of inactivity
  defaultTTL: 86400 * 30
};
```

### Performance Considerations

1. **Batch Operations** - Use batch methods for multiple entries
2. **Index Management** - Only index entries with embeddings
3. **Cache Results** - Cache frequently accessed memories
4. **Limit Results** - Always specify limits to avoid memory bloat

```typescript
// Batch store multiple entries
const entries = [
  { id: 'mem-001', content: 'Entry 1', ... },
  { id: 'mem-002', content: 'Entry 2', ... },
  { id: 'mem-003', content: 'Entry 3', ... }
];

await memory.storeBatch(entries);
await vectorIndex.indexBatch(entries.filter(e => e.embedding));
```

## API Reference

### Memory Store Methods

#### `store(entry: MemoryEntry): Promise<void>`

Store a single memory entry:

```typescript
await memory.store({
  id: 'mem-001',
  type: MemoryType.PERSISTENT,
  content: 'Memory content',
  metadata: { tags: ['tag1'] }
});
```

#### `storeBatch(entries: MemoryEntry[]): Promise<void>`

Store multiple memory entries:

```typescript
await memory.storeBatch([
  { id: 'mem-001', type: MemoryType.SESSION, content: 'Entry 1' },
  { id: 'mem-002', type: MemoryType.SESSION, content: 'Entry 2' }
]);
```

#### `retrieve(params: RetrieveParams): Promise<RetrieveResult>`

Retrieve memories by various criteria:

```typescript
interface RetrieveParams {
  sessionId?: string;
  ids?: string[];
  embedding?: number[];
  limit?: number;
  filters?: {
    tags?: string[];
    memoryTypes?: string[];
    dateRange?: { start: Date; end: Date };
    minImportance?: number;
  };
}
```

#### `delete(id: string): Promise<void>`

Delete a specific memory:

```typescript
await memory.delete('mem-001');
```

#### `deleteSession(sessionId: string): Promise<void>`

Delete all memories for a session:

```typescript
await memory.deleteSession('session-123');
```

#### `archive(cutoffDate: Date): Promise<ArchiveResult>`

Archive memories older than cutoff date:

```typescript
const result = await memory.archive(new Date('2024-01-01'));
console.log(result.count);  // Number of archived memories
```

#### `restore(id: string | Date): Promise<void>`

Restore archived memories:

```typescript
await memory.restore('mem-001');  // Single memory
await memory.restore(new Date('2024-01-01'));  // All older than date
```

#### `getStats(): MemoryStats`

Get memory statistics:

```typescript
const stats = await memory.getStats();

// stats.totalEntries - Total memory entries
// stats.byType - Entries by memory type
// stats.totalTokens - Total tokens used
// stats.sessionsActive - Active session count
```

### Vector Index Methods

#### `index(entry: MemoryEntry): Promise<void>`

Index a memory entry for semantic search:

```typescript
await vectorIndex.index({
  id: 'mem-001',
  embedding: [0.1, 0.2, 0.3, ...]
});
```

#### `search(embedding: number[], limit: number): Promise<string[]>`

Search by embedding similarity:

```typescript
const memoryIds = await vectorIndex.search(queryEmbedding, 10);
```

#### `searchByText(query: string, limit: number): Promise<string[]>`

Search by text keywords:

```typescript
const memoryIds = await vectorIndex.searchByText('authentication', 10);
```

#### `remove(id: string): Promise<void>`

Remove from index:

```typescript
await vectorIndex.remove('mem-001');
```

## Examples

### Example 1: Simple Chat Memory

```typescript
import { createMemoryStore } from '@nexus/systems-memory';
import { MemoryType } from '@nexus/core/contracts/memory';

const memory = createMemoryStore();

async function addToConversation(sessionId, message, role) {
  const entry = {
    id: `msg-${Date.now()}`,
    type: MemoryType.SESSION,
    content: message,
    sessionId,
    metadata: {
      role,  // 'user' or 'assistant'
      tags: ['conversation']
    }
  };

  await memory.store(entry);
}

async function getConversationHistory(sessionId, limit = 10) {
  const result = await memory.retrieve({
    sessionId,
    limit,
    filters: {
      tags: ['conversation']
    }
  });

  return result.entries;
}
```

### Example 2: User Preferences Memory

```typescript
import { createMemoryStore } from '@nexus/systems-memory';
import { MemoryType } from '@nexus/core/contracts/memory';

const memory = createMemoryStore();

async function saveUserPreference(userId, key, value) {
  const entry = {
    id: `pref-${userId}-${key}`,
    type: MemoryType.PERSISTENT,
    content: `${key}: ${value}`,
    userId,
    metadata: {
      preferenceKey: key,
      preferenceValue: value,
      tags: ['preference', key],
      importance: 0.9
    }
  };

  await memory.store(entry);
}

async function getUserPreferences(userId) {
  const result = await memory.retrieve({
    filters: {
      memoryTypes: ['persistent'],
      tags: ['preference']
    },
    limit: 50
  });

  // Convert to preferences object
  const preferences = {};
  for (const entry of result.entries) {
    if (entry.metadata?.preferenceKey) {
      preferences[entry.metadata.preferenceKey] = entry.metadata.preferenceValue;
    }
  }

  return preferences;
}
```

### Example 3: Semantic Knowledge Base

```typescript
import { createMemoryStore, createVectorIndex } from '@nexus/systems-memory';
import { MemoryType } from '@nexus/core/contracts/memory';

const memory = createMemoryStore();
const vectorIndex = createVectorIndex({ similarityThreshold: 0.7 });

async function addKnowledge(knowledge) {
  // Generate embedding (using your embedding model)
  const embedding = await getEmbedding(knowledge.content);

  const entry = {
    id: `kb-${Date.now()}`,
    type: MemoryType.PERSISTENT,
    content: knowledge.content,
    embedding,
    metadata: {
      title: knowledge.title,
      category: knowledge.category,
      tags: [...knowledge.tags, 'knowledge'],
      importance: knowledge.importance || 0.5
    }
  };

  await memory.store(entry);
  await vectorIndex.index(entry);
}

async function searchKnowledge(query) {
  const queryEmbedding = await getEmbedding(query);

  const result = await memory.retrieve({
    embedding: queryEmbedding,
    limit: 5,
    filters: {
      memoryTypes: ['persistent'],
      tags: ['knowledge'],
      minImportance: 0.3
    }
  });

  return result.entries;
}
```

### Example 4: Session State Memory

```typescript
import { createMemoryStore } from '@nexus/systems-memory';
import { MemoryType } from '@nexus/systems-memory';

const memory = createMemoryStore();

class SessionState {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  async set(key, value) {
    const entry = {
      id: `state-${this.sessionId}-${key}`,
      type: MemoryType.SESSION,
      content: JSON.stringify({ key, value }),
      sessionId: this.sessionId,
      metadata: {
        stateKey: key,
        tags: ['state', key]
      }
    };

    // Delete existing state for this key first
    await memory.delete(`state-${this.sessionId}-${key}`).catch(() => {});
    await memory.store(entry);
  }

  async get(key) {
    const result = await memory.retrieve({
      sessionId: this.sessionId,
      filters: {
        tags: ['state', key]
      }
    });

    if (result.entries.length > 0) {
      return JSON.parse(result.entries[0].content).value;
    }

    return undefined;
  }

  async clear() {
    await memory.deleteSession(this.sessionId);
  }
}

// Usage
const session = new SessionState('session-123');
await session.set('currentStep', 2);
await session.set('userName', 'John');
const step = await session.get('currentStep');
```

## See Also

- [Memory System](../systems/MEMORY.md) - Architectural details and implementation status
- [Context Engine Guide](CONTEXT.md) - Context preparation and compression
- [Orchestration System](../systems/ORCHESTRATION.md) - DAG execution and task orchestration
- [Architecture Overview](../architecture/OVERVIEW.md) - High-level system architecture
- [Data Flow](../architecture/DATA_FLOW.md) - Data flow between systems
- [API Reference](../api/INDEX.md) - Full API documentation
