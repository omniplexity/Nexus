# Context Engine System

The context engine manages context memory, compression, prioritization, and routing for optimal LLM interactions.

## Overview

The context engine provides:

- **Memory management** - Storage and retrieval of conversation and task context
- **Context compression** - Reducing token usage while preserving essential information
- **Priority-based retrieval** - Intelligent memory prioritization
- **Context routing** - Directing context to appropriate processing pipelines

## Contracts

The context engine is defined by contracts in [`core/contracts/memory.ts`](../core/contracts/memory.ts):

### Core Interfaces

#### Memory Interface

```typescript
interface Memory {
  retrieve(query: MemoryQuery): Promise<MemoryResult>;
  store(entry: MemoryEntry): Promise<void>;
  update(id: string, updates: Partial<MemoryEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(sessionId: string): Promise<void>;
  getSnapshot(sessionId: string, maxTokens: number): Promise<MemorySnapshot>;
  archive(olderThan: Date): Promise<number>;
  getStats(): Promise<MemoryStats>;
}
```

### Memory Types

| Type | Description | Lifecycle |
|------|-------------|-----------|
| `EPHEMERAL` | Current task only | Task duration |
| `SESSION` | Conversation session | Session duration |
| `PERSISTENT` | Long-term storage | Indefinite |
| `DERIVED` | Generated summaries | Indefinite |

### Memory Query

```typescript
interface MemoryQuery {
  text?: string;
  embedding?: number[];
  type?: MemoryType | MemoryType[];
  sessionId?: string;
  userId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  minImportance?: number;
}
```

### Memory Snapshot

```typescript
interface MemorySnapshot {
  session: MemoryEntry[];
  persistent: MemoryEntry[];
  derived: MemoryEntry[];
  totalTokens: number;
}
```

### Context Compression

```typescript
interface ContextCompressor {
  compress(memory: MemorySnapshot, maxTokens: number): Promise<ContextSlice>;
  expand(slice: ContextSlice): Promise<MemorySnapshot>;
}

interface ContextSlice {
  system: string;
  conversation: string;
  tools: string;
  totalTokens: number;
  memoryIds: string[];
}
```

### Memory Index

```typescript
interface MemoryIndex {
  index(entry: MemoryEntry): Promise<void>;
  remove(id: string): Promise<void>;
  search(embedding: number[], limit: number): Promise<string[]>;
  searchByText(text: string, limit: number): Promise<string[]>;
}
```

## Architecture

The context system is organized in `systems/context/`:

```
systems/context/
├── cache/           # Context caching
├── compressor/     # Context compression
├── prioritizer/     # Memory prioritization
└── router/         # Context routing
```

### Components

#### Cache (`cache/`)
- Response caching for repeated context requests
- Token budget tracking
- Cache invalidation strategies

#### Compressor (`compressor/`)
- Token budget optimization
- Context summarization
- Importance-based pruning
- Algorithm implementations (truncate, summarize, hybrid)

#### Prioritizer (`prioritizer/`)
- Relevance scoring
- Recency weighting
- Importance calculation
- Diversity balancing

#### Router (`router/`)
- Context pipeline routing
- Query classification
- Destination selection
- Load balancing

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Contracts | ✅ Complete | Phase 1 - Core contracts defined |
| Memory Interface | ✅ Complete | Contracts define all operations |
| Memory Types | ✅ Complete | EPHEMERAL, SESSION, PERSISTENT, DERIVED |
| Context Compressor | ✅ Complete | Contract defined, implementation future |
| Memory Index | ✅ Complete | Contract defined, implementation future |
| Cache Implementation | 🔄 Future | Phase 3+ implementation |
| Compressor Implementation | 🔄 Future | Phase 3+ implementation |
| Prioritizer Implementation | 🔄 Future | Phase 3+ implementation |
| Router Implementation | 🔄 Future | Phase 3+ implementation |

## Usage

### Creating Memory Entries

```typescript
import { MemoryEntry, MemoryType, MemoryMetadata } from '@nexus/core/contracts/memory';

const entry: MemoryEntry = {
  id: 'mem-001',
  type: MemoryType.SESSION,
  content: 'User asked about authentication',
  embedding: [0.1, 0.2, /* ... */],
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['authentication', 'question'],
    importance: 0.8,
    source: 'user-message'
  },
  sessionId: 'session-123'
};
```

### Querying Memory

```typescript
import { Memory, MemoryQuery, MemoryType } from '@nexus/core/contracts/memory';

const query: MemoryQuery = {
  text: 'authentication',
  type: [MemoryType.SESSION, MemoryType.PERSISTENT],
  sessionId: 'session-123',
  limit: 10,
  minImportance: 0.5
};

const results = await memory.retrieve(query);
console.log(results.entries);
console.log(results.total);
console.log(results.tokens);
```

### Getting Context Snapshot

```typescript
const snapshot = await memory.getSnapshot('session-123', 4000);
console.log(snapshot.session);      // Session memories
console.log(snapshot.persistent);   // Persistent memories
console.log(snapshot.derived);      // Generated summaries
console.log(snapshot.totalTokens);  // Total tokens used
```

### Compressing Context

```typescript
import { ContextCompressor } from '@nexus/core/contracts/memory';

const compressor: ContextCompressor = createCompressor('summarize');

const slice = await compressor.compress(snapshot, 2000);
console.log(slice.system);      // System prompt
console.log(slice.conversation); // Summarized conversation
console.log(slice.tools);       // Available tools
console.log(slice.totalTokens); // Compressed token count
```

## Related Files

- [`core/contracts/memory.ts`](../core/contracts/memory.ts) - Memory contracts
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [ADR-006: Event-Driven Communication](../decisions/ADR-006-Event-Driven-Communication.md)
