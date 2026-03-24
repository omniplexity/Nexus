/**
 * Minimal Orchestrator Implementation
 * 
 * Provides task execution through DAG-based workflows.
 * Phase 2: Sequential execution only, no parallel processing.
 */


import type { ContextEngineService, ContextRequest } from '@nexus/core/contracts/context-engine';
import type { Memory } from '@nexus/core/contracts/memory';
import { MessageRole, ModelRole } from '@nexus/core/contracts/model-provider';
import {
  Node,
  NodeInput,
  NodeOutput,
  NodeType,
  NodeStatus,
} from '@nexus/core/contracts/node';
import {
  Orchestrator,
  OrchestratorConfig,
  Task,
  ExecutionContext,
  ExecutionResult,
  TaskStatus,
  ExecutionMetrics,
  DAG,
} from '@nexus/core/contracts/orchestrator';
import type { ToolInvoker } from '@nexus/core/contracts/tool';
import type { ModelRouter } from '@nexus/systems/models';
import { v4 as uuidv4 } from 'uuid';

import { 
  ResourceScheduler, 
} from '@nexus/systems/orchestration/scheduler/resource-scheduler';

import { ToolNode } from '../nodes/tool';

import { DAGBuilder, DAGUtils } from './dag';
import { NodeExecutor } from './executor';
import { 
  ErrorHandler, 
  createErrorHandler,
} from './src/error-handler';
import { ExecutionPlanner } from './src/execution-planner';
import { ParallelExecutor } from './src/parallel-executor';
import { 
  RetryConfig
} from './src/retry-strategy';
import type { EnhancedDAG } from './types';

/**
 * Configuration type for MinimalOrchestrator
 */
export type MinimalOrchestratorConfig = Partial<OrchestratorConfig> & {
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: {
    defaultFailureThreshold: number;
    defaultTimeoutMs: number;
    defaultSuccessThreshold: number;
  };
};

/**
 * Minimal orchestrator for Phase 2
 */
export class MinimalOrchestrator implements Orchestrator {
  private config: OrchestratorConfig;
  private executor: NodeExecutor;
  private parallelExecutor: ParallelExecutor | null = null;
  private executionPlanner: ExecutionPlanner | null = null;
  private scheduler: ResourceScheduler | null = null;
  private router: ModelRouter | null = null;
  private toolInvoker: ToolInvoker | null = null;
  private currentDAG: EnhancedDAG | null = null;
  private taskStates: Map<string, TaskStatus> = new Map();
  private nodeOutputs: Map<string, NodeOutput> = new Map();
  
  // Context Engine components
  private memoryService: Memory | null = null;
  private contextEngine: ContextEngineService | null = null;
  
  // Context preparation metrics
  private contextPrepFailures: number = 0;
  private contextPrepSuccesses: number = 0;
   
  // Error handling components
  private errorHandler!: ErrorHandler;

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
    
    // Initialize error handling components
    this.errorHandler = createErrorHandler({
      enableClassification: true,
      enableAutoRecovery: true,
      defaultMaxRetries: config.retryConfig?.maxAttempts ?? 3,
      baseRetryDelayMs: 1000,
      enableMetrics: true,
      errorHistorySize: 1000
    });
    this.scheduler = new ResourceScheduler({
      enablePriority: true,
      enableResourceAwareness: true,
      defaultPriority: 1,
      maxLookahead: 10,
      enableWorkStealing: true,
      algorithm: 'hybrid',
      enableResourcePrediction: true,
      resourceSafetyMargin: 0.1,
      enableResourceBorrowing: true,
      resourceRenewalRateMs: 30000
    });
    
