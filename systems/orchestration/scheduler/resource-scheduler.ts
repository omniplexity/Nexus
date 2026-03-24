/**
 * Resource-Aware Scheduler Implementation
 * 
 * Implements resource-aware task scheduling that considers CPU, memory, and token
 * constraints when making scheduling decisions.
 */

import { NodeType } from '@nexus/core/contracts/node';

import { BaseScheduler } from './scheduler-strategies';
import type { Scheduler, SchedulerConfig, SchedulerDecision } from './scheduler-strategies';

/**
 * Resource scheduler configuration
 */
export interface ResourceSchedulerConfig extends SchedulerConfig {
  /**
   * Enable resource prediction based on historical usage
   */
  enableResourcePrediction: boolean;
  
  /**
   * Resource safety margin (percentage to reserve for system overhead)
   */
  resourceSafetyMargin: number; // 0.1 = 10% margin
  
  /**
   * Enable resource borrowing (allow tasks to exceed limits if resources are available)
   */
  enableResourceBorrowing: boolean;
  
  /**
   * Resource renewal rate (how often resource availability is recalculated)
   */
  resourceRenewalRateMs: number;
}

/**
 * Resource-aware scheduler that considers system resources when scheduling
 */
export class ResourceScheduler extends BaseScheduler implements Scheduler {
  private readonly _config: ResourceSchedulerConfig;
  private readonly resourceHistory: Array<{
    timestamp: number;
    cpu: number;
    memory: number;
    tokens: number;
  }>;
  private lastResourceRenewal: number;
  
  constructor(config: ResourceSchedulerConfig) {
    super(config);
    this._config = config;
    this.resourceHistory = [];
    this.lastResourceRenewal = Date.now();
  }

  /**
   * Make a scheduling decision based on available resources
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
  ): SchedulerDecision {
    // Renew resource availability if needed
    this.renewResourceAvailability(availableResources);
    
    // Estimate resource requirements for each ready task
    const taskRequirements: Record<string, {
      cpu: number;
      memory: number;
      tokens: number;
      durationMs: number;
    }> = {};
    
    for (const taskId of readyTasks) {
      const requirements = this.estimateTaskRequirements(taskId, dag, executionContext);
      taskRequirements[taskId] = requirements;
    }
    
    // Sort tasks by priority first, then by resource efficiency
    const sortedTasks = [...readyTasks].sort((a, b) => {
      const priorityA = this.getTaskPriority(a);
      const priorityB = this.getTaskPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // If priorities are equal, sort by resource efficiency (lower resource usage first)
      const efficiencyA = this.calculateResourceEfficiency(taskRequirements[a]);
      const efficiencyB = this.calculateResourceEfficiency(taskRequirements[b]);
      return efficiencyA - efficiencyB; // Lower efficiency score first (more efficient)
    });
    
    // Group tasks that can run in parallel based on resource constraints
    const executionGroups: string[][] = [];
    const currentGroup: string[] = [];
    let currentGroupCpu = 0;
    let currentGroupMemory = 0;
    let currentGroupTokens = 0;
    
    for (const taskId of sortedTasks) {
      const req = taskRequirements[taskId];
      
      // Check if adding this task would exceed resource limits
      const wouldExceedCpu = currentGroupCpu + req.cpu > availableResources.cpu;
      const wouldExceedMemory = currentGroupMemory + req.memory > availableResources.memory;
      const wouldExceedTokens = currentGroupTokens + req.tokens > availableResources.tokens;
      
      if (
        (currentGroup.length > 0 && (wouldExceedCpu || wouldExceedMemory || wouldExceedTokens)) ||
        (!this._config.enableResourceBorrowing && (wouldExceedCpu || wouldExceedMemory || wouldExceedTokens))
      ) {
        // Start a new group
        if (currentGroup.length > 0) {
          executionGroups.push([...currentGroup]);
        }
        currentGroup.length = 0;
        currentGroupCpu = 0;
        currentGroupMemory = 0;
        currentGroupTokens = 0;
      }
      
      // Add task to current group
      currentGroup.push(taskId);
      currentGroupCpu += req.cpu;
      currentGroupMemory += req.memory;
      currentGroupTokens += req.tokens;
    }
    
    // Add the last group if it has tasks
    if (currentGroup.length > 0) {
      executionGroups.push([...currentGroup]);
    }
    
    // Calculate priority weights (higher priority = higher weight)
    const priorityWeights: Record<string, number> = {};
    for (const taskId of readyTasks) {
      priorityWeights[taskId] = this.getTaskPriority(taskId);
    }
    
    // Prepare resource requirements and duration estimates for output
    const resourceRequirements: Record<string, {
      cpu?: number;
      memory?: number;
      tokens?: number;
    }> = {};
    const estimatedDurationMs: Record<string, number> = {};
    
    for (const taskId of readyTasks) {
      const req = taskRequirements[taskId];
      resourceRequirements[taskId] = {
        cpu: req.cpu,
        memory: req.memory,
        tokens: req.tokens
      };
      estimatedDurationMs[taskId] = req.durationMs;
    }
    
    return {
      readyToExecute: [...readyTasks],
      executionGroups,
      priorityWeights,
      resourceRequirements,
      estimatedDurationMs,
      metadata: {
        schedulerType: 'resource',
        timestamp: Date.now(),
        readyTaskCount: readyTasks.length,
        resourcePredictionEnabled: this._config.enableResourcePrediction,
        availableResources: { ...availableResources }
      }
    };
  }
  
  /**
   * Estimate resource requirements for a task
   */
  private estimateTaskRequirements(
    taskId: string,
    dag: import('@nexus/systems/orchestration/engine/types').EnhancedDAG,
    _executionContext: import('@nexus/core/contracts/orchestrator').ExecutionContext
  ): {
    cpu: number;
    memory: number;
    tokens: number;
    durationMs: number;
  } {
    // Get task node from DAG
    const taskNode = dag.nodes[taskId];
    
    // Use historical data if available and prediction is enabled
    if (this._config.enableResourcePrediction) {
      const historicalUsage = this.taskResourceUsage.get(taskId);
      if (historicalUsage) {
        return {
          cpu: Math.max(1, historicalUsage.cpu),
          memory: Math.max(64, historicalUsage.memory),
          tokens: Math.max(100, historicalUsage.tokens),
          durationMs: historicalUsage.durationMs
        };
      }
    }
    
    // Estimate based on node type
    if (taskNode) {
      switch (taskNode.type) {
        case NodeType.REASONING:
          return {
            cpu: 2, // Reasoning nodes need more CPU for LLM processing
            memory: 512, // 512 MB for model context
            tokens: 2000, // Estimated token consumption
            durationMs: 10000 // 10 seconds for LLM inference
          };
        case NodeType.TOOL:
          return {
            cpu: 1, // Tool nodes typically need moderate CPU
            memory: 256, // 256 MB for tool execution
            tokens: 500, // Lower token usage for tool execution
            durationMs: 5000 // 5 seconds for tool execution
          };
        case NodeType.MEMORY:
          return {
            cpu: 1, // Memory nodes need minimal CPU
            memory: 128, // 128 MB for memory operations
            tokens: 100, // Minimal token usage
            durationMs: 2000 // 2 seconds for memory operations
          };
        default:
          return {
            cpu: 1,
            memory: 256,
            tokens: 1000,
            durationMs: 5000
          };
      }
    }
    
    // Fallback defaults
    return {
      cpu: 1,
      memory: 256,
      tokens: 1000,
      durationMs: 5000
    };
  }
  
