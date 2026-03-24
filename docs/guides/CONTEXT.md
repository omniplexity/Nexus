# Context Engine Guide

This guide provides practical guidance for using the Context Engine in Nexus. For architectural details and implementation status, see [Context Engine System](../systems/CONTEXT.md).

## Overview

The Context Engine is a system component that manages context preparation, compression, and prioritization for optimal LLM interactions. It ensures that AI models receive the most relevant context within token budget constraints.

### What is the Context Engine?

The Context Engine transforms raw memory data into optimized context slices suitable for LLM consumption. It handles:

- **Memory Retrieval** - Fetching relevant memories from the Memory Store
- **Context Routing** - Determining the appropriate processing pipeline
- **Prioritization** - Scoring and reordering entries by relevance
- **Compression** - Reducing token usage while preserving essential information

### When to Use the Context Engine

Use the Context Engine when you need to:

- Prepare context for task execution
- Optimize token usage for long conversations
- Aggregate context from multiple sessions
- Implement chat memory with automatic summarization
- Build AI assistants that maintain conversation history

## Architecture

The Context Engine consists of four main components that work together in a pipeline:

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

### Context Router

The Context Router (`systems/context/src/router/`) analyzes incoming requests and determines the appropriate processing pipeline:

- **Simple** - Basic context retrieval with minimal processing
- **Complex** - Full pipeline with summarization
- **Tool-Heavy** - Optimized for tool-heavy interactions
- **Multi-Session** - Aggregates context from multiple sessions

### Compressor

The Compressor (`systems/context/src/compressor/`) reduces token usage using one of three strategies:

| Strategy | Description | Use Case |
|---------|-------------|----------|
| `truncate` | Simple token truncation | Short-term memory, simple queries |
| `summarize` | LLM-based summarization | Long conversations, complex topics |
| `hybrid` | Combination of both | Balanced approach, variable length |

### Prioritizer

The Prioritizer (`systems/context/src/prioritizer/`) scores and reorders memory entries based on weighted factors:

- **Recency** (default: 0.3) - How recently the memory was created
- **Importance** (default: 0.25) - Explicit importance score
- **Relevance** (default: 0.25) - Query similarity
- **Frequency** (default: 0.1) - How often the memory is accessed
- **Diversity** (default: 0.1) - Variety in the context

### Cache

The Cache (`systems/context/src/cache/`) stores previously prepared context slices to avoid redundant processing:

- Response caching for repeated requests
- Token budget tracking
- Cache invalidation on memory updates

## Getting Started

### Installation

The Context Engine is part of the `@nexus/systems-context` package:

```bash
npm install @nexus/systems-context @nexus/systems-memory
```

### Basic Setup

```typescript
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';
import { createMemoryStore } from '@nexus/systems-memory';
import { createVectorIndex } from '@nexus/systems-memory';

// 1. Create the memory store
const memory = createMemoryStore({
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  defaultTTL: 86400 * 7 // 7 days
});

// 2. Create vector index for semantic search (optional)
const vectorIndex = createVectorIndex({
  similarityThreshold: 0.7,
  maxResults: 20
});

// 3. Create the Context Engine service
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
const config = {
  router: {
    complexityThreshold: 3,  // Queries with >3 distinct concepts are "complex"
    defaultCompressor: 'truncate'
  }
};
```

### Prioritizer Configuration

```typescript
const config = {
  prioritizer: {
    recency: 0.3,      // Weight for how recent the memory is
    importance: 0.25,  // Weight for explicit importance score
    relevance: 0.25,   // Weight for query similarity
    frequency: 0.1,   // Weight for access frequency
    diversity: 0.1    // Weight for context diversity
  }
};
```

### Full Configuration Example

