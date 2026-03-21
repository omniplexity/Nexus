/**
 * Core Event Types for Nexus
 * 
 * Event system for inter-component communication and state changes.
 * All events should use these types for consistency.
 */

// Event namespaces to avoid conflicts
export enum EventNamespace {
  ORCHESTRATION = 'orchestration',
  NODE = 'node',
  TOOL = 'tool',
  MEMORY = 'memory',
  MODEL = 'model',
  CONTEXT = 'context',
  RUNTIME = 'runtime',
  AGENT = 'agent',
  SYSTEM = 'system'
}

// Base event priorities
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Base event interface
 */
export interface BaseEvent<T = unknown> {
  id: string;
  namespace: EventNamespace;
  type: string;
  timestamp: Date;
  payload: T;
  source?: string;
  priority: EventPriority;
}

/**
 * Event payload for orchestration events
 */
export interface OrchestrationEventPayload {
  taskId: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

/**
 * Event payload for node execution
 */
export interface NodeEventPayload {
  nodeId: string;
  taskId: string;
  status: 'started' | 'completed' | 'failed';
  output?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Event payload for tool execution
 */
export interface ToolEventPayload {
  toolId: string;
  toolName: string;
  status: 'started' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Event payload for memory operations
 */
export interface MemoryEventPayload {
  operation: 'retrieve' | 'store' | 'clear' | 'update';
  memoryId?: string;
  sessionId?: string;
  success: boolean;
  itemCount?: number;
  error?: string;
}

/**
 * Event payload for model operations
 */
export interface ModelEventPayload {
  providerId: string;
  modelId: string;
  operation: 'request' | 'response' | 'error';
  tokensUsed?: number;
  latency?: number;
  error?: string;
}

/**
 * Event payload for context operations
 */
export interface ContextEventPayload {
  operation: 'compress' | 'expand' | 'slice' | 'cache';
  sessionId: string;
  tokensBefore?: number;
  tokensAfter?: number;
  success: boolean;
  error?: string;
}

/**
 * Event payload for runtime events
 */
export interface RuntimeEventPayload {
  operation: string;
  status: 'started' | 'stopped' | 'error';
  processId?: number;
  error?: string;
}

/**
 * Event payload for agent events
 */
export interface AgentEventPayload {
  agentId: string;
  agentType: string;
  status: 'created' | 'started' | 'paused' | 'stopped' | 'error';
  message?: string;
  error?: string;
}

/**
 * Event listener signature
 */
export type EventListener<T = unknown> = (event: BaseEvent<T>) => void | Promise<void>;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  on<T = unknown>(event: string, listener: EventListener<T>): void;
  once<T = unknown>(event: string, listener: EventListener<T>): void;
  off<T = unknown>(event: string, listener: EventListener<T>): void;
  emit<T = unknown>(event: BaseEvent<T>): void;
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxListeners?: number;
  enableLogging?: boolean;
  enablePersistence?: boolean;
  flushInterval?: number;
}

/**
 * Event subscription for cleanup
 */
export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * System health event payload
 */
export interface SystemHealthEventPayload {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    cpu?: number;
    memory?: number;
    latency?: number;
    errorRate?: number;
  };
  timestamp: Date;
}

/**
 * Event types enum for type safety
 */
export const EventTypes = {
  // Orchestration events
  ORCHESTRATION_STARTED: 'orchestration:started',
  ORCHESTRATION_PROGRESS: 'orchestration:progress',
  ORCHESTRATION_COMPLETED: 'orchestration:completed',
  ORCHESTRATION_FAILED: 'orchestration:failed',
  
  // Node events
  NODE_STARTED: 'node:started',
  NODE_COMPLETED: 'node:completed',
  NODE_FAILED: 'node:failed',
  
  // Tool events
  TOOL_STARTED: 'tool:started',
  TOOL_COMPLETED: 'tool:completed',
  TOOL_FAILED: 'tool:failed',
  
  // Memory events
  MEMORY_RETRIEVED: 'memory:retrieved',
  MEMORY_STORED: 'memory:stored',
  MEMORY_CLEARED: 'memory:cleared',
  MEMORY_ERROR: 'memory:error',
  
  // Model events
  MODEL_REQUEST: 'model:request',
  MODEL_RESPONSE: 'model:response',
  MODEL_ERROR: 'model:error',
  
  // Context events
  CONTEXT_COMPRESSED: 'context:compressed',
  CONTEXT_EXPANDED: 'context:expanded',
  CONTEXT_ERROR: 'context:error',
  
  // Runtime events
  RUNTIME_STARTED: 'runtime:started',
  RUNTIME_STOPPED: 'runtime:stopped',
  RUNTIME_ERROR: 'runtime:error',
  
  // Agent events
  AGENT_CREATED: 'agent:created',
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  
  // System events
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_SHUTDOWN: 'system:shutdown'
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];