  /**
   * Calculate resource efficiency score for a task (lower is better)
   */
  private calculateResourceEfficiency(
    requirements: {
      cpu: number;
      memory: number;
      tokens: number;
      durationMs: number;
    }
  ): number {
    // Weighted sum of resource requirements (lower score = more efficient)
    // Normalize values to comparable scales
    const normalizedCpu = requirements.cpu * 100; // CPU cores * 100
    const normalizedMemory = requirements.memory / 10; // Memory in MB / 10
    const normalizedTokens = requirements.tokens / 1000; // Tokens / 1000
    const normalizedDuration = requirements.durationMs / 1000; // Duration in seconds
    
    return normalizedCpu + normalizedMemory + normalizedTokens + normalizedDuration;
  }
  
  /**
   * Renew resource availability based on historical trends
   */
  private renewResourceAvailability(
    currentAvailable: {
      cpu: number;
      memory: number;
      tokens: number;
    }
  ): void {
    const now = Date.now();
    
    // Renew based on configured rate
    if (now - this.lastResourceRenewal < this._config.resourceRenewalRateMs) {
      return;
    }
    
    this.lastResourceRenewal = now;
    
    // Record current resource availability
    this.resourceHistory.push({
      timestamp: now,
      cpu: currentAvailable.cpu,
      memory: currentAvailable.memory,
      tokens: currentAvailable.tokens
    });
    
    // Keep only last 100 entries
    while (this.resourceHistory.length > 100) {
      this.resourceHistory.shift();
    }
  }
  
  /**
   * Get predicted resource availability based on historical trends
   * @internal - Reserved for future implementation when resource prediction is needed
   * @returns Predicted resources or null if not enough data
   */
  public getPredictedResourceAvailability(): {
    cpu: number;
    memory: number;
    tokens: number;
  } | null {
    if (!this._config.enableResourcePrediction || this.resourceHistory.length < 10) {
      return null;
    }
    
    // Calculate average resource usage from history
    const avgCpu = this.resourceHistory.reduce((sum, entry) => sum + entry.cpu, 0) / this.resourceHistory.length;
    const avgMemory = this.resourceHistory.reduce((sum, entry) => sum + entry.memory, 0) / this.resourceHistory.length;
    const avgTokens = this.resourceHistory.reduce((sum, entry) => sum + entry.tokens, 0) / this.resourceHistory.length;
    
    // Predict availability as inverse of usage (simplified)
    // In a real system, this would be more sophisticated
    const predictedCpu = Math.max(1, 8 - avgCpu); // Assuming 8-core system
    const predictedMemory = Math.max(256, 4096 - avgMemory); // Assuming 4GB system
    const predictedTokens = Math.max(1000, 8000 - avgTokens); // Assuming 8K token limit
    
    return {
      cpu: predictedCpu,
      memory: predictedMemory,
      tokens: predictedTokens
    };
  }
  
  /**
   * Update scheduler state after task execution
   * Override to also record resource usage
   */
  updateState(
    taskId: string,
    result: import('@nexus/core/contracts/orchestrator').ExecutionResult
  ): void {
    super.updateState(taskId, result);
    
    // Estimate actual resource usage from result (simplified)
    const durationMs = result.metrics?.totalLatencyMs || 0;
    const estimatedCpu = 1; // Simplified assumption
    const estimatedMemory = 256; // Simplified assumption
    const estimatedTokens = result.metrics?.totalTokens || 1000;
    
    this.recordResourceUsage(taskId, estimatedCpu, estimatedMemory, estimatedTokens, durationMs);
  }
  
  /**
   * Reset scheduler state
   * Override to also clear resource history
   */
  reset(): void {
    super.reset();
    this.resourceHistory.length = 0;
    this.lastResourceRenewal = Date.now();
  }
}