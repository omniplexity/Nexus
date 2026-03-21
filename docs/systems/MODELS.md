# Model Abstraction System

The model abstraction system provides a unified interface for interacting with multiple LLM providers, enabling provider switching, load balancing, and intelligent routing.

## Overview

The model abstraction system provides:

- **Multi-provider support** - Unified interface for OpenAI, Anthropic, Google, etc.
- **Model routing** - Intelligent selection based on task requirements
- **Response caching** - Reduce costs and latency for repeated requests
- **Metrics collection** - Track usage, latency, and costs
- **Streaming support** - Real-time response streaming

## Contracts

The model system is defined by contracts in [`core/contracts/model-provider.ts`](../core/contracts/model-provider.ts):

### Core Interfaces

#### Model Provider Interface

```typescript
interface ModelProvider {
  id: string;
  name: string;
  status: ProviderStatus;
  
  complete(request: ModelRequest): Promise<ModelResponse>;
  completeWithStreaming(request: ModelRequest): AsyncIterable<StreamingChunk>;
  listModels(): Promise<ModelInfo[]>;
  healthCheck(): Promise<boolean>;
  getConfig(): ProviderConfig;
}
```

### Model Roles

| Role | Description | Use Case |
|------|-------------|----------|
| `FAST` | Low latency, lower quality | Simple tasks, previews |
| `REASONING` | Complex reasoning tasks | Analysis, planning |
| `SPECIALIZED` | Domain-specific tasks | Code, math, medical |

### Provider Status

```typescript
enum ProviderStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  RATE_LIMITED = 'rate_limited',
  DEGRADED = 'degraded'
}
```

### Request/Response

```typescript
interface ModelRequest {
  model: string;
  messages: Message[];
  config?: ModelConfig;
  tools?: ToolDefinition[];
  stream?: boolean;
}

interface ModelResponse {
  id: string;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
}
```

### Message Format

```typescript
interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}
```

### Model Router

```typescript
interface ModelRouter {
  selectModel(request: ModelRequest): Promise<ModelSelection>;
  addProvider(provider: ModelProvider): void;
  removeProvider(providerId: string): void;
  getProviders(): ModelProvider[];
  getStats(): RouterStats;
}

interface ModelSelection {
  provider: ModelProvider;
  model: ModelInfo;
  reason: string;
  estimatedLatency?: number;
  estimatedCost?: number;
}
```

### Model Cache

```typescript
interface ModelCache {
  get(key: string): Promise<ModelResponse | null>;
  set(key: string, response: ModelResponse, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Metrics

```typescript
interface ModelMetrics {
  recordRequest(request: ModelRequest): void;
  recordResponse(response: ModelResponse): void;
  recordError(error: Error): void;
  getMetrics(): ModelMetricsData;
}
```

## Architecture

The models system is organized in `systems/models/`:

```
systems/models/
└── (provider implementations)
```

### Provider Implementations

The system supports multiple provider implementations:

- **OpenAI** - GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic** - Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google** - Gemini Pro, Gemini Ultra
- **Local** - Ollama, LM Studio

### Routing Strategies

- **Cost-based** - Select cheapest model meeting requirements
- **Latency-based** - Select fastest model
- **Quality-based** - Select best model for task
- **Fallback** - Chain of providers for reliability

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Contracts | ✅ Complete | Phase 1 - Core contracts defined |
| Provider Interface | ✅ Complete | All provider operations defined |
| Model Router | ✅ Complete | Contract defined, implementation future |
| Model Cache | ✅ Complete | Contract defined, implementation future |
| Provider Implementations | 🔄 Future | Phase 2+ implementation |
| Metrics Collection | 🔄 Future | Phase 2+ implementation |
| Streaming Support | 🔄 Future | Phase 2+ implementation |

## Usage

### Creating a Request

```typescript
import { ModelRequest, MessageRole, ModelConfig, ModelRole } from '@nexus/core/contracts/model-provider';

const request: ModelRequest = {
  model: 'gpt-4',
  messages: [
    { role: MessageRole.SYSTEM, content: 'You are a helpful assistant.' },
    { role: MessageRole.USER, content: 'Explain quantum computing.' }
  ],
  config: {
    role: ModelRole.REASONING,
    temperature: 0.7,
    maxTokens: 1000
  },
  stream: false
};
```

### Using a Provider

```typescript
import { ModelProvider } from '@nexus/core/contracts/model-provider';

const provider: ModelProvider = createOpenAIProvider({ apiKey: '...' });

const response = await provider.complete(request);
console.log(response.content);
console.log(response.usage);
console.log(response.latency);
```

### Streaming Responses

```typescript
const stream = await provider.completeWithStreaming(request);

for await (const chunk of stream) {
  process.stdout.write(chunk.delta);
}
```

### Using the Router

```typescript
import { ModelRouter } from '@nexus/core/contracts/model-provider';

const router = createRouter();
router.addProvider(openAIProvider);
router.addProvider(anthropicProvider);

const selection = await router.selectModel({
  model: '', // Empty triggers auto-selection
  messages: [...],
  config: { role: ModelRole.REASONING }
});

console.log(selection.provider.name);  // 'OpenAI'
console.log(selection.model.id);        // 'gpt-4'
console.log(selection.reason);          // 'Best for reasoning'
```

### Caching Responses

```typescript
import { ModelCache } from '@nexus/core/contracts/model-provider';

const cache = createCache();

// Check cache
const cached = await cache.get(requestHash);
if (cached) return cached;

// Store response
await cache.set(requestHash, response, 3600); // 1 hour TTL
```

## Related Files

- [`core/contracts/model-provider.ts`](../core/contracts/model-provider.ts) - Model provider contracts
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [ADR-004: Multi-Provider Model Abstraction](../decisions/ADR-004-Multi-Provider-Model-Abstraction.md)
