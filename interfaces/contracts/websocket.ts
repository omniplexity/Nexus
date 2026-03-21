/**
 * WebSocket Interface Contracts for Nexus
 * 
 * Defines the WebSocket interface contracts.
 */

/**
 * WebSocket message type
 */
export type WebSocketMessageType = 'text' | 'binary' | 'ping' | 'pong' | 'close';

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: Date;
}

/**
 * WebSocket event
 */
export type WebSocketEvent = 
  | 'connection'
  | 'disconnect'
  | 'message'
  | 'error'
  | 'open'
  | 'close';

/**
 * WebSocket client message
 */
export interface WebSocketClientMessage {
  event: string;
  data?: unknown;
}

/**
 * WebSocket server message
 */
export interface WebSocketServerMessage {
  event: string;
  data?: unknown;
  error?: string;
}

/**
 * WebSocket connection state
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed'
}

/**
 * WebSocket client interface
 */
export interface WebSocketClient {
  /** Unique client identifier */
  id: string;
  
  /** Current connection state */
  state: WebSocketState;
  
  /**
   * Connect to WebSocket server
   */
  connect(url: string): Promise<void>;
  
  /**
   * Disconnect from server
   */
  disconnect(): Promise<void>;
  
  /**
   * Send a message
   */
  send(event: string, data?: unknown): void;
  
  /**
   * Subscribe to an event
   */
  on(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  /**
   * Unsubscribe from an event
   */
  off(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  /**
   * Check if connected
   */
  isConnected(): boolean;
}

/**
 * WebSocket event handler
 */
export type WebSocketEventHandler = (data?: unknown) => void;

/**
 * WebSocket server interface
 */
export interface WebSocketServer {
  /** Server port */
  port: number;
  
  /**
   * Start the server
   */
  start(): Promise<void>;
  
  /**
   * Stop the server
   */
  stop(): Promise<void>;
  
  /**
   * Broadcast to all clients
   */
  broadcast(event: string, data?: unknown): void;
  
  /**
   * Send to specific client
   */
  send(clientId: string, event: string, data?: unknown): void;
  
  /**
   * Register event handler
   */
  on(event: WebSocketEvent, handler: WebSocketServerEventHandler): void;
  
  /**
   * Get connected clients
   */
  getClients(): string[];
  
  /**
   * Check if server is running
   */
  isRunning(): boolean;
}

/**
 * WebSocket server event handler
 */
export type WebSocketServerEventHandler = (
  clientId: string,
  data?: unknown
) => void;

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  port: number;
  path?: string;
  pingInterval?: number;
  pingTimeout?: number;
  maxPayload?: number;
}