```typescript
const contextEngine = createContextEngineService(memory, vectorIndex, {
  // Token limits
  maxTokensPerSession: 4000,
  maxTokensPersistent: 10000,
  maxEntriesPerSession: 100,
  
  // Storage
  defaultTTL: 86400 * 7, // 7 days
  similarityThreshold: 0.7,
  
  // Compression
  compressionStrategy: 'hybrid',
  simpleTokenBudget: 2000,
  complexTokenBudget: 4000,
  
  // Multi-session
  enableMultiSession: true,
  maxSessions: 5,
  
  // Router
  router: {
    complexityThreshold: 3,
    defaultCompressor: 'truncate'
  },
  
  // Prioritizer weights
  prioritizer: {
    recency: 0.3,
    importance: 0.25,
    relevance: 0.25,
    frequency: 0.1,
    diversity: 0.1
  }
});
```

## Usage Patterns

### Preparing Context for Tasks

The primary use case is preparing context for task execution:

```typescript
const contextSlice = await contextEngine.prepareContext({
  sessionId: 'session-123',
  userId: 'user-456',
  query: 'Summarize my recent project discussions',
  maxTokens: 3000,
  filters: {
    memoryTypes: ['session', 'persistent'],
    tags: ['project', 'discussion']
  }
});

// Use the context slice in your LLM call
const response = await llm.complete({
  system: contextSlice.system,
  messages: contextSlice.conversation,
  tools: contextSlice.tools
});
```

### Choosing Compression Strategies

#### Truncate Strategy

Best for simple, short-term memory scenarios:

```typescript
const config = {
  compressionStrategy: 'truncate'
};

// Use when:
// - Queries are simple
// - Recent context is most important
// - You need fast response times
```

#### Summarize Strategy

Best for long conversations where details matter:

```typescript
const config = {
  compressionStrategy: 'summarize'
};

// Use when:
// - Conversations are lengthy
// - You need to preserve key information
// - Token savings are important
```

#### Hybrid Strategy

Best for balanced, general-purpose usage:

```typescript
const config = {
  compressionStrategy: 'hybrid'
};

// Use when:
// - You have variable-length contexts
// - You want automatic optimization
// - You don't want to tune strategies manually
```

### Configuring Token Budgets

Token budgets control how much context is included:

```typescript
// Simple query - smaller budget
const simpleRequest = {
  sessionId: 'session-123',
  query: 'What time is it?',
  maxTokens: 500  // Small budget for simple queries
};

// Complex query - larger budget
const complexRequest = {
  sessionId: 'session-123',
  query: 'Analyze the pros and cons of our architectural decisions',
  maxTokens: 4000  // Larger budget for complex analysis
};
```

### Multi-Session Context Handling

Enable multi-session to aggregate context from multiple sessions:

```typescript
const config = {
  enableMultiSession: true,
  maxSessions: 5  // Aggregate up to 5 sessions
};

// Request context from multiple sessions
const multiSessionRequest = {
  sessionId: 'current-session',
  sessionIds: ['session-1', 'session-2', 'session-3'],
  userId: 'user-456',
  query: 'What have we discussed across all sessions?',
  maxTokens: 5000
};

const contextSlice = await contextEngine.prepareContext(multiSessionRequest);
```

> **Security Consideration**: Multi-session context aggregation is opt-in (`enableMultiSession: true`). Ensure you have user consent before aggregating across sessions.

## API Reference

### Core Methods

#### `prepareContext(request: ContextRequest): Promise<ContextSlice>`

Main entry point for context preparation:

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

interface ContextSlice {
  system: string;
  conversation: Message[];
  tools: Tool[];
  totalTokens: number;
}
```

#### `compressContext(snapshot: MemorySnapshot, maxTokens: number, strategy?: CompressionStrategy): Promise<ContextSlice>`

Compress an existing memory snapshot:

```typescript
const snapshot = {
  session: [...],
  persistent: [...],
  derived: [...],
  totalTokens: 5000
};