    // Initialize parallel execution components if enabled
    if (config.maxConcurrentNodes && config.maxConcurrentNodes > 1) {
      this.parallelExecutor = new ParallelExecutor({
        defaultTimeout: this.config.defaultTimeout,
        maxRetries: config.retryConfig?.maxAttempts,
        workerPool: {
          poolSize: config.maxConcurrentNodes,
          maxQueueSizePerWorker: 10,
          enableAutoScaling: false,
          minPoolSize: config.maxConcurrentNodes,
          maxPoolSize: config.maxConcurrentNodes,
          targetUtilization: 0.9,
          enableHealthMonitoring: true,
          healthCheckIntervalMs: 5000,
          maxConsecutiveFailures: 3
        },
        enableDependencyAwareness: true,
        enableLayerOptimization: true,
        maxGlobalConcurrency: config.maxConcurrentNodes
      });
      
      this.executionPlanner = new ExecutionPlanner({
        enableScheduler: true,
        enableLayerOptimization: true,
        fallbackToSequential: true
      });
      
      // Set scheduler for execution planner
      this.executionPlanner.setScheduler(this.scheduler);
    }
  }

  /**
   * Set the model router
   */
  setRouter(router: ModelRouter): void {
    this.router = router;
  }

  /**
   * Set the memory service for context retrieval
   * 
   * @param memory - Memory store instance
   */
  setMemoryService(memory: Memory): void {
    this.memoryService = memory;
  }

  /**
   * Set the context engine for context preparation
   * 
   * @param contextEngine - ContextEngineService instance
   */
  setContextEngine(contextEngine: ContextEngineService): void {
    this.contextEngine = contextEngine;
  }

  /**
   * Set the tool invoker used by ToolNode instances.
   */
  setToolInvoker(toolInvoker: ToolInvoker): void {
    this.toolInvoker = toolInvoker;
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

      // Prepare context using Context Engine if available
      if (this.contextEngine && this.memoryService) {
        const contextRequest: ContextRequest = {
          sessionId: context.sessionId,
          userId: context.userId,
          maxTokens: task.constraints?.maxTokens ?? 4000
        };
        
        try {
          const contextSlice = await this.contextEngine.prepareContext(contextRequest);
          
          // Track successful context preparation
          this.contextPrepSuccesses++;
          
          // Populate memory snapshot in execution context
          context.memory = await this.memoryService.getSnapshot(
            context.sessionId,
            contextRequest.maxTokens ?? 4000
          );
          
          // Also inject context slice into variables for nodes to access
          context.variables = {
            ...context.variables,
            contextSlice: {
              system: contextSlice.system,
              conversation: contextSlice.conversation,
              tools: contextSlice.tools,
              totalTokens: contextSlice.totalTokens,
              memoryIds: contextSlice.memoryIds
            }
          };
        } catch (ctxError) {
          // Track context preparation failure for observability
          this.contextPrepFailures++;
          
          // Categorize error type for debugging
          const errorType = ctxError instanceof Error 
            ? ctxError.constructor.name 
            : 'Unknown';
          const errorMessage = ctxError instanceof Error 
            ? ctxError.message 
            : String(ctxError);
          
          // Log context preparation failure with structured information
          // Continue without context - this is not a fatal error
          console.warn('Context preparation failed, continuing without context:', {
            sessionId: context.sessionId,
            errorType,
            errorMessage,
            timestamp: new Date().toISOString(),
            // Exclude stack trace in production to reduce log noise
            ...(process.env.NODE_ENV !== 'production' && ctxError instanceof Error 
              ? { stack: ctxError.stack } 
              : {})
          });
        }
      }

      // Register all nodes with executors
      for (const nodeId of Object.keys(dag.nodes)) {
        const node = dag.nodes[nodeId];
        this.executor.registerNode(node);
        if (this.parallelExecutor) {
          this.parallelExecutor.registerNode(node);
        }
      }

      this.currentDAG = dag;
      this.nodeOutputs.clear();

      // Check if we should use parallel execution
      const useParallel = this.parallelExecutor !== null && 
                         this.config.maxConcurrentNodes && 
                         this.config.maxConcurrentNodes > 1;

      if (useParallel) {
        return await this.executeParallel(dag, task, context, startTime);
      } else {
        return await this.executeSequential(dag, task, context, startTime);
      }
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
   * Execute a task using parallel execution
   */
  private async executeParallel(
    dag: EnhancedDAG,
    task: Task,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
    if (!this.parallelExecutor || !this.executionPlanner) {
      // Fallback to sequential if parallel components not initialized
      return this.executeSequential(dag, task, context, startTime);
    }

    // Set execution context for parallel executor
    this.parallelExecutor.setExecutionContext(context);

    try {
      // Create execution plan
      const availableResources = {
        cpu: this.config.maxConcurrentNodes || 4,
        memory: 4096, // 4GB default
        tokens: 8000  // 8K token default
      };

      // Create execution plan (unused but required for future use)
      await this.executionPlanner.createExecutionPlan(
        dag,
        context,
        availableResources
      );

       // Execute the DAG using parallel executor
       const parallelResult = await this.parallelExecutor.executeDAG(
         dag,
         async (nodeId: string, _outputs: Record<string, ExecutionResult>) => {
           // Convert ExecutionResult to NodeInput format
           // Get the node or create a default reasoning node
           const node = dag.nodes[nodeId];
           if (node) {
             return this.prepareNodeInput(node, task, context);
           } else {
             // Create a default reasoning node
             const defaultNode = this.createReasoningNode(nodeId, task.input, context);
             return this.prepareNodeInput(defaultNode, task, context);
           }
         }
       );

      // Update task state based on parallel execution result
      if (parallelResult.status === 'failed') {
        this.taskStates.set(task.id || '', TaskStatus.FAILED);
      } else {
        this.taskStates.set(task.id || '', TaskStatus.COMPLETED);
      }

      // Convert parallel result to ExecutionResult format
      return {
        taskId: task.id || '',
        status: parallelResult.status === 'completed' ? TaskStatus.COMPLETED : TaskStatus.FAILED,
        output: this.aggregateOutputsFromParallelResult(Object.keys(dag.nodes), parallelResult.nodeOutputs),
        error: parallelResult.status === 'failed' ? 'One or more nodes failed' : undefined,
        metrics: {
          totalNodes: parallelResult.metrics.totalNodes,
          completedNodes: parallelResult.metrics.completedNodes,
          failedNodes: parallelResult.metrics.failedNodes,
          totalTokens: 0, // Would need to extract from node outputs
          totalLatencyMs: parallelResult.metrics.totalExecutionTimeMs,
          cacheHits: 0
        },
        nodeOutputs: parallelResult.nodeOutputs as unknown as Record<string, NodeOutput>
      };
    } catch (error) {
      // Handle error with error handler
      const handledError = this.errorHandler.handleError(error, null, {});
      
      this.taskStates.set(task.id || '', TaskStatus.FAILED);
      
      return {
        taskId: task.id || '',
        status: TaskStatus.FAILED,
        output: null,
        error: handledError.reason,
        metrics: this.calculateMetrics(Date.now()),
        nodeOutputs: Object.fromEntries(this.nodeOutputs),
      };
    }
  }

  /**
   * Execute a task using sequential execution (original Phase 2 behavior)
   */
  private async executeSequential(
    dag: EnhancedDAG,
    task: Task,
    context: ExecutionContext,
    startTime: number
  ): Promise<ExecutionResult> {
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
        taskId: task.id || '',
      });

      this.nodeOutputs.set(nodeId, output);

      // Handle node failure
      if (output.status === 'failed') {
        this.taskStates.set(task.id || '', TaskStatus.FAILED);
        
        return {
          taskId: task.id || '',
          status: TaskStatus.FAILED,
          output: null,
          error: `Node "${nodeId}" failed: ${output.error}`,
          metrics: this.calculateMetrics(startTime),
          nodeOutputs: Object.fromEntries(this.nodeOutputs),
        };
      }
    }

    // All nodes completed successfully
    this.taskStates.set(task.id || '', TaskStatus.COMPLETED);

    // Aggregate outputs
    const finalOutput = this.aggregateOutputs(sortedNodes);

    return {
      taskId: task.id || '',
      status: TaskStatus.COMPLETED,
      output: finalOutput,
      metrics: this.calculateMetrics(startTime),
      nodeOutputs: Object.fromEntries(this.nodeOutputs),
    };
  }

  /**
   * Register a node type with the orchestrator
   */
  registerNode(node: Node): void {
    this.attachToolInvoker(node);
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
   * Get context engine statistics
   * Useful for monitoring context preparation health
   */
  getContextStats(): { failures: number; successes: number; failureRate: number } {
    const total = this.contextPrepFailures + this.contextPrepSuccesses;
    return {
      failures: this.contextPrepFailures,
      successes: this.contextPrepSuccesses,
      failureRate: total > 0 ? this.contextPrepFailures / total : 0
    };
  }

  /**
   * Build DAG from task
   */
  private buildDAG(task: Task, context: ExecutionContext): EnhancedDAG {
    const explicitDAG = this.getExplicitDAG(task);
    if (explicitDAG) {
      return this.hydrateToolNodes(explicitDAG);
    }

    // For Phase 2, create a simple single-node DAG
    // In Phase 3+, this will parse task.graph or create from task.type
    
    const builder = DAGBuilder.create();

    // Create a reasoning node based on task input
    const nodeId = `reasoning-${task.id || uuidv4()}`;
    const reasoningNode = this.createReasoningNode(nodeId, task.input, context);

    builder.addNode(reasoningNode);
    builder.setMetadata('taskId', task.id);

    // Build the DAG and enhance with Phase 3 metadata
    const dag = builder.build();
    const enhancedDAG: EnhancedDAG = {
      ...dag,
      metadata: {
        ...dag.metadata,
        parallelGroups: [],
        subgraphs: [],
      },
    };

    return enhancedDAG;
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
      type: NodeType.REASONING,
      name: 'Reasoning Node',
      config: {
        timeout: this.config.defaultTimeout,
      },
      execute: async (_nodeInput: NodeInput): Promise<NodeOutput> => {
        const startTime = new Date();

        try {
          // Get model from router or use default
          let provider = null;
          
          if (this.router) {
            const selection = await this.router.selectModel({
              model: '',
              messages: [
                { role: MessageRole.USER, content: prompt }
              ],
              config: { role: ModelRole.REASONING },
            });
            provider = selection.provider;
          }

          if (!provider) {
            throw new Error('No model provider available');
          }

          const response = await provider.complete({
            model: '',
            messages: [
              { role: MessageRole.USER, content: prompt }
            ],
            config: {
              role: ModelRole.REASONING,
              temperature: 0.7,
              maxTokens: 4096,
            },
          });

          return {
            nodeId,
            data: response.content,
            status: NodeStatus.COMPLETED,
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
            status: NodeStatus.FAILED,
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
        capabilities: context.capabilities,
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
   * Aggregate outputs from parallel execution result
   */
  private aggregateOutputsFromParallelResult(nodeIds: string[], nodeOutputs: Record<string, ExecutionResult>): unknown {
    if (nodeIds.length === 0) {
      return null;
    }

    // For single node, return its output
    if (nodeIds.length === 1) {
      const output = nodeOutputs[nodeIds[0]];
      return output?.output ?? null;
    }

    // For multiple nodes, aggregate into an object
    const aggregated: Record<string, unknown> = {};
    for (const nodeId of nodeIds) {
      const output = nodeOutputs[nodeId];
      if (output) {
        aggregated[nodeId] = output.output;
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

  private getExplicitDAG(task: Task): EnhancedDAG | null {
    const dagCandidate = task.metadata?.dag;
    if (!this.isEnhancedDAG(dagCandidate)) {
      return null;
    }

    return dagCandidate;
  }

  private isEnhancedDAG(value: unknown): value is EnhancedDAG {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<EnhancedDAG>;
    return typeof candidate.id === 'string' &&
      typeof candidate.nodes === 'object' &&
      candidate.nodes !== null &&
      Array.isArray(candidate.edges);
  }

  private attachToolInvoker(node: Node): void {
    if (!this.toolInvoker || !(node instanceof ToolNode) || node.hasInvoker()) {
      return;
    }

    node.setInvoker(this.toolInvoker);
  }

  private hydrateToolNode(node: Node): Node {
    if (node instanceof ToolNode) {
      this.attachToolInvoker(node);
      return node;
    }

    if (node.type !== NodeType.TOOL) {
      return node;
    }

    const config = node.config as {
      toolId?: string;
      toolName?: string;
      inputMapping?: Record<string, string>;
    };

    if (!config.toolId || !config.toolName) {
      return node;
    }

    return new ToolNode({
      id: node.id,
      name: node.name,
      toolId: config.toolId,
      toolName: config.toolName,
      inputMapping: config.inputMapping,
      config: node.config,
      invoker: this.toolInvoker ?? undefined
    });
  }

  private hydrateToolNodes(dag: EnhancedDAG): EnhancedDAG {
    const nodes: Record<string, Node> = {};

    for (const [nodeId, node] of Object.entries(dag.nodes)) {
      nodes[nodeId] = this.hydrateToolNode(node);
    }

    return {
      ...dag,
      nodes
    };
  }
}

/**
 * Create an orchestrator with default configuration
 */
export function createOrchestrator(config?: OrchestratorConfig): Orchestrator {
  return new MinimalOrchestrator(config);
}
