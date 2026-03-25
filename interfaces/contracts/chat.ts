/**
 * Chat Contracts for Nexus
 *
 * Defines the master chat request, plan, and execution result shapes.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatRequest {
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
  context?: string[];
}

export interface ChatPlanStep {
  id: string;
  title: string;
  description: string;
  toolId?: string;
  status: 'planned' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface ChatPlan {
  summary: string;
  steps: ChatPlanStep[];
  selectedTools: string[];
}

export interface ChatToolRun {
  toolId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: 'running' | 'completed' | 'failed';
  durationMs?: number;
  error?: string;
}

export interface ChatResponse {
  taskId: string;
  conversationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  plan?: ChatPlan;
}
