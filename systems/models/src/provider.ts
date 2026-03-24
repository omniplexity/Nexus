/**
 * Model Provider Base Implementation
 * 
 * Provides the foundation for model provider implementations.
 * All providers should extend this class.
 */

import {
  ModelProvider,
  ModelRequest,
  ModelResponse,
  StreamingChunk,
  ModelInfo,
  ProviderConfig,
  ProviderStatus,
} from '@nexus/core/contracts/model-provider';

/**
 * Base model provider with common functionality
 */
export abstract class BaseModelProvider implements ModelProvider {
  public readonly id: string;
  public readonly name: string;
  public status: ProviderStatus = ProviderStatus.AVAILABLE;
  protected config: ProviderConfig;
  protected baseUrl: string;
  protected apiKey: string;
  protected defaultTimeout: number;
  protected maxRetries: number;

  constructor(id: string, name: string, config: ProviderConfig) {
    this.id = id;
    this.name = name;
    this.config = config;
    this.baseUrl = config.baseUrl || '';
    this.apiKey = config.apiKey || '';
    this.defaultTimeout = config.defaultTimeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Complete a prompt (non-streaming)
   * Must be implemented by subclasses
   */
  abstract complete(request: ModelRequest): Promise<ModelResponse>;

  /**
   * Complete a prompt with streaming
   * Must be implemented by subclasses
   */
  abstract completeWithStreaming(request: ModelRequest): AsyncIterable<StreamingChunk>;

  /**
   * Get available models
   * Default implementation returns empty array - override in subclasses
   */
  async listModels(): Promise<ModelInfo[]> {
    return [];
  }

  /**
   * Check provider health
   * Default implementation returns true - override in subclasses
   */
  async healthCheck(): Promise<boolean> {
    return this.status === ProviderStatus.AVAILABLE;
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider status
   */
  setStatus(status: ProviderStatus): void {
    this.status = status;
  }

  /**
   * Make an HTTP request with retry logic
   */
  protected async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.defaultTimeout}ms`);
        }
        
        // Wait before retry with exponential backoff
        if (attempt < retries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build headers for API requests
   */
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }

    if (additionalHeaders) {
      return { ...headers, ...additionalHeaders };
    }

    return headers;
  }

  /**
   * Create a unique request hash for caching
   */
  protected createRequestHash(request: ModelRequest): string {
    const content = JSON.stringify({
      model: request.model,
      messages: request.messages,
      config: request.config,
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Create a model provider from config
 */
export function createModelProvider(config: ProviderConfig): ModelProvider {
  // Factory pattern - can be extended to support multiple provider types
  const providerType = config.baseUrl?.includes('openai') ? 'openai' : 'generic';
  
  // For now, return a placeholder - actual implementation in openai.ts
  throw new Error(`Provider type "${providerType}" requires specific implementation`);
}
