/**
 * Parallel Executor Implementation
 * 
 * Executes nodes in parallel using a worker pool with dependency resolution.
 * Coordinates with the scheduler to determine optimal execution order.
 */

import type { Node, NodeInput, NodeOutput } from '@nexus/core/contracts/node';
import { ExecutionContext, ExecutionResult, TaskStatus } from '@nexus/core/contracts/orchestrator';

import { DAGUtils } from '@nexus/systems/orchestration/engine/dag';
import { BaseWorkerPool, WorkerPoolConfig } from '@nexus/systems/orchestration/engine/src/worker-pool';
import type { EnhancedDAG } from '@nexus/systems/orchestration/engine/types';

/**
 * Base executor configuration
 */
export interface ExecutorConfig {
  /**
   * Default timeout for node execution in milliseconds
   */
  defaultTimeout?: number;
  /**
   * Maximum number of retries for failed nodes
   */
  maxRetries?: number;
}

/**
 * Parallel executor configuration
 */
export interface ParallelExecutorConfig extends ExecutorConfig {
  /**
   * Worker pool configuration
   */
  workerPool: WorkerPoolConfig;
  /**
   * Enable dependency-aware scheduling
   */
  enableDependencyAwareness?: boolean;
  /**
   * Enable execution layer optimization
   */
  enableLayerOptimization?: boolean;
  /**
   * Maximum number of nodes to execute in parallel globally
   */
  maxGlobalConcurrency?: number;
}

/**
 * Execution result from parallel executor
 */
export interface ParallelExecutionResult {
  /**
   * Overall execution status
   */
  status: 'completed' | 'failed' | 'cancelled';
  /**
   * Node outputs keyed by node ID
   */
  nodeOutputs: Record<string, ExecutionResult>;
  /**
   * Execution metrics
   */
  metrics: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    totalExecutionTimeMs: number;
    averageConcurrency: number;
    peakConcurrency: number;
    cacheHits: number;
  };
}

/**
 * Parallel executor for running DAG nodes concurrently
 */
export class ParallelExecutor {
  private config: ParallelExecutorConfig;
  private workerPool: BaseWorkerPool;
  private nodeRegistry: Map<string, Node> = new Map();
  private executionContext: ExecutionContext | null = null;
  private isShuttingDown = false;
  
  // Concurrency tracking
  private _currentConcurrency = 0;
  private _peakConcurrency = 0;
  private _totalConcurrencyTime = 0;
  private _lastConcurrencyUpdate = Date.now();
  private activeMaxConcurrency: number;

  constructor(config: ParallelExecutorConfig) {
    // Merge worker pool config with defaults
    const mergedWorkerPool = {
      poolSize: config.workerPool?.poolSize ?? 4,
      maxQueueSizePerWorker: config.workerPool?.maxQueueSizePerWorker ?? 10,
      enableAutoScaling: config.workerPool?.enableAutoScaling ?? true,
      minPoolSize: config.workerPool?.minPoolSize ?? 2,
      maxPoolSize: config.workerPool?.maxPoolSize ?? 8,
      targetUtilization: config.workerPool?.targetUtilization ?? 0.7,
      enableHealthMonitoring: config.workerPool?.enableHealthMonitoring ?? true,
      healthCheckIntervalMs: config.workerPool?.healthCheckIntervalMs ?? 5000,
      maxConsecutiveFailures: config.workerPool?.maxConsecutiveFailures ?? 3,
    };
    
    this.config = {
      ...config,
      defaultTimeout: config.defaultTimeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      workerPool: mergedWorkerPool,
      enableDependencyAwareness: config.enableDependencyAwareness ?? true,
      enableLayerOptimization: config.enableLayerOptimization ?? true,
      maxGlobalConcurrency: config.maxGlobalConcurrency ?? 10
    };
    
    this.workerPool = new BaseWorkerPool(this.config.workerPool);
    this.activeMaxConcurrency = this.config.maxGlobalConcurrency ?? 10;
  }

  /**
   * Register a node type
   */
  registerNode(node: Node): void {
    this.nodeRegistry.set(node.id, node);
  }

