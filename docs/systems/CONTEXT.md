# Context Engine System

The context engine manages context memory, compression, prioritization, and routing for optimal LLM interactions.

## Overview

The context engine provides:

- **Memory management** - Storage and retrieval of conversation and task context
- **Context compression** - Reducing token usage while preserving essential information
- **Priority-based retrieval** - Intelligent memory prioritization
- **Context routing** - Directing context to appropriate processing pipelines

## Phase 4 Implementation

The Context Engine has been fully implemented in Phase 4. The following sections document the new interfaces, implementations, and integration flows.

## Phase 7 Optimization Additions

Phase 7 tightened the existing context engine with additive optimization behavior:

- adaptive token budgets based on request shape and cache state
- snapshot reuse through normalized cache keys
- explicit optimization telemetry for cache hit rate, compression ratio, and token savings
- stable configuration hooks for cache, optimization, router, and prioritizer tuning

## Contracts

The context engine is defined by contracts in [`core/contracts/context-engine.ts`](../core/contracts/context-engine.ts):

### Core Interfaces

#### ContextEngineService Interface

```typescript
interface ContextEngineService {
  prepareContext(request: ContextRequest): Promise<ContextSlice>;
  compressContext(snapshot: MemorySnapshot, maxTokens: number, strategy?: CompressionStrategy): Promise<ContextSlice>;
  getContextSlice(sessionId: string, memoryTypes: ('session' | 'persistent' | 'derived')[], maxTokens: number): Promise<ContextSlice>;
  getStats(): ContextEngineStats;
  updateConfig(config: Partial<ContextEngineConfig>): void;
  getConfig(): ContextEngineConfig;
}
```

#### ContextRequest

```typescript
interface ContextRequest {
  sessionId: string;
  userId?: string;
  query?: string;
  embedding?: number[];
  filters?: {
    tags?: string[];
    memoryTypes?: string[];
    dateRange?: { start: Date; end: Date };
    minImportance?: number;
  };
  maxTokens?: number;
  compressionStrategy?: CompressionStrategy;
  sessionIds?: string[];
}
```

#### ContextEngineConfig

```typescript
interface ContextEngineConfig {
  maxTokensPerSession: number;
  maxTokensPersistent: number;
  maxEntriesPerSession: number;
  defaultTTL: number;
  similarityThreshold: number;
  compressionStrategy: CompressionStrategy;
  simpleTokenBudget: number;
  complexTokenBudget: number;
  enableMultiSession: boolean;
  maxSessions: number;
  router?: {
    complexityThreshold: number;
    defaultCompressor: CompressionStrategy;
  };
  prioritizer?: {
    recency: number;
    importance: number;
    relevance: number;
    frequency: number;
    diversity: number;
  };
}
```

### Default Configuration

```typescript
const DEFAULT_CONTEXT_ENGINE_CONFIG = {
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7, // 7 days
  similarityThreshold: 0.7,
  compressionStrategy: CompressionStrategy.TRUNCATE,
  simpleTokenBudget: 2000,
  complexTokenBudget: 4000,
  enableMultiSession: true,
  maxSessions: 5,
  router: {
    complexityThreshold: 3,
    defaultCompressor: CompressionStrategy.TRUNCATE
  },
  prioritizer: {
    recency: 0.3,
    importance: 0.25,
    relevance: 0.25,
    frequency: 0.1,
    diversity: 0.1
  }
};
```

## Integration Flow

The context engine integrates with orchestration through the following flow:

```
┌─────────┐    ┌────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Task   │───▶│ Context Router │───▶│ Memory Query    │───▶│ Prioritize  │
└─────────┘    └────────────────┘    └─────────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   ContextSlice │◀───│    Compress     │◀───│   Memory Snapshot │
└─────────────────┘    └─────────────────┘    └──────────────────┘
```

### Flow Steps

