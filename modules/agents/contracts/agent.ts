/**
 * Agent Contracts for Nexus
 * 
 * Defines the agent interfaces for the agent system.
 */

import type { Task } from '../../../core/contracts/orchestrator';

/**
 * Agent status
 */
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * Agent type enumeration
 */
export enum AgentType {
  CONVERSATIONAL = 'conversational',
  TASK_ORIENTED = 'task_oriented',
  AUTONOMOUS = 'autonomous',
  ASSISTANT = 'assistant'
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  description: string;
  type: AgentType;
  model: string;
  maxIterations?: number;
  timeout?: number;
  tools?: string[];
  systemPrompt?: string;
}

/**
 * Agent state
 */
export interface AgentState {
  agentId: string;
  status: AgentStatus;
  currentTask?: string;
  iteration: number;
  memory: AgentMemory;
  context: Record<string, unknown>;
}

/**
 * Agent memory state
 */
export interface AgentMemory {
  shortTerm: unknown[];
  longTerm: unknown[];
  working: unknown[];
}

/**
 * Agent request
 */
export interface AgentRequest {
  agentId: string;
  input: string | Task;
  context?: Record<string, unknown>;
}

/**
 * Agent response
 */
export interface AgentResponse {
  agentId: string;
  success: boolean;
  output: unknown;
  error?: string;
  metrics: AgentMetrics;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  iterations: number;
  tokensUsed: number;
  latency: number;
  toolCalls: number;
  errors: number;
}

/**
 * Agent interface
 * @version 1.0.0
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  
  /** Agent configuration */
  config: AgentConfig;
  
  /** Current agent state */
  state: AgentState;
  
  /**
   * Start the agent
   */
  start(): Promise<void>;
  
  /**
   * Stop the agent
   */
  stop(): Promise<void>;
  
  /**
   * Pause the agent
   */
  pause(): Promise<void>;
  
  /**
   * Resume the agent
   */
  resume(): Promise<void>;
  
  /**
   * Process a request
   */
  process(request: AgentRequest): Promise<AgentResponse>;
  
  /**
   * Reset agent state
   */
  reset(): void;
  
  /**
   * Get agent status
   */
  getStatus(): AgentStatus;
}

/**
 * Agent factory interface
 */
export interface AgentFactory {
  /**
   * Create a new agent instance
   */
  create(config: AgentConfig): Agent;
  
  /**
   * Get agent type
   */
  getType(): AgentType;
}

/**
 * Agent descriptor for registration
 */
export interface AgentDescriptor {
  type: AgentType;
  factory: AgentFactory;
  description: string;
}