const compressed = await contextEngine.compressContext(
  snapshot,
  2000,
  'summarize'
);
```

#### `getContextSlice(sessionId: string, memoryTypes: string[], maxTokens: number): Promise<ContextSlice>`

Get a specific slice of context:

```typescript
const slice = await contextEngine.getContextSlice(
  'session-123',
  ['session', 'persistent'],
  3000
);
```

#### `getStats(): ContextEngineStats`

Get context engine statistics:

```typescript
const stats = contextEngine.getStats();

// stats.totalPreparations - Total context preparations
// stats.cacheHits - Cache hit count
// stats.averageContextSize - Average context size
// stats.queryTypes - Distribution of query types
// stats.compressionStats.averageRatio - Compression ratio
```

#### `updateConfig(config: Partial<ContextEngineConfig>): void`

Update configuration at runtime:

```typescript
contextEngine.updateConfig({
  compressionStrategy: 'hybrid',
  simpleTokenBudget: 2500
});
```

### Factory Function

#### `createContextEngineService(memory, vectorIndex?, config?)`

Create a new ContextEngineService instance:

```typescript
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';

const service = createContextEngineService(
  memory,           // Required: Memory store instance
  vectorIndex,      // Optional: Vector index for semantic search
  config            // Optional: Configuration overrides
);
```

## Best Practices

### When to Use Each Compression Strategy

| Scenario | Recommended Strategy |
|----------|---------------------|
| Simple Q&A, factual queries | `truncate` |
| Long conversations, analysis | `summarize` |
| General purpose, mixed content | `hybrid` |
| Code review, technical discussions | `hybrid` |
| Customer support, short exchanges | `truncate` |

### Token Budget Allocation Tips

1. **Start Small** - Begin with lower budgets and increase as needed
2. **Query Complexity** - Match budget to query complexity
3. **Monitor Usage** - Use `getStats()` to track token usage
4. **Reserve Space** - Leave room for system prompts and tool definitions

```typescript
// Recommended budget allocation
const config = {
  simpleTokenBudget: 2000,    // 50% for conversation
  complexTokenBudget: 4000,  // 60% for conversation
  
  // Reserve for:
  // - System prompt: ~500 tokens
  // - Tool definitions: ~1000 tokens
  // - Response buffer: ~500 tokens
};
```

### Security Considerations

1. **Multi-Session Opt-In** - Only enable multi-session with explicit user consent
2. **Filter Sensitive Data** - Use filters to exclude sensitive memories
3. **Token Budget Enforcement** - Never exceed configured limits
4. **Cache Security** - Clear cache when session ends

```typescript
// Secure multi-session configuration
const config = {
  enableMultiSession: false,  // Disabled by default
  // Only enable after user consent:
  // enableMultiSession: user.hasConsentedToMultiSession()
};
```

## Examples

### Example 1: Simple Chat Context

```typescript
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';
import { createMemoryStore } from '@nexus/systems-memory';

const memory = createMemoryStore();
const contextEngine = createContextEngineService(memory);

async function handleChat(sessionId, userMessage) {
  // Prepare context for the chat
  const context = await contextEngine.prepareContext({
    sessionId,
    maxTokens: 2000
  });

  // Combine with current message
  const messages = [
    ...context.conversation,
    { role: 'user', content: userMessage }
  ];

  // Send to LLM
  const response = await llm.chat({ messages });

  return response;
}
```

### Example 2: Semantic Search Context

```typescript
import { createContextEngineService } from '@nexus/systems-context/src/engine/service.js';
import { createMemoryStore, createVectorIndex } from '@nexus/systems-memory';

const memory = createMemoryStore();
const vectorIndex = createVectorIndex({ similarityThreshold: 0.7 });
const contextEngine = createContextEngineService(memory, vectorIndex);

async function handleSemanticQuery(sessionId, query) {
  // Get embedding for query
  const embedding = await getEmbedding(query);

  // Prepare context with semantic search
  const context = await contextEngine.prepareContext({
    sessionId,
    query,
    embedding,
    maxTokens: 3000,
    filters: {
      memoryTypes: ['session', 'persistent'],
      minImportance: 0.5
    }
  });

  return context;
}
```

### Example 3: Complex Analysis Context

```typescript
import { createContextEngineService, CompressionStrategy } from '@nexus/systems-context';

