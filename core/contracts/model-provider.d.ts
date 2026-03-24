export declare enum ModelRole {
    FAST = "fast",
    REASONING = "reasoning",
    SPECIALIZED = "specialized"
}
export declare enum ProviderStatus {
    AVAILABLE = "available",
    UNAVAILABLE = "unavailable",
    RATE_LIMITED = "rate_limited",
    DEGRADED = "degraded"
}
export declare enum MessageRole {
    SYSTEM = "system",
    USER = "user",
    ASSISTANT = "assistant",
    TOOL = "tool"
}
export interface Message {
    role: MessageRole;
    content: string;
    name?: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
}
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export interface ModelConfig {
    role: ModelRole;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stop?: string[];
    frequencyPenalty?: number;
    presencePenalty?: number;
    seed?: number;
}
export interface ModelRequest {
    model: string;
    messages: Message[];
    config?: ModelConfig;
    tools?: ToolDefinition[];
    stream?: boolean;
}
export interface ModelResponse {
    id: string;
    model: string;
    content: string;
    toolCalls?: ToolCall[];
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    latency: number;
}
export interface StreamingChunk {
    id: string;
    delta: string;
    finishReason?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}
export interface ModelProvider {
    id: string;
    name: string;
    status: ProviderStatus;
    complete(request: ModelRequest): Promise<ModelResponse>;
    completeWithStreaming(request: ModelRequest): AsyncIterable<StreamingChunk>;
    listModels(): Promise<ModelInfo[]>;
    healthCheck(): Promise<boolean>;
    getConfig(): ProviderConfig;
}
export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    role: ModelRole;
    contextWindow: number;
    maxOutputTokens: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
    pricing?: {
        input: number;
        output: number;
    };
}
export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    organization?: string;
    defaultTimeout?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
}
export interface ModelRouter {
    selectModel(request: ModelRequest): Promise<ModelSelection>;
    addProvider(provider: ModelProvider): void;
    removeProvider(providerId: string): void;
    getProviders(): ModelProvider[];
    getStats(): RouterStats;
}
export interface ModelSelection {
    provider: ModelProvider;
    model: ModelInfo;
    reason: string;
    estimatedLatency?: number;
    estimatedCost?: number;
}
export interface RouterStats {
    totalRequests: number;
    byRole: Record<ModelRole, number>;
    byProvider: Record<string, number>;
    averageLatency: number;
    totalTokens: number;
    totalCost: number;
}
export interface ModelCache {
    get(key: string): Promise<ModelResponse | null>;
    set(key: string, response: ModelResponse, ttl?: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
    clear(): Promise<void>;
}
export interface ModelMetrics {
    recordRequest(request: ModelRequest): void;
    recordResponse(response: ModelResponse): void;
    recordError(error: Error): void;
    getMetrics(): ModelMetricsData;
}
export interface ModelMetricsData {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    averageLatency: number;
    byModel: Record<string, {
        requests: number;
        tokens: number;
        avgLatency: number;
    }>;
}
//# sourceMappingURL=model-provider.d.ts.map