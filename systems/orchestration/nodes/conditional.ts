/**
 * Conditional Node Implementation
 * 
 * Routes execution based on conditions as part of the DAG execution flow.
 */

import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';

/**
 * Conditional node for conditional routing
 */
export class ConditionalNode implements Node {
  public id: string;
  public type: NodeType = NodeType.CONDITIONAL;
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
  
  private condition: string;
  private trueBranchId: string;
  private falseBranchId: string;

  constructor(config: {
    id: string;
    name: string;
    condition: string;
    trueBranchId: string;
    falseBranchId: string;
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
    this.condition = config.condition;
    this.trueBranchId = config.trueBranchId;
    this.falseBranchId = config.falseBranchId;
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
   * Execute the conditional node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      // Evaluate the condition
      const conditionResult = this.evaluateCondition(input);
      
      // Determine which branch to take
      const selectedBranchId = conditionResult ? this.trueBranchId : this.falseBranchId;
      
      return {
        nodeId: this.id,
        data: {
          condition: this.condition,
          conditionResult,
          selectedBranchId,
          trueBranchId: this.trueBranchId,
          falseBranchId: this.falseBranchId,
          timestamp: new Date().toISOString()
        },
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: 0, // Conditional evaluation doesn't consume LLM tokens
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
    return !!this.id && !!this.condition && !!this.trueBranchId && !!this.falseBranchId;
  }

  /**
   * Get the node's dependencies
   * Conditional nodes typically don't have hardcoded dependencies
   */
  getDependencies(): string[] {
    return [];
  }

  /**
   * Clone the node for reuse
   */
  clone(): Node {
    return new ConditionalNode({
      id: this.id,
      name: this.name,
      condition: this.condition,
      trueBranchId: this.trueBranchId,
      falseBranchId: this.falseBranchId,
      config: this.config
    });
  }

  /**
   * Evaluate condition expression
   * @param input Node input containing data to evaluate against
   * @returns Boolean result of condition evaluation
   */
  private evaluateCondition(input: NodeInput): boolean {
    if (!this.condition) {
      return true; // No condition means always true
    }
    
    // Simple condition evaluation for demonstration
    // In a real implementation, this would use a proper expression evaluator
    try {
      // Handle simple equality checks
      if (this.condition.includes('==')) {
        const [key, value] = this.condition.split('==').map(s => s.trim());
        const inputValue = (input.data as Record<string, unknown>)?.[key];
        return inputValue == value; // Loose equality as intended
      }
      
      // Handle simple inequality checks
      if (this.condition.includes('!=')) {
        const [key, value] = this.condition.split('!=').map(s => s.trim());
        const inputValue = (input.data as Record<string, unknown>)?.[key];
        return inputValue != value; // Loose inequality as intended
      }
      
      // Handle simple greater than checks
      if (this.condition.includes('>')) {
        const [key, value] = this.condition.split('>').map(s => s.trim());
        const inputValue = Number((input.data as Record<string, unknown>)?.[key]);
        const compareValue = Number(value);
        return inputValue > compareValue;
      }
      
      // Handle simple less than checks
      if (this.condition.includes('<')) {
        const [key, value] = this.condition.split('<').map(s => s.trim());
        const inputValue = Number((input.data as Record<string, unknown>)?.[key]);
        const compareValue = Number(value);
        return inputValue < compareValue;
      }
      
      // Handle simple greater than or equal checks
      if (this.condition.includes('>=')) {
        const [key, value] = this.condition.split('>=').map(s => s.trim());
        const inputValue = Number((input.data as Record<string, unknown>)?.[key]);
        const compareValue = Number(value);
        return inputValue >= compareValue;
      }
      
      // Handle simple less than or equal checks
      if (this.condition.includes('<=')) {
        const [key, value] = this.condition.split('<=').map(s => s.trim());
        const inputValue = Number((input.data as Record<string, unknown>)?.[key]);
        const compareValue = Number(value);
        return inputValue <= compareValue;
      }
      
      // For complex conditions, return true as default
      return true;
    } catch (error) {
      // If evaluation fails, default to false for safety
      return false;
    }
  }
}

/**
 * Factory function for creating conditional nodes
 */
export function createConditionalNode(config: {
  id: string;
  name: string;
  condition: string;
  trueBranchId: string;
  falseBranchId: string;
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
}): ConditionalNode {
  return new ConditionalNode(config);
}