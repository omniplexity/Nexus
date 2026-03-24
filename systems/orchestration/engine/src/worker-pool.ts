/**
 * Worker Pool Implementation
 * 
 * Provides a pool of workers for concurrent task execution with
 * resource management and load balancing capabilities.
 */

import type { Node } from '@nexus/core/contracts/node';
import type { ExecutionContext, ExecutionResult } from '@nexus/core/contracts/orchestrator';
import { TaskStatus } from '@nexus/core/contracts/orchestrator';

/**
 * Worker node representing a single worker in the pool
 */
export interface WorkerNode {
  id: string;
  /**
   * Current status of the worker
   */
  status: 'idle' | 'busy' | 'offline' | 'maintenance';
  /**
   * Currently assigned task (if any)
   */
  currentTask: string | null;
  /**
   * Resources currently allocated to this worker
   */
  allocatedResources: {
    cpu: number;
    memory: number;
    tokens: number;
  };
  /**
   * Timestamp when the worker became idle/busy
   */
  statusChangedAt: number;
  /**
   * Number of tasks processed by this worker
   */
  tasksProcessed: number;
  /**
   * Average task duration for this worker
   */
  averageDurationMs: number;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  /**
   * Number of workers in the pool
   */
  poolSize: number;
  /**
   * Maximum tasks a worker can queue before refusing new tasks
   */
  maxQueueSizePerWorker: number;
  /**
   * Enable automatic scaling based on workload
   */
  enableAutoScaling: boolean;
  /**
   * Minimum pool size when auto-scaling is enabled
   */
  minPoolSize: number;
  /**
   * Maximum pool size when auto-scaling is enabled
   */
  maxPoolSize: number;
  /**
   * Target utilization percentage for auto-scaling (0.0-1.0)
   */
  targetUtilization: number;
  /**
   * Enable worker health monitoring
   */
  enableHealthMonitoring: boolean;
  /**
   * Health check interval in milliseconds
   */
  healthCheckIntervalMs: number;
  /**
   * Maximum consecutive failures before marking worker as unhealthy
   */
  maxConsecutiveFailures: number;
}

/**
 * Worker pool interface
 */
export interface WorkerPool {
  /**
   * Submit a task for execution
   * @param taskId ID of the task to execute
   * @param node Node definition to execute
   * @param context Execution context for the task
   * @param requiredResources Resources required for task execution
   * @returns Promise that resolves when the task is accepted for execution
   */
  submitTask(
    taskId: string,
    node: Node,
    context: ExecutionContext,
    requiredResources: {
      cpu: number;
      memory: number;
      tokens: number;
    }
  ): Promise<void>;
  
  /**
   * Cancel a submitted task
   * @param taskId ID of the task to cancel
   * @returns Promise that resolves when the task is cancelled
   */
  cancelTask(taskId: string): Promise<void>;
  
  /**
   * Get current pool statistics
   * @returns Pool statistics including utilization, queue sizes, etc.
   */
  getStatistics(): {
    poolSize: number;
    idleWorkers: number;
    busyWorkers: number;
    offlineWorkers: number;
    utilization: number; // 0.0-1.0
    averageWaitTimeMs: number;
    tasksCompleted: number;
    tasksFailed: number;
    averageTaskDurationMs: number;
  };
  
  /**
   * Get detailed worker information
   * @returns Array of worker node information
   */
  getWorkers(): WorkerNode[];
  
  /**
   * Shutdown the worker pool
   * @param force If true, terminate all workers immediately; otherwise wait for current tasks
   * @returns Promise that resolves when the pool is shutdown
   */
  shutdown(force?: boolean): Promise<void>;
  
  /**
   * Wait for all submitted tasks to complete
   * @returns Promise that resolves when all tasks are completed
   */
  waitForCompletion(): Promise<void>;
}

/**
 * Base worker pool implementation with common functionality
 */
export class BaseWorkerPool implements WorkerPool {
  protected config: WorkerPoolConfig;
  protected workers: Map<string, WorkerNode>;
  protected taskQueue: Array<{
    taskId: string;
    node: Node;
    context: ExecutionContext;
    requiredResources: {
      cpu: number;
      memory: number;
      tokens: number;
    };
    submittedAt: number;
  }>;
  protected taskResults: Map<string, Promise<ExecutionResult>>;
  protected taskCompletionCallbacks: Map<string, (result: ExecutionResult) => void>;
  protected taskCancellationTokens: Map<string, () => void>;
  protected statistics: {
    tasksCompleted: number;
    tasksFailed: number;
    totalWaitTimeMs: number;
    totalTaskDurationMs: number;
  };
  protected autoScaleTimer: NodeJS.Timeout | null;
  protected healthCheckTimer: NodeJS.Timeout | null;
  
