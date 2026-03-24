/**
 * Nexus Models Package
 * 
 * Model abstraction layer providing multi-provider support
 * and intelligent model routing.
 */

// Base provider
export { BaseModelProvider, createModelProvider } from './provider';

// OpenAI provider
export { OpenAIProvider, createOpenAIProvider } from './openai';
export type { OpenAIProviderConfig } from './openai';

// Router
export { SimpleModelRouter, createSingleProviderRouter } from './router';
export type { SimpleRouterConfig } from './router';

// Re-export types for convenience
export type {
  ModelProvider,
  ModelRequest,
  ModelResponse,
  StreamingChunk,
  ModelConfig,
  ModelRole,
  ProviderStatus,
  ProviderConfig,
  Message,
  MessageRole,
  ToolCall,
  ToolDefinition,
  ModelInfo,
  ModelRouter,
  ModelSelection,
  RouterStats,
  ModelCache,
  ModelMetrics,
  ModelMetricsData,
} from '@nexus/core/contracts/model-provider';
