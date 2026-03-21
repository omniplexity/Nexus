/**
 * Integration Provider Contracts for Nexus
 * 
 * Defines the integration provider interfaces.
 */

/**
 * Integration provider status
 * Used for external service provider connections
 */
export enum IntegrationProviderStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: string;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
  headers?: Record<string, string>;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string;
  capabilities: string[];
  status: IntegrationProviderStatus;
}

/**
 * Integration provider interface
 */
export interface IntegrationProvider {
  /** Unique provider identifier */
  id: string;
  
  /** Provider configuration */
  config: ProviderConfig;
  
  /** Current provider status */
  status: IntegrationProviderStatus;
  
  /**
   * Connect to the provider
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the provider
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if provider is connected
   */
  isConnected(): boolean;
  
  /**
   * Send a request to the provider
   */
  request<T = unknown>(method: string, path: string, data?: unknown): Promise<T>;
  
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata;
  
  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Provider factory interface
 */
export interface ProviderFactory<T extends IntegrationProvider = IntegrationProvider> {
  /**
   * Create a new provider instance
   */
  create(config: ProviderConfig): T;
  
  /**
   * Get provider type
   */
  getType(): string;
  
  /**
   * Validate configuration
   */
  validateConfig(config: ProviderConfig): { valid: boolean; errors?: string[] };
}

/**
 * Provider descriptor for registration
 */
export interface ProviderDescriptor {
  type: string;
  factory: ProviderFactory;
  description: string;
  capabilities: string[];
}
