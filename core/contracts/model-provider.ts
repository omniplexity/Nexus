/**
 * Model Provider Contracts for Nexus
 * 
 * Defines the model abstraction layer for multi-provider
 * support and model routing.
 */

/**
 * Model role enumeration
 */
export enum ModelRole {
  FAST = 'fast',           // Low latency, lower quality
  REASONING = 'reasoning', // Complex reasoning tasks
  SPECIALIZED = 'specialized' // Domain-specific tasks
}

/**
 * Model provider status
 */
export enum ProviderStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  RATE_LIMITED = 'rate_limited',
  DEGRADED = 'degraded'
}

/**
 * Prompt message role
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

/**
 * Prompt message
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * Tool call in a message
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Model configuration
 */
export interface ModelConfig {
  role: ModelRole;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
}

/**
 * Model request
 */
export interface ModelRequest {
  model: string;
  messages: Message[];
  config?: ModelConfig;
  tools?: ToolDefinition[];
  stream?: boolean;
}

/**
 * Model response
 */
export interface ModelResponse {
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

/**
 * Streaming chunk
 */
export interface StreamingChunk {
  id: string;
  delta: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Tool definition for function calling
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Model provider interface
 * @version 1.0.0
 */
export interface ModelProvider {
  /**
   * Unique provider identifier
   */
  id: string;
  
  /**
   * Human-readable provider name
   */
  name: string;
  
  /**
   * Current provider status
   */
  status: ProviderStatus;
  
  /**
   * Complete a prompt (non-streaming)
   */
  complete(request: ModelRequest): Promise<ModelResponse>;
  
  /**
   * Complete a prompt with streaming
   */
  completeWithStreaming(request: ModelRequest): AsyncIterable<StreamingChunk>;
  
  /**
   * Get available models
   */
  listModels(): Promise<ModelInfo[]>;
  
  /**
   * Check provider health
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig;
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  role: ModelRole;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  pricing?: {
    input: number;
    output: number;
  };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  defaultTimeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

/**
 * Model router interface
 */
export interface ModelRouter {
  /**
   * Select the best model for a request
   */
  selectModel(request: ModelRequest): Promise<ModelSelection>;
  
  /**
   * Add a provider to the pool
   */
  addProvider(provider: ModelProvider): void;
  
  /**
   * Remove a provider
   */
  removeProvider(providerId: string): void;
  
  /**
   * Get all providers
   */
  getProviders(): ModelProvider[];
  
  /**
   * Get router statistics
   */
  getStats(): RouterStats;
}

/**
 * Model selection result
 */
export interface ModelSelection {
  provider: ModelProvider;
  model: ModelInfo;
  reason: string;
  estimatedLatency?: number;
  estimatedCost?: number;
}

/**
 * Router statistics
 */
export interface RouterStats {
  totalRequests: number;
  byRole: Record<ModelRole, number>;
  byProvider: Record<string, number>;
  averageLatency: number;
  totalTokens: number;
  totalCost: number;
}

/**
 * Model cache interface
 */
export interface ModelCache {
  /**
   * Get cached response
   */
  get(key: string): Promise<ModelResponse | null>;
  
  /**
   * Store response in cache
   */
  set(key: string, response: ModelResponse, ttl?: number): Promise<void>;
  
  /**
   * Invalidate cache entries
   */
  invalidate(pattern: string): Promise<void>;
  
  /**
   * Clear entire cache
   */
  clear(): Promise<void>;
}

/**
 * Model metrics interface
 */
export interface ModelMetrics {
  recordRequest(request: ModelRequest): void;
  recordResponse(response: ModelResponse): void;
  recordError(error: Error): void;
  getMetrics(): ModelMetricsData;
}

/**
 * Model metrics data
 */
export interface ModelMetricsData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  averageLatency: number;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    avgLatency: number;
  }>;
}
