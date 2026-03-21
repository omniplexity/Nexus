/**
 * Nexus API Client
 * 
 * HTTP client for communicating with the Nexus API.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Client configuration
 */
export interface NexusClientConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
}

/**
 * Task creation request
 */
export interface CreateTaskRequest {
  input: unknown;
  type?: string;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Task execution response
 */
export interface TaskResponse {
  taskId: string;
  status: string;
  output?: unknown;
  error?: string;
  metrics?: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    totalTokens: number;
    totalLatencyMs: number;
    cacheHits: number;
  };
  nodeOutputs?: Record<string, unknown>;
}

/**
 * System status
 */
export interface SystemStatus {
  status?: string;
  version?: string;
  uptime?: number;
  models?: Array<{
    id: string;
    name: string;
    role?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
  }>;
}

/**
 * Nexus API Client
 */
export class NexusClient {
  private client: AxiosInstance;

  constructor(config: NexusClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });
  }

  /**
   * Create and execute a task
   */
  async createTask(request: CreateTaskRequest): Promise<TaskResponse> {
    try {
      const response = await this.client.post<TaskResponse>('/tasks', request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get task status
   */
  async getTask(taskId: string): Promise<TaskResponse> {
    try {
      const response = await this.client.get<TaskResponse>(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<SystemStatus> {
    try {
      const response = await this.client.get<SystemStatus>('/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<SystemStatus['models']> {
    try {
      const response = await this.client.get<{ models: SystemStatus['models'] }>('/models');
      return response.data.models;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      
      if (axiosError.response) {
        // Server responded with error
        const message = axiosError.response.data?.message || axiosError.response.data?.error || 'Unknown error';
        return new Error(`API Error (${axiosError.response.status}): ${message}`);
      } else if (axiosError.request) {
        // No response received
        return new Error('API Error: Unable to connect to server');
      }
    }
    
    // Unknown error
    return error instanceof Error ? error : new Error(String(error));
  }
}