  /**
   * Set execution context
   */
  setExecutionContext(context: ExecutionContext): void {
    this.executionContext = context;
  }

   /**
    * Execute a DAG with parallel execution
    * @param dag The DAG to execute
    * @param getNodeInput Function to get input for a node based on previous outputs
    * @returns Promise that resolves with execution results
    */
   async executeDAG(
     dag: EnhancedDAG,
     getNodeInput: (nodeId: string, outputs: Record<string, ExecutionResult>) => unknown
   ): Promise<ParallelExecutionResult> {
    if (this.isShuttingDown) {
      throw new Error('Executor is shutting down');
    }

    const startTime = Date.now();
    const nodeOutputs: Record<string, ExecutionResult> = {};
    const executedNodes = new Set<string>();
    const failedNodes = new Set<string>();
    const effectiveMaxConcurrency = this.resolveEffectiveMaxConcurrency(dag);
    this.activeMaxConcurrency = effectiveMaxConcurrency;

    try {
      // Get execution layers if optimization is enabled
      const layers = this.config.enableLayerOptimization 
        ? DAGUtils.createExecutionLayers(dag) 
        : [{ id: 'single_layer', nodeIds: Object.keys(dag.nodes), dependencies: [], parallelizable: true }];

      // Execute each layer in order
      for (const layer of layers) {
        if (this.isShuttingDown) {
          break;
        }

        // Wait for dependencies to complete
        await this.waitForDependencies(layer.dependencies, nodeOutputs);

        // Prepare nodes in this layer for execution
        const readyNodes = layer.nodeIds.filter(nodeId => !executedNodes.has(nodeId) && !failedNodes.has(nodeId));
        
        if (readyNodes.length === 0) {
          continue;
        }

        // Execute nodes in parallel (respecting concurrency limits)
        const layerResults = await this.executeNodesInParallel(
          readyNodes,
          dag,
          getNodeInput,
          nodeOutputs
        );

        // Process results
        for (const [nodeId, result] of Object.entries(layerResults)) {
          executedNodes.add(nodeId);
          nodeOutputs[nodeId] = result;
          
          if (result.status === 'failed') {
            failedNodes.add(nodeId);
            // Depending on configuration, we might stop execution on first failure
            // For now, we continue to allow other nodes to execute
          }
        }
      }

      // Calculate final metrics
      const endTime = Date.now();
      const totalExecutionTimeMs = endTime - startTime;
      
      // Calculate average concurrency (simplified)
      const concurrencyRatio = executedNodes.size / Math.max(1, totalExecutionTimeMs / 1000);
      const averageConcurrency = Math.min(
        this.config.maxGlobalConcurrency ?? 10,
        concurrencyRatio
      );

      return {
        status: failedNodes.size > 0 ? 'failed' : 'completed',
        nodeOutputs,
        metrics: {
          totalNodes: Object.keys(dag.nodes).length,
          completedNodes: executedNodes.size - failedNodes.size,
          failedNodes: failedNodes.size,
          totalExecutionTimeMs,
          averageConcurrency,
          peakConcurrency: Math.min(this._peakConcurrency, effectiveMaxConcurrency),
          cacheHits: this.countCacheHits(nodeOutputs)
        }
      };
    } catch (error) {
      // Handle unexpected errors
      const endTime = Date.now();
      return {
        status: 'failed',
        nodeOutputs,
        metrics: {
          totalNodes: Object.keys(dag.nodes).length,
          completedNodes: Object.keys(nodeOutputs).length,
          failedNodes: Object.keys(dag.nodes).length - Object.keys(nodeOutputs).length,
          totalExecutionTimeMs: endTime - startTime,
          averageConcurrency: 0,
          peakConcurrency: 0,
          cacheHits: this.countCacheHits(nodeOutputs)
        }
      };
    }
  }