1. **Task Input** - Task arrives with session ID, user ID, and optional query parameters
2. **Context Router** - Determines the appropriate processing pipeline based on query complexity
3. **Memory Query** - Retrieves relevant memories from the Memory Store
4. **Prioritize** - Scores and reorders entries based on recency, importance, relevance, frequency, and diversity
5. **Compress** - Applies compression (truncate, summarize, or hybrid) to fit token budget
6. **ContextSlice** - Returns optimized context ready for LLM use

## Architecture

The context system is organized in `systems/context/`:

```
systems/context/
├── cache/           # Context caching
├── compressor/     # Context compression (truncate, summarize, hybrid)
├── prioritizer/    # Memory prioritization/scoring
├── router/         # Context routing
└── src/
    └── engine/
        └── service.ts   # DefaultContextEngineService implementation
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
- Algorithm implementations:
  - `truncate` - Simple token truncation
  - `summarize` - LLM-based summarization
  - `hybrid` - Combination of both

#### Prioritizer (`prioritizer/`)
- Relevance scoring
- Recency weighting
- Importance calculation
- Diversity balancing

#### Router (`router/`)
- Context pipeline routing
- Query classification (simple, complex, tool_heavy, multi_session)
- Destination selection
- Compression strategy selection

#### ContextEngineService (`engine/service.ts`)
- Main implementation of `ContextEngineService` interface
- Coordinates all components
- Factory function: `createContextEngineService()`

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Contracts | ✅ Complete | Phase 1 - Core contracts defined |
| ContextEngineService Interface | ✅ Complete | Phase 4 - New interface in core/contracts/context-engine.ts |
| DefaultContextEngineService | ✅ Complete | Phase 4 - Implementation in systems/context/src/engine/service.ts |
| Memory Interface | ✅ Complete | Contracts define all operations |
| Memory Types | ✅ Complete | EPHEMERAL, SESSION, PERSISTENT, DERIVED |
| Context Compressor | ✅ Complete | Multiple implementations (truncate, summarize, hybrid) |
| Memory Index | ✅ Complete | Contract defined in core/contracts/memory.ts |
| Cache Implementation | ✅ Complete | Response cache implemented |
| Compressor Implementation | ✅ Complete | All three strategies implemented |
| Prioritizer Implementation | ✅ Complete | Scorer with weighted factors |
| Router Implementation | ✅ Complete | Context router with complexity detection |

## API Reference

### ContextEngineService Methods

#### `prepareContext(request: ContextRequest): Promise<ContextSlice>`

Main entry point that orchestrates the full context preparation flow:

1. Queries memory based on request
2. Routes the request to determine processing pipeline
3. Scores and prioritizes entries if needed
4. Compresses to fit token budget
5. Returns a ContextSlice ready for LLM use

**Parameters:**
- `request` - ContextRequest with query parameters

**Returns:** Promise resolving to a ContextSlice

#### `compressContext(snapshot: MemorySnapshot, maxTokens: number, strategy?: CompressionStrategy): Promise<ContextSlice>`

Compress an existing memory snapshot with optional strategy override.

**Parameters:**
- `snapshot` - Memory snapshot to compress
- `maxTokens` - Maximum tokens in output
- `strategy` - Optional compression strategy override

**Returns:** Promise resolving to compressed ContextSlice

#### `getContextSlice(sessionId: string, memoryTypes: ('session' | 'persistent' | 'derived')[], maxTokens: number): Promise<ContextSlice>`

Get a specific slice of context including only specified memory types.

**Parameters:**
- `sessionId` - Session ID
- `memoryTypes` - Types of memory to include
- `maxTokens` - Maximum tokens

**Returns:** Promise resolving to ContextSlice

#### `getStats(): ContextEngineStats`

Get context engine statistics including:
- Total preparations
- Cache hits
- Average context size
- Query type distribution
- Compression ratio statistics

**Returns:** ContextEngineStats object

#### `updateConfig(config: Partial<ContextEngineConfig>): void`

Update configuration at runtime.

**Parameters:**
- `config` - Partial configuration to update

#### `getConfig(): ContextEngineConfig`

Get current configuration.

**Returns:** Current ContextEngineConfig

### Factory Function

```typescript
function createContextEngineService(
  memory: Memory,
  vectorIndex?: MemoryIndex,
  config?: Partial<ContextEngineConfig>
): ContextEngineService
```

Creates a new ContextEngineService instance.

**Parameters:**
- `memory` - Memory store instance
- `vectorIndex` - Optional vector index for semantic search
- `config` - Optional configuration overrides

**Returns:** ContextEngineService instance

## Configuration

### ContextEngineConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxTokensPerSession` | number | 4000 | Maximum tokens for session memory |
| `maxTokensPersistent` | number | 10000 | Maximum tokens for persistent memory |
| `maxEntriesPerSession` | number | 100 | Maximum entries per session |
| `defaultTTL` | number | 86400 * 7 | Default time-to-live in seconds (7 days) |
| `similarityThreshold` | number | 0.7 | Similarity threshold for vector search |
| `compressionStrategy` | CompressionStrategy | TRUNCATE | Default compression strategy |
| `simpleTokenBudget` | number | 2000 | Token budget for simple queries |
| `complexTokenBudget` | number | 4000 | Token budget for complex queries |
| `enableMultiSession` | boolean | true | Enable multi-session context aggregation |
| `maxSessions` | number | 5 | Maximum sessions to aggregate |
| `router` | object | see below | Router configuration |
| `prioritizer` | object | see below | Prioritizer weights |