  constructor(config: WorkerPoolConfig) {
    this.config = config;
    this.workers = new Map();
    this.taskQueue = [];
    this.taskResults = new Map();
    this.taskCompletionCallbacks = new Map();
    this.taskCancellationTokens = new Map();
    this.statistics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalWaitTimeMs: 0,
      totalTaskDurationMs: 0
    };
    this.autoScaleTimer = null;
    this.healthCheckTimer = null;
    
    // Initialize workers
    this.initializeWorkers();
    
    // Start auto-scaling if enabled
    if (this.config.enableAutoScaling) {
      this.startAutoScaling();
    }
    
    // Start health monitoring if enabled
    if (this.config.enableHealthMonitoring) {
      this.startHealthMonitoring();
    }
  }
  
  /**
   * Initialize the worker pool with the configured number of workers
   */
  protected initializeWorkers(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      const workerId = `worker_${i}`;
      this.workers.set(workerId, {
        id: workerId,
        status: 'idle',
        currentTask: null,
        allocatedResources: { cpu: 0, memory: 0, tokens: 0 },
        statusChangedAt: Date.now(),
        tasksProcessed: 0,
        averageDurationMs: 0
      });
    }
  }
  
  /**
   * Start auto-scaling based on workload
   */
  protected startAutoScaling(): void {
    this.autoScaleTimer = setInterval(() => {
      this.adjustPoolSize();
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Stop auto-scaling
   */
  protected stopAutoScaling(): void {
    if (this.autoScaleTimer) {
      clearInterval(this.autoScaleTimer);
      this.autoScaleTimer = null;
    }
  }
  
  /**
   * Adjust pool size based on current workload
   */
  protected adjustPoolSize(): void {
    const stats = this.getStatistics();
    const utilization = stats.utilization;
    
    // Scale up if utilization is too high and we're below max pool size
    if (
      utilization > this.config.targetUtilization &&
      this.workers.size < this.config.maxPoolSize
    ) {
      this.addWorker();
    }
    // Scale down if utilization is too low and we're above min pool size
    else if (
      utilization < (this.config.targetUtilization * 0.5) &&
      this.workers.size > this.config.minPoolSize
    ) {
      this.removeWorker();
    }
  }
  
  /**
   * Add a worker to the pool
   */
  protected addWorker(): void {
    const workerId = `worker_${this.workers.size}`;
    this.workers.set(workerId, {
      id: workerId,
      status: 'idle',
      currentTask: null,
      allocatedResources: { cpu: 0, memory: 0, tokens: 0 },
      statusChangedAt: Date.now(),
      tasksProcessed: 0,
      averageDurationMs: 0
    });
  }
  
  /**
   * Remove a worker from the pool
   * @preferrably removes an idle worker
   */
  protected removeWorker(): void {
    // Find an idle worker to remove first
    let workerToRemove: string | null = null;
    
    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.status === 'idle') {
        workerToRemove = workerId;
        break;
      }
    }
    
    // If no idle workers found, remove the last worker
    if (!workerToRemove && this.workers.size > 0) {
      const workerIds = Array.from(this.workers.keys());
      workerToRemove = workerIds[workerIds.length - 1];
    }
    
    if (workerToRemove) {
      this.workers.delete(workerToRemove);
    }
  }
  
  /**
   * Start health monitoring for workers
   */
  protected startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);
  }
  
  /**
   * Stop health monitoring
   */
  protected stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  /**
   * Perform health checks on all workers
   */
  protected performHealthChecks(): void {
    // In a real implementation, this would check worker responsiveness
    // For now, we'll just update status based on consecutive failures
    // This is a simplified implementation
  }
  
  /**
   * Find the best worker for a task based on resource requirements and current load
   */
  protected findBestWorker(
    _requiredResources: {
      cpu: number;
      memory: number;
      tokens: number;
    }
  ): string | null {
    let bestWorkerId: string | null = null;
    let bestScore = -1;
    
    for (const [workerId, worker] of this.workers.entries()) {
      // Only consider idle workers
      if (worker.status !== 'idle') {
        continue;
      }
      
      // Check if worker has sufficient resources available
      // In a real implementation, we would check actual available resources
      // For now, we assume all workers have sufficient resources
      
      // Calculate a score based on worker efficiency (lower average duration is better)
      const score = worker.averageDurationMs > 0 ? 1000 / worker.averageDurationMs : 1000;
      
      if (score > bestScore) {
        bestScore = score;
        bestWorkerId = workerId;
      }
    }
    
    return bestWorkerId;
  }
  
  /**
   * Execute a task on a worker
   * @param workerId ID of the worker to execute the task on
   * @param taskId ID of the task to execute
   * @param node Node definition to execute
   * @param context Execution context for the task
   * @param requiredResources Resources required for task execution
   */
  protected executeTaskOnWorker(
    _workerId: string,
    _taskId: string,
    node: Node,
    context: ExecutionContext,
    _requiredResources: {
      cpu: number;
      memory: number;
      tokens: number;
    }
  ): Promise<ExecutionResult> {
    // Default implementation - execute node directly
    return node.execute({
      nodeId: node.id,
      data: null,
      dependencies: {},
      context: context as unknown as Record<string, unknown>
    }).then((output) => ({
      taskId: node.id,
      status: output.status === 'completed' ? TaskStatus.COMPLETED : TaskStatus.FAILED,
      output: output.data,
      error: output.error,
      metrics: {
        totalNodes: 1,
        completedNodes: output.status === 'completed' ? 1 : 0,
        failedNodes: output.status === 'failed' ? 1 : 0,
        totalTokens: output.metadata?.tokensUsed ?? 0,
        totalLatencyMs: output.metadata?.endTime && output.metadata?.startTime
          ? output.metadata.endTime.getTime() - output.metadata.startTime.getTime()
          : 0,
        cacheHits: 0
      },
      nodeOutputs: {}
    }));
  }
  
  /**
   * Handle task completion
   */
  protected handleTaskCompletion(
    workerId: string,
    taskId: string,
    result: ExecutionResult
  ): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }
    
    // Update worker status
    worker.status = 'idle';
    worker.currentTask = null;
    worker.statusChangedAt = Date.now();
    worker.tasksProcessed++;
    
    // Update average duration
    const taskDuration = result.metrics?.totalLatencyMs || 0;
    if (worker.tasksProcessed === 1) {
      worker.averageDurationMs = taskDuration;
    } else {
      // Running average
      worker.averageDurationMs = 
        ((worker.averageDurationMs * (worker.tasksProcessed - 1)) + taskDuration) / worker.tasksProcessed;
    }
    
    // Clear allocated resources
    worker.allocatedResources = { cpu: 0, memory: 0, tokens: 0 };
    
    // Update statistics
    if (result.status === 'completed') {
      this.statistics.tasksCompleted++;
    } else {
      this.statistics.tasksFailed++;
    }
    this.statistics.totalTaskDurationMs += taskDuration;
    
    // Resolve the task promise
    const callback = this.taskCompletionCallbacks.get(taskId);
    if (callback) {
      callback(result);
      this.taskCompletionCallbacks.delete(taskId);
    }
    
    // Clean up
    this.taskResults.delete(taskId);
    this.taskCancellationTokens.delete(taskId);
  }
  
  /**
   * Handle task cancellation
   */
  protected handleTaskCancellation(workerId: string, taskId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }
    
    // Update worker status
    worker.status = 'idle';
    worker.currentTask = null;
    worker.statusChangedAt = Date.now();
    
    // Clear allocated resources
    worker.allocatedResources = { cpu: 0, memory: 0, tokens: 0 };
    
    // Update statistics
    this.statistics.tasksFailed++; // Treat cancellation as failure for stats
    
    // Clean up
    this.taskResults.delete(taskId);
    this.taskCompletionCallbacks.delete(taskId);
    this.taskCancellationTokens.delete(taskId);
  }
  
  /**
   * Shutdown the worker pool
   */
  async shutdown(force: boolean = false): Promise<void> {
    // Stop auto-scaling and health monitoring
    this.stopAutoScaling();
    this.stopHealthMonitoring();
    
    if (force) {
      // Terminate all workers immediately
      this.workers.clear();
      this.taskQueue = [];
      
      // Reject all pending tasks
      for (const [taskId, _callback] of this.taskCompletionCallbacks.entries()) {
        // In a real implementation, we would reject the promises
        this.taskCompletionCallbacks.delete(taskId);
      }
      this.taskCompletionCallbacks.clear();
      
      // Clear all task promises
      this.taskResults.clear();
      this.taskCancellationTokens.clear();
    } else {
      // Wait for all current tasks to complete
      await this.waitForCompletion();
      
      // Then shutdown
      this.workers.clear();
      this.taskQueue = [];
      this.taskCompletionCallbacks.clear();
      this.taskResults.clear();
      this.taskCancellationTokens.clear();
    }
  }
  
  /**
   * Wait for all submitted tasks to complete
   */
  async waitForCompletion(): Promise<void> {
    // Wait for all task promises to settle
    if (this.taskResults.size > 0) {
      await Promise.allSettled(Array.from(this.taskResults.values()));
    }
  }

  /**
   * Submit a task for execution
   */
  async submitTask(
    taskId: string,
    node: Node,
    context: ExecutionContext,
    requiredResources: {
      cpu: number;
      memory: number;
      tokens: number;
    }
  ): Promise<void> {
    // Find the best worker for this task
    const workerId = this.findBestWorker(requiredResources);
    
    if (!workerId) {
      // No available worker, add to queue
      this.taskQueue.push({
        taskId,
        node,
        context,
        requiredResources,
        submittedAt: Date.now()
      });
      return;
    }
    
    // Assign task to worker
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }
    
    // Update worker status
    worker.status = 'busy';
    worker.currentTask = taskId;
    worker.allocatedResources = { ...requiredResources };
    worker.statusChangedAt = Date.now();
    
    // Create a promise for the task result
    let taskResolve!: (result: ExecutionResult) => void;
    
    const taskPromise = new Promise<ExecutionResult>((resolve, _reject) => {
      taskResolve = resolve;
    });
    
    this.taskResults.set(taskId, taskPromise);
    this.taskCompletionCallbacks.set(taskId, taskResolve);
    
    // Execute the task on the worker
    const taskExecution = this.executeTaskOnWorker(
      workerId,
      taskId,
      node,
      context,
      requiredResources
    );
    
    taskExecution
      .then((result) => {
        this.handleTaskCompletion(workerId, taskId, result);
      })
      .catch((error) => {
        this.handleTaskCompletion(workerId, taskId, {
          taskId,
          status: TaskStatus.FAILED,
          output: undefined,
          error: error instanceof Error ? error.message : String(error),
          metrics: {
            totalNodes: 1,
            completedNodes: 0,
            failedNodes: 1,
            totalTokens: 0,
            totalLatencyMs: 0,
            cacheHits: 0
          },
          nodeOutputs: {}
        });
      });
  }

  /**
   * Cancel a submitted task
   */
  async cancelTask(taskId: string): Promise<void> {
    // Check if task is in queue
    const queueIndex = this.taskQueue.findIndex((t) => t.taskId === taskId);
    if (queueIndex !== -1) {
      // Remove from queue
      this.taskQueue.splice(queueIndex, 1);
      this.statistics.tasksFailed++;
      return;
    }
    
    // Check if task is assigned to a worker
    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.currentTask === taskId) {
        // Get cancellation token
        const cancelToken = this.taskCancellationTokens.get(taskId);
        if (cancelToken) {
          cancelToken();
        }
        
        // Handle cancellation
        this.handleTaskCancellation(workerId, taskId);
        return;
      }
    }
    
    // Task not found - could be already completed or never submitted
  }

  /**
   * Get current pool statistics
   */
  getStatistics(): {
    poolSize: number;
    idleWorkers: number;
    busyWorkers: number;
    offlineWorkers: number;
    utilization: number;
    averageWaitTimeMs: number;
    tasksCompleted: number;
    tasksFailed: number;
    averageTaskDurationMs: number;
  } {
    let idleWorkers = 0;
    let busyWorkers = 0;
    let offlineWorkers = 0;
    
    for (const worker of this.workers.values()) {
      switch (worker.status) {
        case 'idle':
          idleWorkers++;
          break;
        case 'busy':
          busyWorkers++;
          break;
        case 'offline':
        case 'maintenance':
          offlineWorkers++;
          break;
      }
    }
    
    const totalWorkers = this.workers.size || 1;
    const utilization = busyWorkers / totalWorkers;
    
    // Calculate average wait time
    let totalWaitTime = 0;
    const queuedTasks = this.taskQueue.length;
    if (queuedTasks > 0) {
      const now = Date.now();
      for (const task of this.taskQueue) {
        totalWaitTime += now - task.submittedAt;
      }
    }
    const averageWaitTimeMs = queuedTasks > 0 ? totalWaitTime / queuedTasks : 0;
    
    // Calculate average task duration
    const averageTaskDurationMs = this.statistics.tasksCompleted > 0
      ? this.statistics.totalTaskDurationMs / this.statistics.tasksCompleted
      : 0;
    
    return {
      poolSize: this.workers.size,
      idleWorkers,
      busyWorkers,
      offlineWorkers,
      utilization,
      averageWaitTimeMs,
      tasksCompleted: this.statistics.tasksCompleted,
      tasksFailed: this.statistics.tasksFailed,
      averageTaskDurationMs
    };
  }

  /**
   * Get detailed worker information
   */
  getWorkers(): WorkerNode[] {
    return Array.from(this.workers.values());
  }
}