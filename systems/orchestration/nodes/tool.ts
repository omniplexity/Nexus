/**
 * Tool Node Implementation
 * 
 * Executes tools as part of the DAG execution flow.
 */

import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';
import type { CapabilitySet } from '@nexus/core/contracts/tool';

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
  }

  /**
   * Execute the tool node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      // In a real implementation, this would invoke the actual tool
      // For now, we'll simulate tool execution
      
      // Map input according to inputMapping
      const mappedInput = this.mapInput(input.data);
      
      // Simulate tool execution delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate tool result
      const result = {
        toolId: this.toolId,
        toolName: this.toolName,
        input: mappedInput,
        timestamp: new Date().toISOString(),
        result: `Tool ${this.toolName} executed successfully`
      };
      
      return {
        nodeId: this.id,
        data: result,
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: 0, // Tool execution doesn't typically consume LLM tokens
          cacheHit: false
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
    return !!this.id && !!this.toolId && !!this.toolName;
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
      capabilities: this.capabilities ?? undefined
    });
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
}): ToolNode {
  return new ToolNode(config);
}