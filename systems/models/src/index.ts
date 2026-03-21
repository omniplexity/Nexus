/**
 * Nexus Models Package
 * 
 * Model abstraction layer providing multi-provider support
 * and intelligent model routing.
 */

// Base provider
export { BaseModelProvider, createModelProvider } from './provider';

// OpenAI provider
export { OpenAIProvider, OpenAIProviderConfig, createOpenAIProvider } from './openai';

// Router
export { SimpleModelRouter, SimpleRouterConfig, createSingleProviderRouter } from './router';

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
} from '../../core/contracts/model-provider';
