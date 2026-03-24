/**
 * Node Type Utilities
 * 
 * Helper functions and types for node operations.
 */

import type { Node, NodeType, NodeConfig, NodeOutput } from '@nexus/core/contracts/node';

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  success: boolean;
  output?: NodeOutput;
  error?: string;
}

/**
 * Node creator function type
 */
export type NodeCreator<T extends Node = Node> = (
  config: Record<string, unknown>
) => T;

/**
 * Node registry entry
 */
export interface NodeRegistryEntry {
  type: NodeType;
  creator: NodeCreator;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

/**
 * Node type registry
 */
export class NodeTypeRegistry {
  private registry: Map<NodeType, NodeRegistryEntry> = new Map();

  /**
   * Register a node type
   */
  register(entry: NodeRegistryEntry): void {
    this.registry.set(entry.type, entry);
  }

  /**
   * Get a node type entry
   */
  get(type: NodeType): NodeRegistryEntry | undefined {
    return this.registry.get(type);
  }

  /**
   * Check if a type is registered
   */
  has(type: NodeType): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all registered types
   */
  getTypes(): NodeType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Create a node by type
   */
  create(type: NodeType, config: Record<string, unknown>): Node | null {
    const entry = this.registry.get(type);
    if (!entry) {
      return null;
    }
    return entry.creator(config);
  }

  /**
   * Get node descriptions
   */
  getDescriptions(): Record<NodeType, string> {
    const descriptions: Record<NodeType, string> = {} as Record<NodeType, string>;
    for (const [type, entry] of this.registry) {
      descriptions[type] = entry.description;
    }
    return descriptions;
  }
}

/**
 * Default node type registry
 */
export const defaultNodeRegistry = new NodeTypeRegistry();

/**
 * Node input/output utilities
 */
export const NodeUtils = {
  /**
   * Check if node output is successful
   */
  isSuccess(output: NodeOutput): boolean {
    return output.status === 'completed';
  },

  /**
   * Check if node output failed
   */
  isFailed(output: NodeOutput): boolean {
    return output.status === 'failed';
  },

  /**
   * Check if node output was skipped
   */
  isSkipped(output: NodeOutput): boolean {
    return output.status === 'skipped';
  },

  /**
   * Get output data or throw
   */
  getDataOrThrow(output: NodeOutput): unknown {
    if (output.status === 'failed') {
      throw new Error(output.error || 'Node execution failed');
    }
    return output.data;
  },

  /**
   * Merge node outputs
   */
  mergeOutputs(outputs: NodeOutput[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const output of outputs) {
      merged[output.nodeId] = output.data;
    }
    return merged;
  },

  /**
   * Create a default node config
   */
  createDefaultConfig(overrides?: Partial<NodeConfig>): NodeConfig {
    return {
      timeout: 30000,
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        backoffMs: 1000,
      },
      cache: false,
      ...overrides,
    };
  },
};
