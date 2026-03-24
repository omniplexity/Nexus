/**
 * Execution Planner Component
 * 
 * Plans execution strategies by integrating with the scheduler and DAG utilities
 * to create optimal execution plans for parallel processing.
 */

import type { ExecutionContext } from '@nexus/core/contracts/orchestrator';

import { DAGUtils } from '@nexus/systems/orchestration/engine/dag';
import type { EnhancedDAG } from '@nexus/systems/orchestration/engine/types';
import type { Scheduler, SchedulerDecision } from '@nexus/systems/orchestration/scheduler';


/**
 * Execution plan defining how to execute a DAG
 */
export interface ExecutionPlan {
  /**
   * Layers of nodes to execute in order
   * Each layer contains node IDs that can execute in parallel
   */
  layers: Array<{
    id: string;
    nodeIds: string[];
    dependencies: string[]; // Layer IDs that must complete before this layer
    parallelizable: boolean;
    estimatedDurationMs: number;
    resourceRequirements: {
      cpu: number;
      memory: number;
      tokens: number;
    };
  }>;
  
  /**
   * Scheduling decisions for each layer
   */
  schedulingDecisions: Record<string, SchedulerDecision>;
  
  /**
   * Overall execution metrics
   */
  estimatedTotalDurationMs: number;
  estimatedMaxConcurrency: number;
  
  /**
   * Metadata about the planning process
   */
  metadata: Record<string, unknown>;
}

/**
 * Execution planner configuration
 */
export interface ExecutionPlannerConfig {
  /**
   * Enable scheduler integration
   */
  enableScheduler: boolean;
  /**
   * Enable execution layer optimization
   */
  enableLayerOptimization: boolean;
  /**
   * Fallback to sequential execution if planning fails
   */
  fallbackToSequential: boolean;
}

/**
 * Execution planner that creates optimal execution plans
 */
export class ExecutionPlanner {
  private config: ExecutionPlannerConfig;
  private scheduler: Scheduler | null = null;

  constructor(config?: Partial<ExecutionPlannerConfig>) {
    const cfg = config ?? {};
    this.config = {
      enableScheduler: cfg.enableScheduler ?? true,
      enableLayerOptimization: cfg.enableLayerOptimization ?? true,
      fallbackToSequential: cfg.fallbackToSequential ?? true,
    };
  }

  /**
   * Set the scheduler to use for planning
   */
  setScheduler(scheduler: Scheduler): void {
    this.scheduler = scheduler;
  }

  /**
   * Create an execution plan for the given DAG
   * @param dag The DAG to plan execution for
   * @param context Execution context
   * @param availableResources Available system resources
   * @returns Execution plan
   */
  async createExecutionPlan(
    dag: EnhancedDAG,
    context: ExecutionContext,
    availableResources: {
      cpu: number;
      memory: number;
      tokens: number;
    }
  ): Promise<ExecutionPlan> {
    try {
      // If scheduler is not available or disabled, create a basic plan
      if (!this.config.enableScheduler || !this.scheduler) {
        return this.createBasicExecutionPlan(dag);
      }

      // Get initial executable nodes (nodes with no dependencies)
      const initialExecutable = DAGUtils.getExecutableNodes(dag, new Set());
      
        // Get scheduling decision for initial nodes (not used in basic implementation)
        await this.scheduler.makeDecision(
          initialExecutable,
          dag,
          availableResources,
          context
        );

      // Create execution layers
      const layers = this.config.enableLayerOptimization
        ? DAGUtils.createExecutionLayers(dag)
        : this.createSequentialLayers(dag);

      // Create scheduling decisions for each layer
      const schedulingDecisions: Record<string, SchedulerDecision> = {};
      let totalEstimatedDuration = 0;
      let maxConcurrency = 0;

      for (const layer of layers) {
        // Get nodes in this layer that are ready to execute
        const completedNodes = new Set<string>();
        const readyNodes = layer.nodeIds.filter(nodeId => 
          !completedNodes.has(nodeId) && 
          this.areDependenciesSatisfied(nodeId, layer.dependencies, layers as ExecutionPlan['layers'], completedNodes)
        );

        if (readyNodes.length > 0 && this.scheduler) {
          const layerDecision = await this.scheduler.makeDecision(
            readyNodes,
            dag,
            availableResources,
            context
          );
          schedulingDecisions[layer.id] = layerDecision;
          
          // Update metrics
          totalEstimatedDuration += layerDecision.estimatedDurationMs?.[readyNodes[0]] || 0;
          const layerConcurrency = Object.keys(layerDecision.resourceRequirements || {}).length;
          maxConcurrency = Math.max(maxConcurrency, layerConcurrency);
        }
      }

      return {
        layers: layers.map(layer => ({
          ...layer,
          estimatedDurationMs: 5000,
          resourceRequirements: {
            cpu: layer.nodeIds.length,
            memory: 256 * layer.nodeIds.length,
            tokens: 1000 * layer.nodeIds.length
          }
        })),
        schedulingDecisions,
        estimatedTotalDurationMs: totalEstimatedDuration,
        estimatedMaxConcurrency: maxConcurrency,
        metadata: {
          plannerType: 'scheduler-integrated',
          timestamp: Date.now(),
          dagId: dag.id,
          layerCount: layers.length
        }
      };
    } catch (error) {
      // Fallback to basic execution plan if planning fails
      if (this.config.fallbackToSequential) {
        return this.createBasicExecutionPlan(dag);
      }
      throw error;
    }
  }

