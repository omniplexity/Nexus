/**
 * Node Executor
 * 
 * Coordinates the execution of nodes within a DAG.
 * Handles dependency resolution and sequential execution.
 */

import type {
  Node,
  NodeInput,
  NodeOutput,
  NodeStatus,
} from '../../../core/contracts/node';

/**
 * Executor configuration
 */
export interface ExecutorConfig {
  defaultTimeout?: number;
  maxRetries?: number;
}

/**
 * Execution queue item
 */
interface QueueItem {
  nodeId: string;
  input: NodeInput;
}

/**
 * Node executor for running DAG nodes
 */
export class NodeExecutor {
  private config: ExecutorConfig;
  private nodeRegistry: Map<string, Node> = new Map();

  constructor(config: ExecutorConfig = {}) {
    this.config = {
      defaultTimeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Register a node type
   */
  registerNode(node: Node): void {
    this.nodeRegistry.set(node.id, node);
  }

  /**
   * Get a registered node
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodeRegistry.get(nodeId);
  }

  /**
   * Execute a single node
   */
  async executeNode(
    nodeId: string,
    input: NodeInput,
    context?: Record<string, unknown>
  ): Promise<NodeOutput> {
    const node = this.nodeRegistry.get(nodeId);
    
    if (!node) {
      return {
        nodeId,
        data: null,
        status: NodeStatus.FAILED,
        error: `Node "${nodeId}" not found`,
        metadata: {
          startTime: new Date(),
          endTime: new Date(),
        },
      };
    }

    const startTime = new Date();
    
    try {
      // Validate node before execution
      if (!node.validate()) {
        throw new Error('Node validation failed');
      }

      // Prepare input with context
      const nodeInput: NodeInput = {
        ...input,
        nodeId,
        context: {
          ...input.context,
          ...context,
        },
      };

      // Execute with timeout
      const timeout = node.config.timeout || this.config.defaultTimeout || 30000;
      const output = await this.executeWithTimeout(node, nodeInput, timeout);

      return {
        nodeId,
        data: output.data,
        status: NodeStatus.COMPLETED,
        metadata: {
          startTime,
          endTime: new Date(),
          tokensUsed: output.metadata?.tokensUsed,
          cacheHit: output.metadata?.cacheHit,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        nodeId,
        data: null,
        status: NodeStatus.FAILED,
        error: errorMessage,
        metadata: {
          startTime,
          endTime: new Date(),
        },
      };
    }
  }

  /**
   * Execute node with timeout
   */
  private async executeWithTimeout(
    node: Node,
    input: NodeInput,
    timeout: number
  ): Promise<NodeOutput> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node execution timed out after ${timeout}ms`));
      }, timeout);

      node
        .execute(input)
        .then((output) => {
          clearTimeout(timer);
          resolve(output);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute multiple nodes in topological order
   */
  async executeSequential(
    nodeIds: string[],
    getInput: (nodeId: string, outputs: Record<string, NodeOutput>) => NodeInput
  ): Promise<Record<string, NodeOutput>> {
    const outputs: Record<string, NodeOutput> = {};

    for (const nodeId of nodeIds) {
      const input = getInput(nodeId, outputs);
      const output = await this.executeNode(nodeId, input);
      outputs[nodeId] = output;

      // Stop if node failed
      if (output.status === NodeStatus.FAILED) {
        console.error(`Node "${nodeId}" failed: ${output.error}`);
        break;
      }
    }

    return outputs;
  }

  /**
   * Get all registered nodes
   */
  getRegisteredNodes(): Node[] {
    return Array.from(this.nodeRegistry.values());
  }

  /**
   * Check if a node is registered
   */
  hasNode(nodeId: string): boolean {
    return this.nodeRegistry.has(nodeId);
  }

  /**
   * Clear all registered nodes
   */
  clear(): void {
    this.nodeRegistry.clear();
  }
}

/**
 * Create a node executor with default configuration
 */
export function createExecutor(config?: ExecutorConfig): NodeExecutor {
  return new NodeExecutor(config);
}
