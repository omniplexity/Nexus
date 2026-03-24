/**
 * Base Node Implementation
 * 
 * Provides the foundation for all node types.
 */

import {
  Node,
  NodeType,
  NodeConfig,
  NodeInput,
  NodeOutput,
  NodeStatus,
} from '@nexus/core/contracts/node';
import { v4 as uuidv4 } from 'uuid';


/**
 * Abstract base node class
 */
export abstract class BaseNode implements Node {
  public readonly id: string;
  public readonly type: NodeType;
  public readonly name: string;
  public config: NodeConfig;

  constructor(
    id: string,
    type: NodeType,
    name: string,
    config: NodeConfig = {}
  ) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.config = {
      timeout: 30000,
      cache: false,
      ...config,
    };
  }

  /**
   * Execute the node
   * Must be implemented by subclasses
   */
  abstract execute(input: NodeInput): Promise<NodeOutput>;

  /**
   * Validate node configuration
   */
  validate(): boolean {
    // Base implementation - always valid unless overridden
    return true;
  }

  /**
   * Get node dependencies
   */
  getDependencies(): string[] {
    return this.config.condition ? [this.config.condition] : [];
  }

  /**
   * Clone the node
   */
  clone(): Node {
    const cloned = this.createClone();
    return cloned;
  }

  /**
   * Create a clone of this node
   * Must be implemented by subclasses
   */
  protected abstract createClone(): Node;

  /**
   * Create a successful output
   */
  protected createSuccessOutput(data: unknown, metadata?: NodeOutput['metadata']): NodeOutput {
    return {
      nodeId: this.id,
      data,
      status: NodeStatus.COMPLETED,
      metadata: {
        startTime: metadata?.startTime || new Date(),
        endTime: new Date(),
        ...metadata,
      },
    };
  }

  /**
   * Create a failed output
   */
  protected createErrorOutput(error: string, metadata?: NodeOutput['metadata']): NodeOutput {
    return {
      nodeId: this.id,
      data: null,
      status: NodeStatus.FAILED,
      error,
      metadata: {
        startTime: metadata?.startTime || new Date(),
        endTime: new Date(),
        ...metadata,
      },
    };
  }

  /**
   * Create a skipped output
   */
  protected createSkippedOutput(reason: string, metadata?: NodeOutput['metadata']): NodeOutput {
    return {
      nodeId: this.id,
      data: null,
      status: NodeStatus.SKIPPED,
      error: reason,
      metadata: {
        startTime: metadata?.startTime || new Date(),
        endTime: new Date(),
        ...metadata,
      },
    };
  }

  /**
   * Generate a unique node ID
   */
  protected static generateId(prefix: string): string {
    return `${prefix}-${uuidv4().slice(0, 8)}`;
  }
}

/**
 * Factory for creating nodes
 */
export interface NodeFactory<T extends Node = Node> {
  /**
   * Create a new node instance
   */
  create(config: Record<string, unknown>): T;

  /**
   * Get the node type
   */
  getType(): NodeType;
}