  /**
   * Create a basic execution plan (sequential or simple parallel)
   */
  private createBasicExecutionPlan(dag: EnhancedDAG): ExecutionPlan {
    // Use DAG utils to get executable nodes and create simple layers
    const completed = new Set<string>();
    const layers: ExecutionPlan['layers'] = [];
    let layerIndex = 0;

    while (completed.size < Object.keys(dag.nodes).length) {
      const executableNodes = DAGUtils.getExecutableNodes(dag, completed);
      
      if (executableNodes.length === 0) {
        // Prevent infinite loop in case of error
        break;
      }

      const layer: ExecutionPlan['layers'][0] = {
        id: `layer_${layerIndex++}`,
        nodeIds: [...executableNodes],
        dependencies: [],
        parallelizable: executableNodes.length > 1,
        estimatedDurationMs: 5000, // Default estimate
        resourceRequirements: {
          cpu: executableNodes.length,
          memory: 256 * executableNodes.length,
          tokens: 1000 * executableNodes.length
        }
      };

      layers.push(layer);
      
      // Mark these nodes as completed for next iteration
      for (const nodeId of executableNodes) {
        completed.add(nodeId);
      }
    }

    return {
      layers,
      schedulingDecisions: {},
      estimatedTotalDurationMs: layers.reduce((sum, layer) => sum + layer.estimatedDurationMs, 0),
      estimatedMaxConcurrency: Math.max(...layers.map(layer => layer.nodeIds.length), 1),
      metadata: {
        plannerType: 'basic',
        timestamp: Date.now(),
        dagId: dag.id,
        layerCount: layers.length
      }
    };
  }

  /**
   * Create sequential layers (one node per layer)
   */
  private createSequentialLayers(dag: EnhancedDAG): ExecutionPlan['layers'] {
    const layers: ExecutionPlan['layers'] = [];
    const nodeIds = Object.keys(dag.nodes);
    
    for (let i = 0; i < nodeIds.length; i++) {
      const layer: ExecutionPlan['layers'][0] = {
        id: `layer_${i}`,
        nodeIds: [nodeIds[i]],
        dependencies: i > 0 ? [`layer_${i-1}`] : [],
        parallelizable: false,
        estimatedDurationMs: 5000,
        resourceRequirements: {
          cpu: 1,
          memory: 256,
          tokens: 1000
        }
      };
      
      layers.push(layer);
    }
    
    return layers;
  }

  /**
   * Check if dependencies for a node are satisfied
   */
  private areDependenciesSatisfied(
    _nodeId: string,
    layerDependencies: string[],
    allLayers: ExecutionPlan['layers'],
    completedNodes: Set<string>
  ): boolean {
    // For simplicity, we're assuming layer dependencies are sufficient
    // In a full implementation, we would check actual node dependencies
    return layerDependencies.every(depId => 
      allLayers.some(layer => layer.id === depId && 
        layer.nodeIds.every(nid => completedNodes.has(nid))
      )
    );
  }
}

/**
 * Create an execution planner with default configuration
 */
export function createExecutionPlanner(config: Partial<ExecutionPlannerConfig> = {}): ExecutionPlanner {
  return new ExecutionPlanner({
    enableScheduler: config?.enableScheduler ?? true,
    enableLayerOptimization: config?.enableLayerOptimization ?? true,
    fallbackToSequential: config?.fallbackToSequential ?? true,
  });
}