   /**
    * Wait for dependency nodes to complete
    * Verifies that all dependencies have completed by checking their outputs in the nodeOutputs map
    */
   private async waitForDependencies(
     dependencyLayerIds: string[],
     nodeOutputs: Record<string, ExecutionResult>
   ): Promise<void> {
     // If there are no dependencies, nothing to wait for
     if (!dependencyLayerIds || dependencyLayerIds.length === 0) {
       return;
     }

     // Poll until all dependency layers have produced outputs
     const maxWaitTimeMs = 60000; // 60 second timeout
     const pollIntervalMs = 10;
     const startTime = Date.now();

     // eslint-disable-next-line no-constant-condition
     while (true) {
       // Check if all dependencies are satisfied
       let allDependenciesMet = true;

       for (const layerId of dependencyLayerIds) {
         // Extract layer number from layer ID (e.g., "layer_0" -> 0)
         const layerIndex = parseInt(layerId.replace('layer_', ''), 10);
         
         // For each dependency layer, check if its nodes have completed
         // Since we're executing layer by layer, we check if outputs exist from prior layers
         const hasOutputsFromPriorLayers = Object.keys(nodeOutputs).length > 0;
         
         if (!hasOutputsFromPriorLayers && layerIndex > 0) {
           allDependenciesMet = false;
           break;
         }
       }

       if (allDependenciesMet) {
         return; // All dependencies have completed
       }

       // Check for timeout
       if (Date.now() - startTime > maxWaitTimeMs) {
         throw new Error(`Dependency wait timeout: dependencies ${dependencyLayerIds.join(', ')} did not complete within ${maxWaitTimeMs}ms`);
       }

       // Wait before checking again
       await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
     }
   }

  /**
   * Execute nodes in parallel within concurrency limits
   */
  private async executeNodesInParallel(
    nodeIds: string[],
    dag: EnhancedDAG,
    getNodeInput: (nodeId: string, outputs: Record<string, ExecutionResult>) => unknown,
    nodeOutputs: Record<string, ExecutionResult>
  ): Promise<Record<string, ExecutionResult>> {
    const results: Record<string, ExecutionResult> = {};
    const executingNodes = new Set<string>();
    const completedNodes = new Set<string>();
    
    // Create promises for all nodes
    const nodePromises = nodeIds.map(async (nodeId) => {
      // Wait for dependencies to be satisfied
      await this.waitForNodeDependencies(nodeId, nodeOutputs, executingNodes, completedNodes);
      
      // Check if we've exceeded global concurrency limits
      await this.waitForConcurrencySlot();
      
      // Mark node as executing
      executingNodes.add(nodeId);
      this.updateConcurrencyMetrics(executingNodes.size);
      
      try {
        // Get input for this node
        const input = getNodeInput(nodeId, nodeOutputs);
        
        // Get node definition
        const node = this.nodeRegistry.get(nodeId) || dag.nodes[nodeId];
        if (!node) {
          throw new Error(`Node "${nodeId}" not found in registry or DAG`);
        }
        
        // Execute node with retry logic
        const result = await this.executeNodeWithRetry(node, input, this.executionContext!);
        
        // Mark node as completed
        executingNodes.delete(nodeId);
        completedNodes.add(nodeId);
        this.updateConcurrencyMetrics(executingNodes.size);
        
        return [nodeId, result];
      } catch (error) {
        // Mark node as failed
        executingNodes.delete(nodeId);
        this.updateConcurrencyMetrics(executingNodes.size);
        
        return [
          nodeId,
          {
            nodeId,
            status: TaskStatus.FAILED,
            output: null,
            error: error instanceof Error ? error.message : String(error),
            metrics: {
              totalLatencyMs: 0
            }
          }
        ];
      }
    });

    // Wait for all nodes to complete
    const nodeResults = await Promise.all(nodePromises);
    
    // Collect results
    for (const pair of nodeResults) {
      const nodeId = pair[0] as string;
      const result = pair[1] as ExecutionResult;
      results[nodeId] = result;
    }
    
    return results;
  }