const contextEngine = createContextEngineService(memory, vectorIndex, {
  compressionStrategy: 'summarize',
  complexTokenBudget: 6000,
  prioritizer: {
    recency: 0.2,
    importance: 0.35,  // Higher weight for important info
    relevance: 0.3,
    frequency: 0.05,
    diversity: 0.1
  }
});

async function handleAnalysisRequest(sessionId, analysisQuery) {
  const context = await contextEngine.prepareContext({
    sessionId,
    query: analysisQuery,
    maxTokens: 5000,
    compressionStrategy: 'summarize',
    filters: {
      memoryTypes: ['session', 'persistent', 'derived'],
      minImportance: 0.3
    }
  });

  return context;
}
```

### Example 4: Multi-Session Aggregation

```typescript
// Only enable with proper consent
const contextEngine = createContextEngineService(memory, vectorIndex, {
  enableMultiSession: true,
  maxSessions: 3
});

async function handleMultiSessionQuery(userId, query) {
  // Get all sessions for this user
  const sessions = await getUserSessions(userId);

  const context = await contextEngine.prepareContext({
    sessionId: sessions[0],  // Current session
    sessionIds: sessions,    // All user sessions
    userId,
    query,
    maxTokens: 5000
  });

  return context;
}
```

## Troubleshooting

### Common Issues

#### Issue: Context Too Large

**Symptoms**: Token limit exceeded errors

**Solution**:
```typescript
// Reduce maxTokens
const request = {
  sessionId,
  maxTokens: 2000  // Lower value
};

// Or switch to truncate strategy
const config = {
  compressionStrategy: 'truncate'
};
```

#### Issue: Slow Context Preparation

**Symptoms**: High latency in context preparation

**Solution**:
```typescript
// Enable caching
const config = {
  // Cache is enabled by default
};

// Use truncate for faster compression
const config = {
  compressionStrategy: 'truncate'
};

// Reduce token budget
const config = {
  simpleTokenBudget: 1000,
  complexTokenBudget: 2000
};
```

#### Issue: Irrelevant Context Returned

**Symptoms**: Context doesn't match query

**Solution**:
```typescript
// Increase similarity threshold
const config = {
  similarityThreshold: 0.8  // Higher = more strict
};

// Adjust prioritizer weights
const config = {
  prioritizer: {
    relevance: 0.5,  // Higher weight for relevance
    recency: 0.2
  }
};

// Add importance filters
const request = {
  sessionId,
  filters: {
    minImportance: 0.7
  }
};
```

#### Issue: Multi-Session Not Working

**Symptoms**: Only current session context returned

**Solution**:
```typescript
// Enable multi-session in config
const config = {
  enableMultiSession: true,
  maxSessions: 5
};

// Pass sessionIds in request
const request = {
  sessionId: 'current',
  sessionIds: ['session-1', 'session-2'],
  enableMultiSession: true
};
```

### Debug Mode

Enable debug logging to trace context preparation:

```typescript
const contextEngine = createContextEngineService(memory, vectorIndex, {
  // Debug configuration would go here
});

// Check stats to identify issues
const stats = contextEngine.getStats();
console.log('Cache hit rate:', stats.cacheHits / stats.totalPreparations);
console.log('Average compression ratio:', stats.compressionStats.averageRatio);
```

## See Also

- [Context Engine System](../systems/CONTEXT.md) - Architectural details and implementation status
- [Memory System](../systems/MEMORY.md) - Memory storage and retrieval
- [Orchestration System](../systems/ORCHESTRATION.md) - DAG execution and task orchestration
- [Architecture Overview](../architecture/OVERVIEW.md) - High-level system architecture
- [Data Flow](../architecture/DATA_FLOW.md) - Data flow between systems
- [API Reference](../api/INDEX.md) - Full API documentation
