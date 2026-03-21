/**
 * OpenAI-Compatible Model Provider
 * 
 * Implements a model provider that works with OpenAI-compatible APIs.
 * Supports OpenAI, Anthropic (via OpenAI compatibility), and local models.
 */

import { BaseModelProvider } from './provider';
import type {
  ModelRequest,
  ModelResponse,
  StreamingChunk,
  ModelInfo,
  ProviderConfig,
  ProviderStatus,
  Message,
  ToolDefinition,
} from '../../core/contracts/model-provider';
import { ProviderStatus as Status } from '../../core/contracts/model-provider';

/**
 * OpenAI API response types
 */
interface OpenAIMessage {
  role: string;
  content: string;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string | null;
  }>;
}

interface OpenAIModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/**
 * Configuration for OpenAI provider
 */
export interface OpenAIProviderConfig extends ProviderConfig {
  baseUrl: string;  // Required for OpenAI
  apiKey: string;   // Required for OpenAI
  defaultModel?: string;
  organization?: string;
  defaultTimeout?: number;
  maxRetries?: number;
}

/**
 * OpenAI-compatible model provider
 */
export class OpenAIProvider extends BaseModelProvider {
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    super('openai', 'OpenAI', config);
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
  }

  /**
   * Complete a non-streaming request
   */
  async complete(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    const model = request.model || this.defaultModel;

    try {
      const url = `${this.baseUrl}/chat/completions`;
      
      const body = this.buildRequestBody(model, request);
      
      const response = await this.fetchWithRetry<OpenAICompletionResponse>(
        url,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
        }
      );

      const latency = Date.now() - startTime;
      
      return this.mapResponse(response, latency);
    } catch (error) {
      this.status = Status.RATE_LIMITED;
      throw error;
    }
  }

  /**
   * Complete with streaming
   */
  async completeWithStreaming(request: ModelRequest): AsyncIterable<StreamingChunk> {
    const model = request.model || this.defaultModel;
    
    const url = `${this.baseUrl}/chat/completions`;
    
    const body = this.buildRequestBody(model, request);
    body.stream = true;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              
              const data = trimmed.slice(6);
              if (data === '[DONE]') return;

              try {
                const chunk = JSON.parse(data) as OpenAIStreamChunk;
                yield mapStreamChunk(chunk);
              } catch {
                // Skip invalid JSON
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
    };
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const url = `${this.baseUrl}/models`;
      
      const response = await this.fetchWithRetry<{ data: OpenAIModelInfo[] }>(
        url,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        }
      );

      return response.data.map((model) => ({
        id: model.id,
        name: model.id,
        provider: this.id,
        role: this.inferRole(model.id),
        contextWindow: 8192,  // Default, would need API call for actual
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsTools: true,
      }));
    } catch {
      // Return default models if API call fails
      return this.getDefaultModels();
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.listModels();
      this.status = Status.AVAILABLE;
      return true;
    } catch {
      this.status = Status.UNAVAILABLE;
      return false;
    }
  }

  /**
   * Build request body for OpenAI API
   */
  private buildRequestBody(model: string, request: ModelRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      messages: request.messages.map(this.mapMessage),
    };

    if (request.config) {
      if (request.config.temperature !== undefined) {
        body.temperature = request.config.temperature;
      }
      if (request.config.maxTokens !== undefined) {
        body.max_tokens = request.config.maxTokens;
      }
      if (request.config.topP !== undefined) {
        body.top_p = request.config.topP;
      }
      if (request.config.stop !== undefined) {
        body.stop = request.config.stop;
      }
      if (request.config.frequencyPenalty !== undefined) {
        body.frequency_penalty = request.config.frequencyPenalty;
      }
      if (request.config.presencePenalty !== undefined) {
        body.presence_penalty = request.config.presencePenalty;
      }
      if (request.config.seed !== undefined) {
        body.seed = request.config.seed;
      }
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    return body;
  }

  /**
   * Map internal message format to OpenAI format
   */
  private mapMessage(message: Message): OpenAIMessage {
    return {
      role: message.role,
      content: message.content,
      name: message.name,
      tool_calls: message.toolCalls?.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      tool_call_id: message.toolCallId,
    };
  }

  /**
   * Map OpenAI response to internal format
   */
  private mapResponse(response: OpenAICompletionResponse, latency: number): ModelResponse {
    const choice = response.choices[0];
    
    return {
      id: response.id,
      model: response.model,
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls?.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      finishReason: choice?.finish_reason as ModelResponse['finishReason'],
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      latency,
    };
  }

  /**
   * Infer model role from model ID
   */
  private inferRole(modelId: string): 'fast' | 'reasoning' | 'specialized' {
    const lower = modelId.toLowerCase();
    
    if (lower.includes('gpt-3.5') || lower.includes('haiku') || lower.includes('flash')) {
      return 'fast';
    }
    if (lower.includes('code') || lower.includes('math')) {
      return 'specialized';
    }
    return 'reasoning';
  }

  /**
   * Get default models if API call fails
   */
  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: this.id,
        role: 'fast',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsStreaming: true,
        supportsTools: true,
        pricing: { input: 0.00015, output: 0.0006 },
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: this.id,
        role: 'reasoning',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsStreaming: true,
        supportsTools: true,
        pricing: { input: 0.0025, output: 0.01 },
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: this.id,
        role: 'reasoning',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsTools: true,
        pricing: { input: 0.01, output: 0.03 },
      },
    ];
  }
}

/**
 * Map streaming chunk to internal format
 */
function mapStreamChunk(chunk: OpenAIStreamChunk): StreamingChunk {
  const choice = chunk.choices[0];
  
  return {
    id: chunk.id,
    delta: choice?.delta?.content || '',
    finishReason: choice?.finish_reason || undefined,
    usage: chunk.usage ? {
      promptTokens: chunk.usage.prompt_tokens,
      completionTokens: chunk.usage.completion_tokens,
      totalTokens: chunk.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Create an OpenAI provider from environment variables
 */
export function createOpenAIProvider(): OpenAIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return new OpenAIProvider({
    apiKey,
    baseUrl,
    defaultModel,
    defaultTimeout: 30000,
    maxRetries: 3,
  });
}
