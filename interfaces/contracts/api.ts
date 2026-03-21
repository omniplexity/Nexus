/**
 * API Interface Contracts for Nexus
 * 
 * Defines the REST API interface contracts.
 */

/**
 * API method
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API request
 */
export interface ApiRequest {
  method: ApiMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * API response
 */
export interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  error?: ApiError;
  headers?: Record<string, string>;
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * API route definition
 */
export interface ApiRoute {
  method: ApiMethod;
  path: string;
  handler: ApiHandler;
  middleware?: ApiMiddleware[];
  schema?: ApiSchema;
}

/**
 * API handler
 */
export type ApiHandler = (request: ApiRequest) => Promise<ApiResponse>;

/**
 * API middleware
 */
export type ApiMiddleware = (request: ApiRequest) => Promise<ApiRequest | null>;

/**
 * API schema
 */
export interface ApiSchema {
  request?: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
  };
  response?: {
    [status: number]: Record<string, unknown>;
  };
}

/**
 * API server interface
 */
export interface ApiServer {
  /** Server port */
  port: number;
  
  /** Server host */
  host: string;
  
  /**
   * Start the server
   */
  start(): Promise<void>;
  
  /**
   * Stop the server
   */
  stop(): Promise<void>;
  
  /**
   * Register a route
   */
  register(route: ApiRoute): void;
  
  /**
   * Check if server is running
   */
  isRunning(): boolean;
  
  /**
   * Get server info
   */
  getInfo(): ServerInfo;
}

/**
 * Server information
 */
export interface ServerInfo {
  port: number;
  host: string;
  uptime: number;
  version: string;
}

/**
 * API router interface
 */
export interface ApiRouter {
  /**
   * Add a route
   */
  add(route: ApiRoute): void;
  
  /**
   * Remove a route
   */
  remove(method: ApiMethod, path: string): boolean;
  
  /**
   * Find matching route
   */
  match(method: ApiMethod, path: string): ApiRoute | null;
  
  /**
   * List all routes
   */
  list(): ApiRoute[];
}
