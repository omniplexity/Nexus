/**
 * Control Node Implementation
 * 
 * Implements control flow operations (branch, loop, retry, parallel) as part of the DAG execution flow.
 */

import { NodeType, Node, NodeInput, NodeOutput, NodeStatus } from '@nexus/core/contracts/node';

/**
 * Control node for control flow operations
 */
export class ControlNode implements Node {
  public id: string;
  public type: NodeType = NodeType.CONTROL;
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
  
  private controlType: 'branch' | 'loop' | 'retry' | 'parallel';
  private condition?: string;
  private maxIterations?: number;
  private branchId?: string;
  private currentIteration: number = 0;

  constructor(config: {
    id: string;
    name: string;
    controlType: 'branch' | 'loop' | 'retry' | 'parallel';
    condition?: string;
    maxIterations?: number;
    branchId?: string;
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
    this.controlType = config.controlType;
    this.condition = config.condition;
    this.maxIterations = config.maxIterations;
    this.branchId = config.branchId;
    this.config = {
      timeout: 10000,
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        backoffMs: 1000
      },
      cache: false,
      ...config.config
    };
  }

  /**
   * Execute the control node
   */
  async execute(input: NodeInput): Promise<NodeOutput> {
    const startTime = new Date();
    
    try {
      let result: unknown = null;
      const status: NodeStatus = NodeStatus.COMPLETED;
      
      switch (this.controlType) {
        case 'branch':
          result = await this.executeBranch(input);
          break;
        case 'loop':
          result = await this.executeLoop(input);
          break;
        case 'retry':
          result = await this.executeRetry(input);
          break;
        case 'parallel':
          result = await this.executeParallel(input);
          break;
        default:
          throw new Error(`Unknown control type: ${this.controlType}`);
      }
      
      return {
        nodeId: this.id,
        data: result,
        status,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: 0, // Control operations don't consume LLM tokens
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
    
    switch (this.controlType) {
      case 'branch':
        return !!this.condition && !!this.branchId;
      case 'loop':
        return !!this.condition && (this.maxIterations === undefined || this.maxIterations > 0);
      case 'retry':
        return !!this.condition;
      case 'parallel':
        return !!this.branchId;
      default:
        return false;
    }
  }

  /**
   * Get the node's dependencies
   * Control nodes typically don't have hardcoded dependencies
   */
  getDependencies(): string[] {
    return [];
  }

  /**
   * Clone the node for reuse
   */
  clone(): Node {
    return new ControlNode({
      id: this.id,
      name: this.name,
      controlType: this.controlType,
      condition: this.condition,
      maxIterations: this.maxIterations,
      branchId: this.branchId,
      config: this.config
    });
  }

  /**
   * Execute branch control flow
   */
  private async executeBranch(input: NodeInput): Promise<unknown> {
    // Evaluate condition to determine which branch to take
    const conditionResult = this.evaluateCondition(input);
    
    // In a real implementation, this would route to different nodes
    // For now, we'll return the branch decision
    return {
      controlType: 'branch',
      condition: this.condition,
      conditionResult,
      selectedBranch: conditionResult ? this.branchId : 'false_branch',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute loop control flow
   */
  private async executeLoop(input: NodeInput): Promise<unknown> {
    // Check if we've exceeded max iterations
    if (this.maxIterations !== undefined && this.currentIteration >= this.maxIterations) {
      return {
        controlType: 'loop',
        condition: this.condition,
        iteration: this.currentIteration,
        maxIterations: this.maxIterations,
        completed: true,
        timestamp: new Date().toISOString()
      };
    }
    
    // Evaluate condition to determine if we should continue looping
    const conditionResult = this.evaluateCondition(input);
    this.currentIteration++;
    
    return {
      controlType: 'loop',
      condition: this.condition,
      iteration: this.currentIteration,
      maxIterations: this.maxIterations,
      conditionResult,
      shouldContinue: conditionResult,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute retry control flow
   */
  private async executeRetry(input: NodeInput): Promise<unknown> {
    // Evaluate condition to determine if we should retry
    const conditionResult = this.evaluateCondition(input);
    
    return {
      controlType: 'retry',
      condition: this.condition,
      conditionResult,
      shouldRetry: conditionResult,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute parallel control flow
   */
  private async executeParallel(_input: NodeInput): Promise<unknown> {
    // In a real implementation, this would spawn parallel execution
    // For now, we'll return a indication of parallel execution
    return {
      controlType: 'parallel',
      branchId: this.branchId,
      timestamp: new Date().toISOString(),
      message: `Parallel execution initiated for branch: ${this.branchId}`
    };
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
      
      // For complex conditions, return true as default
      return true;
    } catch (error) {
      // If evaluation fails, default to false for safety
      return false;
    }
  }
}

/**
 * Factory function for creating control nodes
 */
export function createControlNode(config: {
  id: string;
  name: string;
  controlType: 'branch' | 'loop' | 'retry' | 'parallel';
  condition?: string;
  maxIterations?: number;
  branchId?: string;
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
}): ControlNode {
  return new ControlNode(config);
}