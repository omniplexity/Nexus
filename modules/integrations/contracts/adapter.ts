/**
 * Integration Adapter Contracts for Nexus
 * 
 * Defines the adapter pattern for external service integration.
 */

import type { IntegrationProvider } from './provider';

/**
 * Adapter status
 */
export enum AdapterStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  providerId: string;
  name: string;
  options?: Record<string, unknown>;
}

/**
 * Adapter result
 */
export interface AdapterResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Integration adapter interface
 * 
 * Adapters transform external service APIs into
 * a unified internal interface.
 */
export interface IntegrationAdapter<T = unknown> {
  /** Unique adapter identifier */
  id: string;
  
  /** Associated provider */
  provider: IntegrationProvider;
  
  /** Adapter configuration */
  config: AdapterConfig;
  
  /** Current adapter status */
  status: AdapterStatus;
  
  /**
   * Initialize the adapter
   */
  initialize(): Promise<void>;
  
  /**
   * Execute an operation through the adapter
   */
  execute(operation: string, params?: unknown): Promise<AdapterResult<T>>;
  
  /**
   * Transform external data to internal format
   */
  transform<TInput = unknown, TOutput = unknown>(data: TInput): TOutput;
  
  /**
   * Transform internal data to external format
   */
  reverseTransform<TInput = unknown, TOutput = unknown>(data: TInput): TOutput;
  
  /**
   * Get adapter capabilities
   */
  getCapabilities(): string[];
  
  /**
   * Validate adapter configuration
   */
  validate(): { valid: boolean; errors?: string[] };
}

/**
 * Adapter factory interface
 */
export interface AdapterFactory<T extends IntegrationAdapter = IntegrationAdapter> {
  /**
   * Create a new adapter instance
   */
  create(provider: IntegrationProvider, config: AdapterConfig): T;
  
  /**
   * Get adapter type
   */
  getType(): string;
}

/**
 * Adapter descriptor for registration
 */
export interface AdapterDescriptor {
  type: string;
  factory: AdapterFactory;
  description: string;
}
