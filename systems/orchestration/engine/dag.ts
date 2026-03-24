/**
 * DAG (Directed Acyclic Graph) Implementation
 * 
 * Provides DAG creation, validation, and topological operations
 * for the orchestration system.
 */


import type {
  Node,
} from '@nexus/core/contracts/node';
import type {
  DAG,
  DAGEdge,
} from '@nexus/core/contracts/orchestrator';
import { v4 as uuidv4 } from 'uuid';

import type {
  EnhancedDAG,
  EnhancedDAGMetadata,
  ParallelExecutionGroup,
  Subgraph,
  ExecutionLayer
} from './types';

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
  private parallelGroups: ParallelExecutionGroup[] = [];
  private subgraphs: Subgraph[] = [];

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
   * Add a parallel execution group
   */
  addParallelGroup(group: ParallelExecutionGroup): this {
    this.parallelGroups.push(group);
    return this;
  }

  /**
   * Add multiple parallel execution groups
   */
  addParallelGroups(...groups: ParallelExecutionGroup[]): this {
    for (const group of groups) {
      this.addParallelGroup(group);
    }
    return this;
  }

  /**
   * Add a subgraph
   */
  addSubgraph(subgraph: Subgraph): this {
    this.subgraphs.push(subgraph);
    return this;
  }

  /**
   * Add multiple subgraphs
   */
  addSubgraphs(...subgraphs: Subgraph[]): this {
    for (const subgraph of subgraphs) {
      this.addSubgraph(subgraph);
    }
    return this;
  }

  /**
   * Build and validate the DAG
   */
  build(): EnhancedDAG {
    const dag: EnhancedDAG = {
      id: uuidv4(),
      nodes: Object.fromEntries(this.nodes),
      edges: [...this.edges],
      metadata: {
        original: { ...this.metadata },
        parallelGroups: [...this.parallelGroups],
        subgraphs: [...this.subgraphs],
        executionHints: {
          strategy: 'adaptive',
          priority: 0,
        },
        profiling: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          version: '1.0.0',
        },
      } as EnhancedDAGMetadata,
    };

    // Validate the DAG
    this.validate(dag);

    return dag;
  }

  /**
   * Validate a DAG
   */
  private validate(dag: EnhancedDAG): void {
    // Check for cycles
    const cycle = this.detectCycle(dag);
    if (cycle) {
      throw new DAGValidationError(
        `Cycle detected in DAG: ${cycle.join(' -> ')}`
      );
    }

    // Validate parallel execution groups
    this.validateParallelGroups(dag);

    // Validate subgraphs
    this.validateSubgraphs(dag);

    // Check for orphaned nodes (nodes with no connections)
    const connectedNodes = new Set<string>();
    for (const edge of dag.edges) {
      connectedNodes.add(edge.sourceId);
      connectedNodes.add(edge.targetId);
    }

    for (const nodeId of Object.keys(dag.nodes)) {
      if (!connectedNodes.has(nodeId)) {
        console.warn(`Warning: Node "${nodeId}" is not connected to any other nodes`);
      }
    }
  }

  /**
   * Validate parallel execution groups
   */
  private validateParallelGroups(dag: EnhancedDAG): void {
    const metadata = dag.metadata;
    if (!metadata || !metadata.parallelGroups) {
      return;
    }

    for (const group of metadata.parallelGroups) {
      // Check that all node IDs in the group exist in the DAG
      for (const nodeId of group.nodeIds) {
        if (!dag.nodes[nodeId]) {
          throw new DAGValidationError(
            `Parallel group "${group.id}" references non-existent node "${nodeId}"`
          );
        }
      }

      // Validate maxConcurrent if provided
      if (group.maxConcurrent !== undefined && group.maxConcurrent <= 0) {
        throw new DAGValidationError(
          `Parallel group "${group.id}" maxConcurrent must be positive`
        );
      }
    }
  }

  /**
   * Validate subgraphs
   */
  private validateSubgraphs(dag: EnhancedDAG): void {
    const metadata = dag.metadata;
    if (!metadata || !metadata.subgraphs) {
      return;
    }

    for (const subgraph of metadata.subgraphs) {
      // Check that all node IDs in the subgraph exist in the DAG
      for (const nodeId of [...subgraph.entryPoints, ...subgraph.exitPoints, ...subgraph.nodeIds]) {
        if (!dag.nodes[nodeId]) {
          throw new DAGValidationError(
            `Subgraph "${subgraph.id}" references non-existent node "${nodeId}"`
          );
        }
      }

      // Check that entry and exit points are actually part of the subgraph
      for (const entryPoint of subgraph.entryPoints) {
        if (!subgraph.nodeIds.includes(entryPoint)) {
          throw new DAGValidationError(
            `Subgraph "${subgraph.id}" entry point "${entryPoint}" is not in the subgraph node list`
          );
        }
      }

      for (const exitPoint of subgraph.exitPoints) {
        if (!subgraph.nodeIds.includes(exitPoint)) {
          throw new DAGValidationError(
            `Subgraph "${subgraph.id}" exit point "${exitPoint}" is not in the subgraph node list`
          );
        }
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

    const dfs = (nodeId: string): string[] | null => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const result = dfs(neighbor);
          if (result) {
            return result;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          return [...path.slice(cycleStart), neighbor];
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return null;
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
   * Get nodes that can be executed in parallel considering parallel execution groups
   * @param dag The DAG to analyze
   * @param completedNodes Set of node IDs that have been completed
   * @param parallelGroups Parallel execution groups to consider
   * @returns Map of group IDs to arrays of executable node IDs in each group
   */
  static getExecutableNodesWithGroups(
    dag: EnhancedDAG,
    completedNodes: Set<string>
  ): Map<string, string[]> {
    const result = new Map<string, string[]>();
    const metadata = dag.metadata;
    
    // If no parallel groups, fall back to standard executable nodes
    if (!metadata || !metadata.parallelGroups || metadata.parallelGroups.length === 0) {
      const executable = DAGUtils.getExecutableNodes(dag, completedNodes);
      if (executable.length > 0) {
        result.set('default', executable);
      }
      return result;
    }

    // Initialize in-degree and adjacency list
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

    // Group executable nodes by their parallel groups
    const groupMap = new Map<string, Set<string>>();

    // Initialize group maps
    for (const group of metadata.parallelGroups) {
      groupMap.set(group.id, new Set<string>());
    }
    groupMap.set('ungrouped', new Set<string>()); // For nodes not in any group

    // Assign nodes to groups
    for (const nodeId of Object.keys(dag.nodes)) {
      if (completedNodes.has(nodeId)) {
        continue; // Skip completed nodes
      }

      const nodeInDegree = inDegree.get(nodeId) || 0;
      if (nodeInDegree === 0) {
        // Node is executable (no pending dependencies)
        let assigned = false;
        for (const group of metadata.parallelGroups) {
          if (group.nodeIds.includes(nodeId)) {
            groupMap.get(group.id)!.add(nodeId);
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          groupMap.get('ungrouped')!.add(nodeId);
        }
      }
    }

    // Convert sets to arrays for the result
    for (const [groupId, nodeSet] of groupMap) {
      const nodes = Array.from(nodeSet);
      if (nodes.length > 0) {
        result.set(groupId, nodes);
      }
    }

    return result;
  }

  /**
   * Create execution layers for parallel execution
   * Layers are sets of nodes that can execute in parallel
   * Nodes in layer N depend only on nodes in layers < N
   */
  static createExecutionLayers(dag: EnhancedDAG): ExecutionLayer[] {
    const layers: ExecutionLayer[] = [];
    const nodeLayerMap = new Map<string, number>(); // nodeId -> layer index
    const completed = new Set<string>();
    
    // Continue until all nodes are assigned to a layer
    while (completed.size < Object.keys(dag.nodes).length) {
      // Get executable nodes (nodes with no uncompleted dependencies)
      const executableNodes = DAGUtils.getExecutableNodes(dag, completed);
      
      if (executableNodes.length === 0) {
        // This should not happen in a valid DAG, but prevent infinite loop
        break;
      }
      
      // Create a new layer
      const layerId = `layer_${layers.length}`;
      const layer: ExecutionLayer = {
        id: layerId,
        nodeIds: [...executableNodes],
        dependencies: [],
        parallelizable: true
      };
      
      // Find dependencies (layers that this layer depends on)
      const layerDependencies = new Set<string>();
      for (const nodeId of executableNodes) {
        const dependencies = DAGUtils.getAllDependencies(dag, nodeId);
        for (const depId of dependencies) {
          if (!completed.has(depId)) {
            // This shouldn't happen if we calculated executable nodes correctly
            // but just in case, skip
            continue;
          }
          const depLayer = nodeLayerMap.get(depId);
          if (depLayer !== undefined) {
            layerDependencies.add(`layer_${depLayer}`);
          }
        }
      }
      
      layer.dependencies = Array.from(layerDependencies);
      layers.push(layer);
      
      // Mark nodes in this layer as completed for the next iteration
      for (const nodeId of executableNodes) {
        completed.add(nodeId);
        nodeLayerMap.set(nodeId, layers.length - 1);
      }
    }
    
    return layers;
  }

  /**
   * Get nodes that can be executed in parallel considering both dependencies and parallel groups
   * Returns a flattened list of all executable nodes across all groups
   */
  static getAllExecutableNodes(
    dag: EnhancedDAG,
    completedNodes: Set<string>
  ): string[] {
    const executableMap = DAGUtils.getExecutableNodesWithGroups(dag, completedNodes);
    const allExecutable: string[] = [];
    
    for (const nodes of executableMap.values()) {
      allExecutable.push(...nodes);
    }
    
    return allExecutable;
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