### Router Configuration

```typescript
router: {
  complexityThreshold: number;    // Default: 3
  defaultCompressor: CompressionStrategy; // Default: TRUNCATE
}
```

### Prioritizer Configuration

```typescript
prioritizer: {
  recency: number;        // Default: 0.3
  importance: number;    // Default: 0.25
  relevance: number;     // Default: 0.25
  frequency: number;    // Default: 0.1
  diversity: number;     // Default: 0.1
}
```

## Usage

### Creating a Context Engine Service

```typescript
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';
import { createMemoryStore } from '@nexus/systems-memory';
import { createVectorIndex } from '@nexus/systems-memory';

const memory = createMemoryStore({ /* config */ });
const vectorIndex = createVectorIndex({ similarityThreshold: 0.7 });

const contextEngine = createContextEngineService(memory, vectorIndex, {
  compressionStrategy: 'hybrid',
  simpleTokenBudget: 2000,
  complexTokenBudget: 4000
});
```

### Preparing Context for a Task

```typescript
const request = {
  sessionId: 'session-123',
  userId: 'user-456',
  query: 'What did I ask about earlier?',
  maxTokens: 3000,
  filters: {
    memoryTypes: ['session', 'persistent'],
    minImportance: 0.5
  }
};

const contextSlice = await contextEngine.prepareContext(request);

console.log(contextSlice.system);      // System prompt
console.log(contextSlice.conversation); // Compressed conversation
console.log(contextSlice.tools);       // Available tools
console.log(contextSlice.totalTokens); // Total tokens used
```

### Compressing Existing Snapshot

```typescript
import { MemorySnapshot, CompressionStrategy } from '@nexus/core/contracts/memory';

const snapshot: MemorySnapshot = {
  session: [...],
  persistent: [...],
  derived: [...],
  totalTokens: 5000
};

const compressed = await contextEngine.compressContext(snapshot, 2000, CompressionStrategy.SUMMARIZE);
```

### Getting Context Statistics

```typescript
const stats = await contextEngine.getStats();

console.log(stats.totalPreparations);
console.log(stats.cacheHits);
console.log(stats.averageContextSize);
console.log(stats.queryTypes);
console.log(stats.compressionStats.averageRatio);
```

## Related Files

- [`core/contracts/context-engine.ts`](../core/contracts/context-engine.ts) - Context engine contracts
- [`core/contracts/memory.ts`](../core/contracts/memory.ts) - Memory contracts
- [`systems/context/src/engine/service.ts`](../systems/context/src/engine/service.ts) - Service implementation
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [ORCHESTRATION.md](ORCHESTRATION.md) - Orchestrator integration
- [MEMORY.md](MEMORY.md) - Memory system
- [ADR-006: Event-Driven Communication](../decisions/ADR-006-Event-Driven-Communication.md)
