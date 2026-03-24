/**
 * Aggregator Node Implementation
 * 
 * Merges multiple inputs into a single output as part of the DAG execution flow.
 */

import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';

/**
 * Aggregator node for merging multiple inputs
 */
export class AggregatorNode implements Node {
  public id: string;
  public type: NodeType = NodeType.AGGREGATOR;
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
  
  private strategy: 'concat' | 'merge' | 'override' | 'custom';
  private customFunction?: string;

  constructor(config: {
    id: string;
    name: string;
    strategy: 'concat' | 'merge' | 'override' | 'custom';
    customFunction?: string;
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
  }) {
    this.id = config.id;
    this.name = config.name;
    this.strategy = config.strategy;
    this.customFunction = config.customFunction;
    this.config = {
      timeout: 5000,
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        backoffMs: 500
      },
      cache: false,
      ...config.config
    };
  }

  /**
   * Execute the aggregator node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      const dependencies = input.dependencies || {};
      let result: unknown = null;
      
      switch (this.strategy) {
        case 'concat':
          result = this.concatenateDependencies(dependencies);
          break;
        case 'merge':
          result = this.mergeDependencies(dependencies);
          break;
        case 'override':
          result = this.overrideDependencies(dependencies);
          break;
        case 'custom':
          result = this.applyCustomFunction(dependencies);
          break;
        default:
          throw new Error(`Unknown aggregation strategy: ${this.strategy}`);
      }
      
      return {
        nodeId: this.id,
        data: result,
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: 0, // Aggregation doesn't consume LLM tokens
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
    if (!this.id) return false;
    
    if (this.strategy === 'custom' && !this.customFunction) {
      return false;
    }
    
    return true;
  }

  /**
   * Get the node's dependencies
   * Aggregator nodes depend on all their input dependencies
   */
  getDependencies(): string[] {
    // In a real implementation, this would return the actual dependency keys
    // For now, we return an empty array as dependencies are dynamic
    return [];
  }

  /**
   * Clone the node for reuse
   */
  clone(): Node {
    return new AggregatorNode({
      id: this.id,
      name: this.name,
      strategy: this.strategy,
      customFunction: this.customFunction,
      config: this.config
    });
  }

  /**
   * Concatenate all dependency values into an array
   */
  private concatenateDependencies(dependencies: Record<string, unknown>): unknown[] {
    return Object.values(dependencies);
  }

  /**
   * Merge all dependency objects into a single object
   */
  private mergeDependencies(dependencies: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(dependencies)) {
      merged[key] = value;
    }
    
    return merged;
  }

  /**
   * Override dependencies - later values override earlier ones
   * For simplicity, we'll treat this the same as merge for now
   */
  private overrideDependencies(dependencies: Record<string, unknown>): Record<string, unknown> {
    return this.mergeDependencies(dependencies);
  }

  /**
   * Apply a custom function to the dependencies
   */
  private applyCustomFunction(dependencies: Record<string, unknown>): unknown {
    if (!this.customFunction) {
      throw new Error('Custom function not defined for custom aggregation strategy');
    }
    
    // In a real implementation, this would execute the custom function
    // For now, we'll return a placeholder
    return {
      customFunction: this.customFunction,
      dependencies,
      result: 'Custom aggregation applied'
    };
  }
}

/**
 * Factory function for creating aggregator nodes
 */
export function createAggregatorNode(config: {
  id: string;
  name: string;
  strategy: 'concat' | 'merge' | 'override' | 'custom';
  customFunction?: string;
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
}): AggregatorNode {
  return new AggregatorNode(config);
}