/**
 * DAG (Directed Acyclic Graph) Implementation
 * 
 * Provides DAG creation, validation, and topological operations
 * for the orchestration system.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DAG,
  DAGEdge,
} from '../../../core/contracts/orchestrator';
import type {
  Node,
  NodeType,
} from '../../../core/contracts/node';

/**
 * DAG validation error
 */
export class DAGValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DAGValidationError';
  }
}

/**
 * DAG Builder for creating DAGs programmatically
 */
export class DAGBuilder {
  private nodes: Map<string, Node> = new Map();
  private edges: DAGEdge[] = [];
  private metadata: Record<string, unknown> = {};

  /**
   * Add a node to the DAG
   */
  addNode(node: Node): this {
    if (this.nodes.has(node.id)) {
      throw new DAGValidationError(`Node with id "${node.id}" already exists`);
    }
    this.nodes.set(node.id, node);
    return this;
  }

  /**
   * Add multiple nodes at once
   */
  addNodes(...nodes: Node[]): this {
    for (const node of nodes) {
      this.addNode(node);
    }
    return this;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(sourceId: string, targetId: string, condition?: string): this {
    // Validate nodes exist
    if (!this.nodes.has(sourceId)) {
      throw new DAGValidationError(`Source node "${sourceId}" does not exist`);
    }
    if (!this.nodes.has(targetId)) {
      throw new DAGValidationError(`Target node "${targetId}" does not exist`);
    }

    this.edges.push({ sourceId, targetId, condition });
    return this;
  }

  /**
   * Set DAG metadata
   */
  setMetadata(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Build and validate the DAG
   */
  build(): DAG {
    const dag: DAG = {
      id: uuidv4(),
      nodes: Object.fromEntries(this.nodes),
      edges: [...this.edges],
      metadata: { ...this.metadata },
    };

    // Validate the DAG
    this.validate(dag);

    return dag;
  }

  /**
   * Validate a DAG
   */
  private validate(dag: DAG): void {
    // Check for cycles
    const cycle = this.detectCycle(dag);
    if (cycle) {
      throw new DAGValidationError(
        `Cycle detected in DAG: ${cycle.join(' -> ')}`
      );
    }

    // Check for orphaned nodes (nodes with no connections)
    const connectedNodes = new Set<string>();
    for (const edge of dag.edges) {
      connectedNodes.add(edge.sourceId);
      connectedNodes.add(edge.targetId);
    }

    for (const nodeId of dag.nodes) {
      if (!connectedNodes.has(nodeId)) {
        console.warn(`Warning: Node "${nodeId}" is not connected to any other nodes`);
      }
    }
  }

  /**
   * Detect cycles in the DAG using DFS
   */
  private detectCycle(dag: DAG): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const adjList = this.buildAdjacencyList(dag);

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          return [...path.slice(cycleStart), neighbor];
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(dag.nodes)) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId);
        if (cycle) {
          return cycle;
        }
      }
    }

    return null;
  }

  /**
   * Build adjacency list for the DAG
   */
  private buildAdjacencyList(dag: DAG): Map<string, string[]> {
    const adjList = new Map<string, string[]>();

    // Initialize with all nodes
    for (const nodeId of Object.keys(dag.nodes)) {
      adjList.set(nodeId, []);
    }

    // Add edges
    for (const edge of dag.edges) {
      const neighbors = adjList.get(edge.sourceId) || [];
      neighbors.push(edge.targetId);
      adjList.set(edge.sourceId, neighbors);
    }

    return adjList;
  }

  /**
   * Create a new empty DAG builder
   */
  static create(): DAGBuilder {
    return new DAGBuilder();
  }
}

/**
 * DAG utilities for working with DAGs
 */
export class DAGUtils {
  /**
   * Get nodes in topological order (for sequential execution)
   */
  static topologicalSort(dag: DAG): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    for (const nodeId of Object.keys(dag.nodes)) {
      inDegree.set(nodeId, 0);
      adjList.set(nodeId, []);
    }

    // Build adjacency list and in-degree count
    for (const edge of dag.edges) {
      const neighbors = adjList.get(edge.sourceId) || [];
      neighbors.push(edge.targetId);
      adjList.set(edge.sourceId, neighbors);

      inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Add nodes with no incoming edges
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If result doesn't contain all nodes, there's a cycle
    if (result.length !== Object.keys(dag.nodes).length) {
      throw new DAGValidationError('Unable to sort: graph contains a cycle');
    }

    return result;
  }

  /**
   * Get nodes that can be executed in parallel at a given point
   */
  static getExecutableNodes(
    dag: DAG,
    completedNodes: Set<string>
  ): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    for (const nodeId of Object.keys(dag.nodes)) {
      inDegree.set(nodeId, 0);
      adjList.set(nodeId, []);
    }

    // Build adjacency list
    for (const edge of dag.edges) {
      const neighbors = adjList.get(edge.sourceId) || [];
      neighbors.push(edge.targetId);
      adjList.set(edge.sourceId, neighbors);
    }

    // Calculate in-degrees excluding completed nodes
    for (const edge of dag.edges) {
      if (!completedNodes.has(edge.targetId)) {
        inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
      }
    }

    // Return nodes with no pending dependencies
    const executable: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0 && !completedNodes.has(nodeId)) {
        executable.push(nodeId);
      }
    }

    return executable;
  }

  /**
   * Get all dependencies of a node (direct and indirect)
   */
  static getAllDependencies(dag: DAG, nodeId: string): Set<string> {
    const dependencies = new Set<string>();
    const adjList = new Map<string, string[]>();

    // Build adjacency list (reversed - from target to source)
    for (const edge of dag.edges) {
      const sources = adjList.get(edge.targetId) || [];
      sources.push(edge.sourceId);
      adjList.set(edge.targetId, sources);
    }

    // DFS to find all dependencies
    const dfs = (id: string) => {
      const sources = adjList.get(id) || [];
      for (const source of sources) {
        if (!dependencies.has(source)) {
          dependencies.add(source);
          dfs(source);
        }
      }
    };

    dfs(nodeId);
    return dependencies;
  }

  /**
   * Validate that a DAG is acyclic
   */
  static isValid(dag: DAG): { valid: boolean; error?: string } {
    try {
      const builder = new DAGBuilder();
      // This will throw if there's a cycle
      for (const nodeId of Object.keys(dag.nodes)) {
        builder.addNode(dag.nodes[nodeId]);
      }
      for (const edge of dag.edges) {
        builder.addEdge(edge.sourceId, edge.targetId, edge.condition);
      }
      builder.build();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the roots of a DAG (nodes with no incoming edges)
   */
  static getRoots(dag: DAG): string[] {
    const hasIncoming = new Set<string>();
    
    for (const edge of dag.edges) {
      hasIncoming.add(edge.targetId);
    }

    return Object.keys(dag.nodes).filter((id) => !hasIncoming.has(id));
  }

  /**
   * Get the leaves of a DAG (nodes with no outgoing edges)
   */
  static getLeaves(dag: DAG): string[] {
    const hasOutgoing = new Set<string>();
    
    for (const edge of dag.edges) {
      hasOutgoing.add(edge.sourceId);
    }

    return Object.keys(dag.nodes).filter((id) => !hasOutgoing.has(id));
  }
}
