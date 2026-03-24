/**
 * Reasoning Node Implementation
 * 
 * Executes LLM calls for reasoning tasks.
 * This is the primary node type for Phase 2.
 */

import { ModelProvider, ModelRequest, ModelRole, MessageRole } from '@nexus/core/contracts/model-provider';
import {
  NodeType,
  NodeInput,
  NodeOutput,
  NodeConfig,
} from '@nexus/core/contracts/node';
import { v4 as uuidv4 } from 'uuid';

import { BaseNode } from './base';

/**
 * Reasoning node configuration
 */
export interface ReasoningNodeOptions {
  model?: string;
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  modelProvider?: ModelProvider;
}

/**
 * Reasoning node for LLM calls
 */
export class ReasoningNode extends BaseNode {
  private options: ReasoningNodeOptions;

  constructor(
    id: string,
    options: ReasoningNodeOptions,
    config: NodeConfig = {}
  ) {
    super(id, NodeType.REASONING, 'Reasoning Node', config);
    this.options = {
      temperature: 0.7,
      maxTokens: 4096,
      ...options,
    };
  }

  /**
   * Execute the reasoning node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();

    try {
      // Get the provider
      const provider = this.options.modelProvider;
      if (!provider) {
        throw new Error('No model provider configured');
      }

      // Build the prompt
      const prompt = this.buildPrompt(input);

      // Build the request
      const request: ModelRequest = {
        model: this.options.model || '',
        messages: this.buildMessages(prompt),
        config: {
          role: ModelRole.REASONING,
          temperature: this.options.temperature,
          maxTokens: this.options.maxTokens,
          stop: this.options.stop,
        },
      };

      // Execute the request
      const response = await provider.complete(request);

      return this.createSuccessOutput(response.content, {
        startTime,
        endTime: new Date(),
        tokensUsed: response.usage.totalTokens,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : String(error),
        { startTime, endTime: new Date() }
      );
    }
  }

  /**
   * Validate the node configuration
   */
  validate(): boolean {
    return !!this.options.modelProvider;
  }

  /**
   * Get node dependencies
   */
  getDependencies(): string[] {
    // Reasoning nodes don't have dependencies in Phase 2
    return [];
  }

  /**
   * Build the prompt from input
   */
  private buildPrompt(input: NodeInput): string {
    // Use input data as the prompt
    if (typeof input.data === 'string') {
      return input.data;
    }
    if (typeof input.data === 'object' && input.data !== null) {
      return JSON.stringify(input.data);
    }
    return String(input.data || '');
  }

  /**
   * Build messages for the model
   */
  private buildMessages(prompt: string): Array<{ role: MessageRole; content: string }> {
    const messages: Array<{ role: MessageRole; content: string }> = [];

    // Add system prompt if provided
    if (this.options.systemPrompt) {
      messages.push({
        role: 'system' as MessageRole,
        content: this.options.systemPrompt,
      });
    }

    // Add user prompt
    messages.push({
      role: 'user' as MessageRole,
      content: prompt,
    });

    return messages;
  }

  /**
   * Create a clone of this node
   */
  protected createClone(): ReasoningNode {
    const nodeId = `${NodeType.REASONING}-${uuidv4().slice(0, 8)}`;
    return new ReasoningNode(nodeId, { ...this.options }, { ...this.config });
  }

  /**
   * Update the model provider
   */
  setModelProvider(provider: ModelProvider): void {
    this.options.modelProvider = provider;
  }

  /**
   * Get the current options
   */
  getOptions(): ReasoningNodeOptions {
    return { ...this.options };
  }
}

/**
 * Factory for creating reasoning nodes
 */
export class ReasoningNodeFactory {
  private defaultProvider?: ModelProvider;
  private defaultModel?: string;
  private defaultSystemPrompt?: string;

  constructor(options?: {
    defaultProvider?: ModelProvider;
    defaultModel?: string;
    defaultSystemPrompt?: string;
  }) {
    this.defaultProvider = options?.defaultProvider;
    this.defaultModel = options?.defaultModel;
    this.defaultSystemPrompt = options?.defaultSystemPrompt;
  }

  /**
   * Create a reasoning node
   */
  create(options: ReasoningNodeOptions): ReasoningNode {
    const nodeOptions: ReasoningNodeOptions = {
      model: options.model || this.defaultModel,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt || this.defaultSystemPrompt,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
      modelProvider: options.modelProvider ?? this.defaultProvider,
    };

    const nodeId = `${NodeType.REASONING}-${uuidv4().slice(0, 8)}`;
    return new ReasoningNode(nodeId, nodeOptions);
  }

  /**
   * Create a simple reasoning node with just a prompt
   */
  createSimple(prompt: string): ReasoningNode {
    return this.create({ prompt });
  }
}

/**
 * Create a reasoning node factory
 */
export function createReasoningNodeFactory(
  options?: Partial<{
    defaultProvider?: ModelProvider;
    defaultModel?: string;
    defaultSystemPrompt?: string;
  }>
): ReasoningNodeFactory {
  return new ReasoningNodeFactory(options);
}
