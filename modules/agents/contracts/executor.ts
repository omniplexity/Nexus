/**
 * Agent Executor Contracts for Nexus
 * 
 * Defines the agent execution interfaces.
 */

import type { Agent, AgentRequest, AgentResponse } from './agent';

/**
 * Execution step
 */
export interface ExecutionStep {
  stepNumber: number;
  action: string;
  input: unknown;
  output: unknown;
  timestamp: Date;
  duration: number;
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  agentId: string;
  steps: ExecutionStep[];
  estimatedDuration?: number;
  requiredTools?: string[];
}

/**
 * Agent executor interface
 */
export interface AgentExecutor {
  /**
   * Execute an agent request
   */
  execute(agent: Agent, request: AgentRequest): Promise<AgentResponse>;
  
  /**
   * Create an execution plan
   */
  plan(agent: Agent, request: AgentRequest): Promise<ExecutionPlan>;
  
  /**
   * Cancel a running execution
   */
  cancel(agentId: string): Promise<void>;
  
  /**
   * Pause a running execution
   */
  pause(agentId: string): Promise<void>;
  
  /**
   * Resume a paused execution
   */
  resume(agentId: string): Promise<void>;
  
  /**
   * Get execution status
   */
  getStatus(agentId: string): ExecutionStatus | null;
}

/**
 * Execution status
 */
export interface ExecutionStatus {
  agentId: string;
  status: 'running' | 'paused' | 'cancelled' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps: number;
  startTime: Date;
  elapsedTime: number;
  output?: unknown;
  error?: string;
}

/**
 * Execution observer interface
 */
export interface ExecutionObserver {
  /**
   * Called when execution starts
   */
  onStart(agent: Agent): void;
  
  /**
   * Called when a step completes
   */
  onStepComplete(step: ExecutionStep): void;
  
  /**
   * Called when execution completes
   */
  onComplete(response: AgentResponse): void;
  
  /**
   * Called when an error occurs
   */
  onError(error: Error): void;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  steps: ExecutionStep[];
  metrics: {
    totalSteps: number;
    totalDuration: number;
    toolCalls: number;
  };
}
