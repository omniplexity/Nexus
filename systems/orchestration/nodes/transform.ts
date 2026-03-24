/**
 * Transform Node Implementation
 * 
 * Transforms data as part of the DAG execution flow.
 */

import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';

/**
 * Transform node for data transformation
 */
export class TransformNode implements Node {
  public id: string;
  public type: NodeType = NodeType.TRANSFORM;
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
  
  private transformType: 'map' | 'filter' | 'reduce' | 'custom';
  private transformFunction: string;
  private schema?: Record<string, unknown>;

  constructor(config: {
    id: string;
    name: string;
    transformType: 'map' | 'filter' | 'reduce' | 'custom';
    transformFunction: string;
    schema?: Record<string, unknown>;
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
    this.transformType = config.transformType;
    this.transformFunction = config.transformFunction;
    this.schema = config.schema;
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
   * Execute the transform node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      let result: unknown = null;
      
      switch (this.transformType) {
        case 'map':
          result = this.mapData(input.data);
          break;
        case 'filter':
          result = this.filterData(input.data);
          break;
        case 'reduce':
          result = this.reduceData(input.data);
          break;
        case 'custom':
          result = this.applyCustomTransform(input.data);
          break;
        default:
          throw new Error(`Unknown transform type: ${this.transformType}`);
      }
      
      return {
        nodeId: this.id,
        data: result,
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: 0, // Transformation doesn't consume LLM tokens
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
    return !!this.id && !!this.transformType && !!this.transformFunction;
  }

  /**
   * Get the node's dependencies
   * Transform nodes typically don't have hardcoded dependencies
   */
  getDependencies(): string[] {
    return [];
  }

  /**
   * Clone the node for reuse
   */
  clone(): Node {
    return new TransformNode({
      id: this.id,
      name: this.name,
      transformType: this.transformType,
      transformFunction: this.transformFunction,
      schema: this.schema,
      config: this.config
    });
  }

  /**
   * Map transformation - applies function to each element in an array
   */
  private mapData(data: unknown): unknown {
    if (!Array.isArray(data)) {
      // If not an array, treat as single item array
      return [this.applyTransformFunction(data)];
    }
    
    return data.map((item: unknown) => this.applyTransformFunction(item));
  }

  /**
   * Filter transformation - filters elements based on function
   */
  private filterData(data: unknown): unknown {
    if (!Array.isArray(data)) {
      // If not an array, return empty array or single item based on condition
      return this.applyTransformFunction(data) ? [data] : [];
    }
    
    return data.filter((item: unknown) => this.applyTransformFunction(item));
  }

  /**
   * Reduce transformation - reduces array to single value
   */
  private reduceData(data: unknown): unknown {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // Simple reduction - in reality would use the transform function properly
    return data.reduce((acc: unknown, item: unknown) => {
      // This is a simplified implementation
      return {...acc as Record<string, unknown>, ...(item as Record<string, unknown>)};
    }, {});
  }

  /**
   * Apply custom transform function
   */
  private applyCustomTransform(data: unknown): unknown {
    if (!this.transformFunction) {
      throw new Error('Transform function not defined');
    }
    
    // In a real implementation, this would execute the custom function
    // For now, we'll return a placeholder indicating the transform was applied
    return {
      transformType: this.transformType,
      transformFunction: this.transformFunction,
      originalData: data,
      transformedAt: new Date().toISOString(),
      result: 'Transform applied'
    };
  }

  /**
   * Apply the transform function to a single data item
   * @param data Single data item to transform
   * @returns Transformed data item
   */
  private applyTransformFunction(data: unknown): unknown {
    // In a real implementation, this would execute the actual transform function
    // For now, we'll return a simple transformation based on type
    
    if (typeof data === 'string') {
      return `${data}_transformed`;
    }
    
    if (typeof data === 'number') {
      return data * 2;
    }
    
    if (typeof data === 'boolean') {
      return !data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.applyTransformFunction(item));
    }
    
    if (data && typeof data === 'object') {
      return {
        ...data as Record<string, unknown>,
        transformed: true,
        transformedAt: new Date().toISOString()
      };
    }
    
    return data;
  }
}

/**
 * Factory function for creating transform nodes
 */
export function createTransformNode(config: {
  id: string;
  name: string;
  transformType: 'map' | 'filter' | 'reduce' | 'custom';
  transformFunction: string;
  schema?: Record<string, unknown>;
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
}): TransformNode {
  return new TransformNode(config);
}