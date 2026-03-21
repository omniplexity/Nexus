/**
 * Minimal Orchestrator Implementation
 * 
 * Provides task execution through DAG-based workflows.
 * Phase 2: Sequential execution only, no parallel processing.
 */

import { v4 as uuidv4 } from 'uuid';
import { DAGBuilder, DAGUtils } from './dag';
import { NodeExecutor } from './executor';
import type {
  Orchestrator,
  OrchestratorConfig,
  Task,
  ExecutionContext,
  ExecutionResult,
  TaskStatus,
  ExecutionMetrics,
  DAG,
} from '../../../core/contracts/orchestrator';
import type {
  Node,
  NodeInput,
  NodeOutput,
  NodeType,
} from '../../../core/contracts/node';
import type { ModelProvider, ModelRouter } from '../../models/src';

/**
 * Minimal orchestrator for Phase 2
 */
export class MinimalOrchestrator implements Orchestrator {
  private config: OrchestratorConfig;
  private executor: NodeExecutor;
  private router: ModelRouter | null = null;
  private currentDAG: DAG | null = null;
  private taskStates: Map<string, TaskStatus> = new Map();
  private nodeOutputs: Map<string, NodeOutput> = new Map();

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxConcurrentNodes: 1,  // Phase 2: sequential only
      defaultTimeout: 30000,
      enableCaching: false,
      enableMetrics: true,
      ...config,
    };
    this.executor = new NodeExecutor({
      defaultTimeout: this.config.defaultTimeout,
      maxRetries: config.retryConfig?.maxAttempts,
    });
  }

  /**
   * Set the model router
   */
  setRouter(router: ModelRouter): void {
    this.router = router;
  }

  /**
   * Execute a task with the given input and context
   */
  async execute(task: Task, context: ExecutionContext): Promise<ExecutionResult> {
    const taskId = task.id || uuidv4();
    const startTime = Date.now();

    // Update task state
    this.taskStates.set(taskId, TaskStatus.RUNNING);

    try {
      // Build DAG from task or use existing
      const dag = this.buildDAG(task, context);

      // Register all nodes with executor
      for (const nodeId of Object.keys(dag.nodes)) {
        const node = dag.nodes[nodeId];
        this.executor.registerNode(node);
      }

      this.currentDAG = dag;
      this.nodeOutputs.clear();

      // Execute nodes in topological order (sequential)
      const sortedNodes = DAGUtils.topologicalSort(dag);

      for (const nodeId of sortedNodes) {
        const node = dag.nodes[nodeId];
        
        // Get input for this node
        const input = this.prepareNodeInput(node, task, context);
        
        // Execute node
        const output = await this.executor.executeNode(nodeId, input, {
          sessionId: context.sessionId,
          taskId,
        });

        this.nodeOutputs.set(nodeId, output);

        // Handle node failure
        if (output.status === 'failed') {
          this.taskStates.set(taskId, TaskStatus.FAILED);
          
          return {
            taskId,
            status: TaskStatus.FAILED,
            output: null,
            error: `Node "${nodeId}" failed: ${output.error}`,
            metrics: this.calculateMetrics(startTime),
            nodeOutputs: Object.fromEntries(this.nodeOutputs),
          };
        }
      }

      // All nodes completed successfully
      this.taskStates.set(taskId, TaskStatus.COMPLETED);

      // Aggregate outputs
      const finalOutput = this.aggregateOutputs(sortedNodes);

      return {
        taskId,
        status: TaskStatus.COMPLETED,
        output: finalOutput,
        metrics: this.calculateMetrics(startTime),
        nodeOutputs: Object.fromEntries(this.nodeOutputs),
      };
    } catch (error) {
      this.taskStates.set(taskId, TaskStatus.FAILED);
      
      return {
        taskId,
        status: TaskStatus.FAILED,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metrics: this.calculateMetrics(Date.now()),
        nodeOutputs: Object.fromEntries(this.nodeOutputs),
      };
    }
  }

  /**
   * Register a node type with the orchestrator
   */
  registerNode(node: Node): void {
    this.executor.registerNode(node);
  }

  /**
   * Get the current execution graph
   */
  getExecutionGraph(): DAG {
    if (!this.currentDAG) {
      return {
        id: 'empty',
        nodes: {},
        edges: [],
      };
    }
    return this.currentDAG;
  }

  /**
   * Pause a running task
   */
  async pause(taskId: string): Promise<void> {
    const state = this.taskStates.get(taskId);
    if (state === TaskStatus.RUNNING) {
      this.taskStates.set(taskId, TaskStatus.PAUSED);
    }
  }

  /**
   * Resume a paused task
   */
  async resume(taskId: string): Promise<void> {
    const state = this.taskStates.get(taskId);
    if (state === TaskStatus.PAUSED) {
      this.taskStates.set(taskId, TaskStatus.RUNNING);
    }
  }

  /**
   * Cancel a running task
   */
  async cancel(taskId: string): Promise<void> {
    this.taskStates.set(taskId, TaskStatus.CANCELLED);
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | null {
    return this.taskStates.get(taskId) || null;
  }

  /**
   * Build DAG from task
   */
  private buildDAG(task: Task, context: ExecutionContext): DAG {
    // For Phase 2, create a simple single-node DAG
    // In Phase 3+, this will parse task.graph or create from task.type
    
    const builder = DAGBuilder.create();

    // Create a reasoning node based on task input
    const nodeId = `reasoning-${task.id || uuidv4()}`;
    const reasoningNode = this.createReasoningNode(nodeId, task.input, context);

    builder.addNode(reasoningNode);
    builder.setMetadata('taskId', task.id);

    return builder.build();
  }

  /**
   * Create a reasoning node for LLM calls
   */
  private createReasoningNode(
    nodeId: string,
    input: unknown,
    context: ExecutionContext
  ): Node {
    const prompt = typeof input === 'string' 
      ? input 
      : JSON.stringify(input);

    return {
      id: nodeId,
      type: 'reasoning' as NodeType,
      name: 'Reasoning Node',
      config: {
        timeout: this.config.defaultTimeout,
      },
      execute: async (nodeInput: NodeInput): Promise<NodeOutput> => {
        const startTime = new Date();

        try {
          // Get model from router or use default
          let provider = null;
          
          if (this.router) {
            const selection = await this.router.selectModel({
              model: '',
              messages: [
                { role: 'user', content: prompt }
              ],
              config: { role: 'reasoning' },
            });
            provider = selection.provider;
          }

          if (!provider) {
            throw new Error('No model provider available');
          }

          const response = await provider.complete({
            model: '',
            messages: [
              { role: 'user', content: prompt }
            ],
            config: {
              role: 'reasoning',
              temperature: 0.7,
              maxTokens: 4096,
            },
          });

          return {
            nodeId,
            data: response.content,
            status: 'completed',
            metadata: {
              startTime,
              endTime: new Date(),
              tokensUsed: response.usage.totalTokens,
            },
          };
        } catch (error) {
          return {
            nodeId,
            data: null,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            metadata: {
              startTime,
              endTime: new Date(),
            },
          };
        }
      },
      validate: () => true,
      getDependencies: () => [],
      clone: () => this.createReasoningNode(nodeId, input, context),
    };
  }

  /**
   * Prepare input for a node
   */
  private prepareNodeInput(
    node: Node,
    task: Task,
    context: ExecutionContext
  ): NodeInput {
    // Gather outputs from dependency nodes
    const dependencies: Record<string, unknown> = {};
    
    if (this.currentDAG) {
      for (const edge of this.currentDAG.edges) {
        if (edge.targetId === node.id) {
          const output = this.nodeOutputs.get(edge.sourceId);
          if (output) {
            dependencies[edge.sourceId] = output.data;
          }
        }
      }
    }

    return {
      nodeId: node.id,
      data: task.input,
      dependencies,
      context: {
        sessionId: context.sessionId,
        userId: context.userId,
        variables: context.variables,
      },
    };
  }

  /**
   * Aggregate outputs from all nodes
   */
  private aggregateOutputs(nodeIds: string[]): unknown {
    if (nodeIds.length === 0) {
      return null;
    }

    // For single node, return its output
    if (nodeIds.length === 1) {
      const output = this.nodeOutputs.get(nodeIds[0]);
      return output?.data ?? null;
    }

    // For multiple nodes, aggregate into an object
    const aggregated: Record<string, unknown> = {};
    for (const nodeId of nodeIds) {
      const output = this.nodeOutputs.get(nodeId);
      if (output) {
        aggregated[nodeId] = output.data;
      }
    }

    return aggregated;
  }

  /**
   * Calculate execution metrics
   */
  private calculateMetrics(startTime: number): ExecutionMetrics {
    const totalNodes = this.nodeOutputs.size;
    const completedNodes = Array.from(this.nodeOutputs.values()).filter(
      (o) => o.status === 'completed'
    ).length;
    const failedNodes = Array.from(this.nodeOutputs.values()).filter(
      (o) => o.status === 'failed'
    ).length;

    const totalTokens = Array.from(this.nodeOutputs.values()).reduce(
      (sum, o) => sum + (o.metadata.tokensUsed || 0),
      0
    );

    return {
      totalNodes,
      completedNodes,
      failedNodes,
      totalTokens,
      totalLatencyMs: Date.now() - startTime,
      cacheHits: 0,
    };
  }
}

/**
 * Create an orchestrator with default configuration
 */
export function createOrchestrator(config?: OrchestratorConfig): Orchestrator {
  return new MinimalOrchestrator(config);
}