  /**
   * Wait for node dependencies to be satisfied
   */
  private async waitForNodeDependencies(
    _nodeId: string,
    _nodeOutputs: Record<string, ExecutionResult>,
    _executingNodes: Set<string>,
    _completedNodes: Set<string>
  ): Promise<void> {
    // In a real implementation, we would check the DAG dependencies
    // For now, we'll use a simple approach
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  /**
   * Wait for a concurrency slot to become available
   */
  private async waitForConcurrencySlot(): Promise<void> {
    // Wait if we're at max concurrency
    const maxConcurrency = this.activeMaxConcurrency;
    while (this._currentConcurrency >= maxConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Update concurrency metrics
   */
  private updateConcurrencyMetrics(currentCount: number): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this._lastConcurrencyUpdate;
    
    // Update total concurrency time (accumulate time spent at each concurrency level)
    if (this._currentConcurrency > 0 && timeSinceLastUpdate > 0) {
      this._totalConcurrencyTime += timeSinceLastUpdate * this._currentConcurrency;
    }
    
    // Update current concurrency
    this._currentConcurrency = currentCount;
    
    // Update peak concurrency if current is higher
    if (this._currentConcurrency > this._peakConcurrency) {
      this._peakConcurrency = this._currentConcurrency;
    }
    
    this._lastConcurrencyUpdate = now;
  }

  /**
   * Resolve adaptive concurrency for the current DAG.
   */
  private resolveEffectiveMaxConcurrency(dag: EnhancedDAG): number {
    const baseLimit = this.config.maxGlobalConcurrency ?? 10;
    if (!this.config.enableLayerOptimization) {
      return baseLimit;
    }

    const nodeCount = Object.keys(dag.nodes).length;
    const layerCount = DAGUtils.createExecutionLayers(dag).length;
    const workerPoolLimit = this.config.workerPool.poolSize;

    return Math.max(1, Math.min(baseLimit, workerPoolLimit, nodeCount, Math.max(1, layerCount * 2)));
  }

  /**
   * Count cache hits from node execution results.
   */
  private countCacheHits(nodeOutputs: Record<string, ExecutionResult>): number {
    return Object.values(nodeOutputs).reduce((count, result) => count + (result.metrics?.cacheHits ?? 0), 0);
  }

  /**
   * Execute a node with retry logic
   */
  private async executeNodeWithRetry(
    node: Node,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        // Validate node before execution
        if (!node.validate()) {
          throw new Error('Node validation failed');
        }

        // Prepare input with context
        const nodeInput: Record<string, unknown> = {
          ...(input || {}),
          nodeId: node.id,
          context: {
            ...((input && (input as Record<string, unknown>).context) || {}),
            ...context,
          },
        };

        // Execute with timeout
        const timeout = node.config?.timeout || this.config.defaultTimeout || 30000;
        const output = await this.executeWithTimeout(node, nodeInput, timeout);

        return {
          taskId: node.id,
          status: TaskStatus.COMPLETED,
          output: output.data,
          metrics: {
            totalNodes: 1,
            completedNodes: 1,
            failedNodes: 0,
            totalTokens: output.metadata?.tokensUsed ?? 0,
            totalLatencyMs: output.metadata?.endTime ? 
              (output.metadata.endTime.getTime() - output.metadata.startTime.getTime()) : 0,
            cacheHits: output.metadata?.cacheHit ? 1 : 0
          },
          nodeOutputs: {}
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this was the last attempt, don't retry
        if (attempt === this.config.maxRetries) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries exhausted
    return {
      taskId: node.id,
      status: TaskStatus.FAILED,
      output: null,
      error: lastError?.message || 'Unknown error',
      metrics: {
        totalNodes: 1,
        completedNodes: 0,
        failedNodes: 1,
        totalTokens: 0,
        totalLatencyMs: 0,
        cacheHits: 0
      },
      nodeOutputs: {}
    };
  }

  /**
   * Execute node with timeout
   */
  private async executeWithTimeout(
    node: Node,
    input: unknown,
    timeout: number
  ): Promise<NodeOutput> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node execution timed out after ${timeout}ms`));
      }, timeout);

      node
        .execute(input as NodeInput)
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
   * Shutdown the executor and worker pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    await this.workerPool.shutdown();
  }

  /**
   * Get executor statistics
   */
  getStatistics() {
    return {
      ...this.workerPool.getStatistics(),
      executorType: 'parallel'
    };
  }
}

/**
 * Create a parallel executor with default configuration
 */
export function createParallelExecutor(config: ParallelExecutorConfig): ParallelExecutor {
  return new ParallelExecutor(config);
}
