/**
 * Tool Node Implementation
 * 
 * Executes tools as part of the DAG execution flow.
 */

import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';
import type { CapabilitySet, ToolContext, ToolInvoker } from '@nexus/core/contracts/tool';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCapabilitySet(value: unknown): value is CapabilitySet {
  return isRecord(value) &&
    typeof value.canAccessFilesystem === 'boolean' &&
    typeof value.canExecuteCode === 'boolean' &&
    typeof value.canAccessNetwork === 'boolean' &&
    typeof value.canUseVectorSearch === 'boolean' &&
    isRecord(value.customCapabilities);
}

function createDefaultCapabilities(): CapabilitySet {
  return {
    canAccessFilesystem: false,
    canExecuteCode: false,
    canAccessNetwork: false,
    canUseVectorSearch: false,
    customCapabilities: {}
  };
}

/**
 * Tool node for executing registered tools
 */
export class ToolNode implements Node {
  public id: string;
  public type: NodeType = NodeType.TOOL;
  public name: string;
  public config: {
    timeout?: number;
    retry?: {
      maxAttempts: number;
      backoff: 'linear' | 'exponential' | 'fixed';
      backoffMs: number;
      retryableErrors?: string[];
    };
    cache?: boolean;
    condition?: string;
    priority?: number;
  };
  
  private toolId: string;
  private toolName: string;
  private inputMapping?: Record<string, string>;
  private capabilities: CapabilitySet | null = null;
  private invoker: ToolInvoker | null = null;

  constructor(config: {
    id: string;
    name: string;
    toolId: string;
    toolName: string;
    inputMapping?: Record<string, string>;
    config?: {
      timeout?: number;
      retry?: {
        maxAttempts: number;
        backoff: 'linear' | 'exponential' | 'fixed';
        backoffMs: number;
        retryableErrors?: string[];
      };
      cache?: boolean;
      condition?: string;
      priority?: number;
    };
    capabilities?: CapabilitySet;
    invoker?: ToolInvoker;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.toolId = config.toolId;
    this.toolName = config.toolName;
    this.inputMapping = config.inputMapping;
    this.config = {
      timeout: 30000,
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        backoffMs: 1000
      },
      cache: false,
      ...config.config
    };
    this.capabilities = config.capabilities ?? null;
    this.invoker = config.invoker ?? null;
  }

  /**
   * Execute the tool node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      if (!this.invoker) {
        throw new Error(`Tool invoker is not configured for tool node "${this.id}"`);
      }
      
      // Map input according to inputMapping
      const mappedInput = this.mapInput(input.data);
      const toolContext = this.createToolContext(input);
      const result = await this.invoker.invoke({
        toolId: this.toolId,
        toolName: this.toolName,
        input: mappedInput,
        context: toolContext
      });

      if (!result.success) {
        return {
          nodeId: this.id,
          data: null,
          status: NodeStatus.FAILED,
          error: result.error?.message ?? `Tool ${this.toolName} failed`,
          metadata: {
            startTime,
            endTime: new Date(),
            tokensUsed: result.metadata.tokensUsed,
            cacheHit: result.metadata.cacheHit
          }
        };
      }
      
      return {
        nodeId: this.id,
        data: {
          toolId: result.metadata.toolId,
          toolName: result.metadata.toolName ?? this.toolName,
          output: result.output
        },
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: result.metadata.tokensUsed,
          cacheHit: result.metadata.cacheHit
        }
      };
    } catch (error) {
      return {
        nodeId: this.id,
        data: null,
        status: NodeStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          startTime,
          endTime: new Date()
        }
      };
    }
  }

  /**
   * Validate node configuration
   */
  validate(): boolean {
    return !!this.id && !!this.toolId && !!this.toolName && this.invoker !== null;
  }

  /**
   * Get the node's dependencies
   * Tool nodes typically don't have hardcoded dependencies
   */
  getDependencies(): string[] {
    return [];
  }

  /**
   * Clone the node for reuse
   */
  clone(): Node {
    return new ToolNode({
      id: this.id,
      name: this.name,
      toolId: this.toolId,
      toolName: this.toolName,
      inputMapping: this.inputMapping,
      config: this.config,
      capabilities: this.capabilities ?? undefined,
      invoker: this.invoker ?? undefined
    });
  }

  /**
   * Inject the runtime tool invoker.
   */
  setInvoker(invoker: ToolInvoker): void {
    this.invoker = invoker;
  }

  /**
   * Check if the node has an invoker configured.
   */
  hasInvoker(): boolean {
    return this.invoker !== null;
  }

  /**
   * Map input data according to inputMapping
   */
  private mapInput(input: unknown): unknown {
    if (!this.inputMapping || typeof input !== 'object' || input === null) {
      return input;
    }
    
    const mapped: Record<string, unknown> = {};
    
    for (const [targetKey, sourceKey] of Object.entries(this.inputMapping)) {
      if (sourceKey in (input as Record<string, unknown>)) {
        mapped[targetKey] = (input as Record<string, unknown>)[sourceKey];
      }
    }
    
    // Include any unmapped properties
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!Object.values(this.inputMapping).includes(key)) {
        mapped[key] = value;
      }
    }
    
    return mapped;
  }

  private createToolContext(input: NodeInput): ToolContext {
    const rawContext = input.context;
    const variables = isRecord(rawContext?.variables) ? rawContext.variables : {};

    return {
      sessionId: typeof rawContext?.sessionId === 'string' ? rawContext.sessionId : 'default',
      userId: typeof rawContext?.userId === 'string' ? rawContext.userId : undefined,
      capabilities: isCapabilitySet(rawContext?.capabilities)
        ? rawContext.capabilities
        : this.capabilities ?? createDefaultCapabilities(),
      variables
    };
  }
}

/**
 * Factory function for creating tool nodes
 */
export function createToolNode(config: {
  id: string;
  name: string;
  toolId: string;
  toolName: string;
  inputMapping?: Record<string, string>;
  config?: {
    timeout?: number;
    retry?: {
      maxAttempts: number;
      backoff: 'linear' | 'exponential' | 'fixed';
      backoffMs: number;
      retryableErrors?: string[];
    };
    cache?: boolean;
    condition?: string;
    priority?: number;
  };
  capabilities?: CapabilitySet;
  invoker?: ToolInvoker;
}): ToolNode {
  return new ToolNode(config);
}
