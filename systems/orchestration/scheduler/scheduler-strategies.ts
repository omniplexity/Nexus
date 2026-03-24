/**
 * Scheduler Strategies and Interfaces
 * 
 * Defines the core scheduler interfaces, strategies, and data structures
 * for intelligent task scheduling in the orchestration system.
 */

/**
 * Scheduler decision representing what to execute next
 */
export interface SchedulerDecision {
  /**
   * Task/node IDs that are ready to execute
   */
  readyToExecute: string[];
  
  /**
   * Recommended execution order or groups
   * Each group can execute in parallel
   */
  executionGroups: string[][];
  
  /**
   * Priority weighting for each ready task (higher = more important)
   */
  priorityWeights: Record<string, number>;
  
  /**
   * Resource requirements for each ready task
   */
  resourceRequirements: Record<string, {
    cpu?: number;      // CPU cores required
    memory?: number;   // Memory in MB
    tokens?: number;   // Estimated token consumption
  }>;
  
  /**
   * Estimated duration for each task (milliseconds)
   */
  estimatedDurationMs: Record<string, number>;
  
  /**
   * Metadata about the scheduling decision
   */
  metadata: Record<string, unknown>;
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /**
   * Enable priority-based scheduling
   */
  enablePriority: boolean;
  
  /**
   * Enable resource-aware scheduling
   */
  enableResourceAwareness: boolean;
  
  /**
   * Default priority for tasks without explicit priority
   */
  defaultPriority: number;
  
  /**
   * Maximum scheduling lookahead (how many ready tasks to consider)
   */
  maxLookahead: number;
  
  /**
   * Enable work-stealing for load balancing
   */
  enableWorkStealing: boolean;
  
  /**
   * Scheduling algorithm to use
   */
  algorithm: 'priority' | 'resource' | 'hybrid' | 'deadline' | 'fair-share';
}

/**
 * Core scheduler interface
 */
export interface Scheduler {
  /**
   * Make a scheduling decision based on the current state
   * @param readyTasks Tasks that are ready to execute (dependencies satisfied)
   * @param dag The execution DAG
   * @param availableResources Currently available system resources
   * @param executionContext Current execution context
   * @returns Scheduling decision
   */
  makeDecision(
    readyTasks: string[],
    dag: import('@nexus/systems/orchestration/engine/types').EnhancedDAG,
    availableResources: {
      cpu: number;
      memory: number;
      tokens: number;
    },
    executionContext: import('@nexus/core/contracts/orchestrator').ExecutionContext
  ): SchedulerDecision;
  
  /**
   * Update scheduler state after task execution
   * @param taskId ID of the task that completed/failed
   * @param result Execution result
   */
  updateState(
    taskId: string,
    result: import('@nexus/core/contracts/orchestrator').ExecutionResult
  ): void;
  
  /**
   * Reset scheduler state
   */
  reset(): void;
}

/**
 * Base scheduler implementation with common functionality
 */
export abstract class BaseScheduler implements Scheduler {
  protected config: SchedulerConfig;
  protected taskPriorities: Map<string, number>;
  protected taskResourceUsage: Map<string, {
    cpu: number;
    memory: number;
    tokens: number;
    durationMs: number;
  }>;
  protected executionHistory: Array<{
    taskId: string;
    timestamp: number;
    durationMs: number;
    success: boolean;
  }>;
  
  constructor(config: SchedulerConfig) {
    this.config = config;
    this.taskPriorities = new Map();
    this.taskResourceUsage = new Map();
    this.executionHistory = [];
  }
  
  /**
   * Get priority for a task (from config, history, or default)
   */
  protected getTaskPriority(taskId: string): number {
    // Check if we have historical priority data
    if (this.taskPriorities.has(taskId)) {
      return this.taskPriorities.get(taskId)!;
    }
    
    // Return default priority
    return this.config.defaultPriority;
  }
  
  /**
   * Update priority for a task based on execution results
   */
  protected updateTaskPriority(
    taskId: string,
    result: import('@nexus/core/contracts/orchestrator').ExecutionResult
  ): void {
    const currentPriority = this.getTaskPriority(taskId);
    
    // Simple priority adjustment: increase for success, decrease for failure
    const adjustment = result.status === 'completed' ? 1 : -1;
    const newPriority = Math.max(1, currentPriority + adjustment);
    
    this.taskPriorities.set(taskId, newPriority);
  }
  
  /**
   * Record resource usage for a task
   */
  protected recordResourceUsage(
    taskId: string,
    cpu: number,
    memory: number,
    tokens: number,
    durationMs: number
  ): void {
    this.taskResourceUsage.set(taskId, {
      cpu,
      memory,
      tokens,
      durationMs
    });
  }
  
  /**
   * Get average resource usage for a task type
   */
  protected getAverageResourceUsage(
    taskType: string
  ): { cpu: number; memory: number; tokens: number } | null {
    const usages = Array.from(this.taskResourceUsage.entries())
      .filter(([taskId]) => taskId.startsWith(taskType))
      .map(([, usage]) => usage);
    
    if (usages.length === 0) {
      return null;
    }
    
    const avgCpu = usages.reduce((sum, u) => sum + u.cpu, 0) / usages.length;
    const avgMemory = usages.reduce((sum, u) => sum + u.memory, 0) / usages.length;
    const avgTokens = usages.reduce((sum, u) => sum + u.tokens, 0) / usages.length;
    
    return { cpu: avgCpu, memory: avgMemory, tokens: avgTokens };
  }
  
  /**
   * Add to execution history
   */
  protected addToHistory(
    taskId: string,
    timestamp: number,
    durationMs: number,
    success: boolean
  ): void {
    this.executionHistory.push({
      taskId,
      timestamp,
      durationMs,
      success
    });
    
    // Keep only last 1000 entries
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }
  
  /**
   * Abstract method to make scheduling decision - must be implemented by subclasses
   */
  abstract makeDecision(
    readyTasks: string[],
    dag: import('@nexus/systems/orchestration/engine/types').EnhancedDAG,
    availableResources: {
      cpu: number;
      memory: number;
      tokens: number;
    },
    executionContext: import('@nexus/core/contracts/orchestrator').ExecutionContext
  ): SchedulerDecision;
  
  /**
   * Update scheduler state after task execution
   */
  updateState(
    taskId: string,
    result: import('@nexus/core/contracts/orchestrator').ExecutionResult
  ): void {
    // Update priority based on result
    this.updateTaskPriority(taskId, result);
    
    // Record execution in history
    const durationMs = result.metrics?.totalLatencyMs || 0;
    this.addToHistory(
      taskId,
      Date.now(),
      durationMs,
      result.status === 'completed'
    );
  }
  
  /**
   * Reset scheduler state
   */
  reset(): void {
    this.taskPriorities.clear();
    this.taskResourceUsage.clear();
    this.executionHistory = [];
  }
}