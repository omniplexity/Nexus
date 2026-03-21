/**
 * Node Contracts for Nexus
 * 
 * Defines the DAG node types and execution interfaces
 * for the orchestration graph system.
 */

/**
 * Node type enumeration
 */
export enum NodeType {
  REASONING = 'reasoning',    // LLM call node
  TOOL = 'tool',              // Tool execution node
  MEMORY = 'memory',          // Memory retrieval/storage node
  CONTROL = 'control',        // Control flow node (branch, loop, retry)
  AGGREGATOR = 'aggregator',  // Merges multiple inputs
  TRANSFORM = 'transform',    // Data transformation node
  CONDITIONAL = 'conditional' // Conditional routing node
}

/**
 * Node status
 */
export enum NodeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * Retry configuration for node execution
 */
export interface RetryConfig {
  maxAttempts: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  backoffMs: number;
  retryableErrors?: string[];
}

/**
 * Node configuration
 */
export interface NodeConfig {
  timeout?: number;
  retry?: RetryConfig;
  cache?: boolean;
  condition?: string;
  priority?: number;
}

/**
 * Input to a node
 */
export interface NodeInput {
  nodeId: string;
  data: unknown;
  /**
   * Dependencies keyed by node ID
   * Using Record for JSON serializability instead of Map
   */
  dependencies: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/**
 * Output from a node
 */
export interface NodeOutput {
  nodeId: string;
  data: unknown;
  status: NodeStatus;
  error?: string;
  metadata: {
    startTime: Date;
    endTime: Date;
    tokensUsed?: number;
    cacheHit?: boolean;
  };
}

/**
 * Base node interface
 * @version 1.0.0
 */
export interface Node {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  
  /**
   * Execute the node with the given input
   */
  execute(input: NodeInput): Promise<NodeOutput>;
  
  /**
   * Validate node configuration
   */
  validate(): boolean;
  
  /**
   * Get the node's dependencies
   */
  getDependencies(): string[];
  
  /**
   * Clone the node for reuse
   */
  clone(): Node;
}

/**
 * Reasoning node configuration (LLM calls)
 */
export interface ReasoningNodeConfig extends NodeConfig {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  systemPrompt?: string;
}

/**
 * Tool node configuration
 */
export interface ToolNodeConfig extends NodeConfig {
  toolId: string;
  toolName: string;
  inputMapping?: Record<string, string>;
}

/**
 * Memory node configuration
 */
export interface MemoryNodeConfig extends NodeConfig {
  operation: 'retrieve' | 'store' | 'delete';
  memoryType?: string;
  query?: string;
  priority?: number;
  limit?: number;
}

/**
 * Control node configuration
 */
export interface ControlNodeConfig extends NodeConfig {
  controlType: 'branch' | 'loop' | 'retry' | 'parallel';
  condition?: string;
  maxIterations?: number;
  branchId?: string;
}

/**
 * Aggregator node configuration
 */
export interface AggregatorNodeConfig extends NodeConfig {
  strategy: 'concat' | 'merge' | 'override' | 'custom';
  customFunction?: string;
}

/**
 * Transform node configuration
 */
export interface TransformNodeConfig extends NodeConfig {
  transformType: 'map' | 'filter' | 'reduce' | 'custom';
  transformFunction: string;
  schema?: Record<string, unknown>;
}

/**
 * Conditional node configuration
 */
export interface ConditionalNodeConfig extends NodeConfig {
  condition: string;
  trueBranchId: string;
  falseBranchId: string;
}

/**
 * Node factory for creating nodes
 */
export interface NodeFactory {
  createReasoningNode(config: ReasoningNodeConfig): Node;
  createToolNode(config: ToolNodeConfig): Node;
  createMemoryNode(config: MemoryNodeConfig): Node;
  createControlNode(config: ControlNodeConfig): Node;
  createAggregatorNode(config: AggregatorNodeConfig): Node;
  createTransformNode(config: TransformNodeConfig): Node;
  createConditionalNode(config: ConditionalNodeConfig): Node;
}

/**
 * Node executor for running nodes
 */
export interface NodeExecutor {
  execute(node: Node, input: NodeInput): Promise<NodeOutput>;
  
  /**
   * Cancel a running node
   */
  cancel(nodeId: string): void;
  
  /**
   * Get node status
   */
  getStatus(nodeId: string): NodeStatus | null;
}

/**
 * Node metadata for visualization
 */
export interface NodeMetadata {
  position?: { x: number; y: number };
  color?: string;
  description?: string;
  icon?: string;
}
