/**
 * Priority-Based Scheduler Implementation
 * 
 * Implements priority-based task scheduling where tasks with higher priority
 * are executed first, considering dependencies and resource constraints.
 */

import { BaseScheduler } from './scheduler-strategies';
import type { Scheduler, SchedulerConfig, SchedulerDecision } from './scheduler-strategies';

/**
 * Priority scheduler configuration
 */
export interface PrioritySchedulerConfig extends SchedulerConfig {
  /**
   * Enable priority aging (increase priority of waiting tasks over time)
   */
  enablePriorityAging: boolean;
  
  /**
   * Priority aging factor (how much to increase priority per time unit)
   */
  priorityAgingFactor: number;
  
  /**
   * Maximum priority boost from aging
   */
  maxPriorityBoost: number;
}

/**
 * Priority-based scheduler that prioritizes tasks based on priority levels
 */
export class PriorityScheduler extends BaseScheduler implements Scheduler {
  private readonly _config: PrioritySchedulerConfig;
  private readonly taskWaitTimes: Map<string, number>; // taskId -> timestamp when became ready
  
  constructor(config: PrioritySchedulerConfig) {
    super(config);
    this._config = config;
    this.taskWaitTimes = new Map();
  }
  
  /**
   * Make a scheduling decision based on priority
   */
  makeDecision(
    readyTasks: string[],
    dag: import('@nexus/systems/orchestration/engine/types').EnhancedDAG,
    _availableResources: {
      cpu: number;
      memory: number;
      tokens: number;
    },
    _executionContext: import('@nexus/core/contracts/orchestrator').ExecutionContext
  ): SchedulerDecision {
    // Update wait times for ready tasks
    const now = Date.now();
    for (const taskId of readyTasks) {
      if (!this.taskWaitTimes.has(taskId)) {
        this.taskWaitTimes.set(taskId, now);
      }
    }
    
    // Remove wait times for tasks that are no longer ready
    for (const [taskId, _waitTime] of this.taskWaitTimes.entries()) {
      if (!readyTasks.includes(taskId)) {
        this.taskWaitTimes.delete(taskId);
      }
    }
    
    // Calculate priority weights for each ready task
    const priorityWeights: Record<string, number> = {};
    const executionGroups: string[][] = [];
    
    // Group tasks by priority level
    const priorityGroups: Map<number, string[]> = new Map();
    
    for (const taskId of readyTasks) {
      let priority = this.getTaskPriority(taskId);
      
      // Apply priority aging if enabled
      if (this._config.enablePriorityAging && this.taskWaitTimes.has(taskId)) {
        const waitTimeMs = now - this.taskWaitTimes.get(taskId)!;
        const waitTimeSeconds = waitTimeMs / 1000;
        const priorityBoost = Math.min(
          this._config.maxPriorityBoost,
          waitTimeSeconds * this._config.priorityAgingFactor
        );
        priority += priorityBoost;
      }
      
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, []);
      }
      priorityGroups.get(priority)!.push(taskId);
      priorityWeights[taskId] = priority;
    }
    
    // Sort priorities in descending order (higher priority first)
    const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => b - a);
    
    // Create execution groups - each priority level can execute in parallel
    for (const priority of sortedPriorities) {
      const tasksAtPriority = priorityGroups.get(priority)!;
      executionGroups.push(tasksAtPriority);
    }
    
    // Estimate resource requirements and duration for each task
    const resourceRequirements: Record<string, {
      cpu?: number;
      memory?: number;
      tokens?: number;
    }> = {};
    const estimatedDurationMs: Record<string, number> = {};
    
    for (const taskId of readyTasks) {
      // Get task node from DAG
      const taskNode = dag.nodes[taskId];
      if (taskNode) {
        // Estimate based on node type and historical data
        resourceRequirements[taskId] = {
          cpu: 1, // Default 1 CPU core
          memory: 256, // Default 256 MB
          tokens: 1000 // Default 1000 tokens
        };
        
        // Use historical data if available
        const historicalUsage = this.taskResourceUsage.get(taskId);
        if (historicalUsage) {
          resourceRequirements[taskId] = {
            cpu: Math.max(1, historicalUsage.cpu),
            memory: Math.max(64, historicalUsage.memory),
            tokens: Math.max(100, historicalUsage.tokens)
          };
          estimatedDurationMs[taskId] = historicalUsage.durationMs;
        }
      } else {
        // Fallback defaults
        resourceRequirements[taskId] = {
          cpu: 1,
          memory: 256,
          tokens: 1000
        };
        estimatedDurationMs[taskId] = 5000; // Default 5 seconds
      }
    }
    
    return {
      readyToExecute: [...readyTasks],
      executionGroups,
      priorityWeights,
      resourceRequirements,
      estimatedDurationMs,
      metadata: {
        schedulerType: 'priority',
        timestamp: now,
        readyTaskCount: readyTasks.length,
        priorityAgingEnabled: this._config.enablePriorityAging
      }
    };
  }
  
  /**
   * Update scheduler state after task execution
   * Override to also clear wait times
   */
  updateState(
    taskId: string,
    result: import('@nexus/core/contracts/orchestrator').ExecutionResult
  ): void {
    super.updateState(taskId, result);
    // Clear wait time for completed task
    this.taskWaitTimes.delete(taskId);
  }
  
  /**
   * Reset scheduler state
   * Override to also clear wait times
   */
  reset(): void {
    super.reset();
    this.taskWaitTimes.clear();
  }
}