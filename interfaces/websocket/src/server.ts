import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createServer, type IncomingMessage, type Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';

import type {
  WebSocketEvent,
  WebSocketServerEventHandler,
  WorkspaceClientMessage,
  WorkspaceHub,
  WorkspaceServerMessage,
  WorkspaceWebSocketServerConfig,
  WebSocketServer,
} from './types';

type ConnectionRecord = {
  id: string;
  socket: Duplex;
  buffer: Buffer;
};

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function serializeMessage(event: string, data?: unknown, error?: string, requestId?: string): string {
  const message: WorkspaceServerMessage = {
    event: event as WorkspaceServerMessage['event'],
    data,
    error,
    requestId,
  };

  return JSON.stringify({
    ...message,
    timestamp: new Date().toISOString(),
  });
}

function encodeFrame(payload: string): Buffer {
  const data = Buffer.from(payload, 'utf8');
  const length = data.length;

  if (length < 126) {
    const frame = Buffer.allocUnsafe(2 + length);
    frame[0] = 0x81;
    frame[1] = length;
    data.copy(frame, 2);
    return frame;
  }

  if (length < 65536) {
    const frame = Buffer.allocUnsafe(4 + length);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(length, 2);
    data.copy(frame, 4);
    return frame;
  }

  const frame = Buffer.allocUnsafe(10 + length);
  frame[0] = 0x81;
  frame[1] = 127;
  frame.writeBigUInt64BE(BigInt(length), 2);
  data.copy(frame, 10);
  return frame;
}

function decodeFrames(buffer: Buffer): { messages: string[]; remaining: Buffer; closed: boolean; ping: boolean } {
  const messages: string[] = [];
  let offset = 0;
  let closed = false;
  let ping = false;

  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const fin = (byte1 & 0x80) !== 0;
    const opcode = byte1 & 0x0f;
    const masked = (byte2 & 0x80) !== 0;
    let length = byte2 & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const maskOffset = offset + headerLength;
    const payloadOffset = masked ? maskOffset + 4 : maskOffset;
    const frameLength = payloadOffset + length;

    if (frameLength > buffer.length) {
      break;
    }

    const payload = Buffer.alloc(length);
    buffer.copy(payload, 0, payloadOffset, payloadOffset + length);

    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4);
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    if (!fin) {
      offset = frameLength;
      continue;
    }

    if (opcode === 0x8) {
      closed = true;
      offset = frameLength;
      break;
    }

    if (opcode === 0x9) {
      ping = true;
      offset = frameLength;
      continue;
    }

    if (opcode === 0x1) {
      messages.push(payload.toString('utf8'));
    }

    offset = frameLength;
  }

  return {
    messages,
    remaining: buffer.subarray(offset),
    closed,
    ping,
  };
}

function upgradeKey(request: IncomingMessage): string | null {
  const key = request.headers['sec-websocket-key'];
  if (typeof key !== 'string') {
    return null;
  }

  return createHash('sha1')
    .update(`${key}${WEBSOCKET_GUID}`)
    .digest('base64');
}

function isValidUpgradeRequest(request: IncomingMessage): boolean {
  const upgradeHeader = request.headers.upgrade;
  const connectionHeader = request.headers.connection;
  const versionHeader = request.headers['sec-websocket-version'];

  if (typeof upgradeHeader !== 'string' || upgradeHeader.toLowerCase() !== 'websocket') {
    return false;
  }

  if (typeof connectionHeader !== 'string' || !connectionHeader.toLowerCase().split(',').map((value) => value.trim()).includes('upgrade')) {
    return false;
  }

  return versionHeader === '13';
}

function isWorkspaceClientMessage(value: unknown): value is WorkspaceClientMessage {
  return typeof value === 'object' && value !== null && typeof (value as WorkspaceClientMessage).event === 'string';
}

function safeParse(value: string): WorkspaceClientMessage | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isWorkspaceClientMessage(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export class WorkspaceWebSocketServerImpl implements WebSocketServer {
  public readonly port: number;
  private readonly path: string;
  private readonly hub: WorkspaceHub;
  private readonly autoSnapshotOnConnect: boolean;
  private readonly emitter = new EventEmitter();
  private readonly externalServer?: HttpServer;
  private httpServer: HttpServer | null = null;
  private connections = new Map<string, ConnectionRecord>();
  private hubUnsubscribe: (() => void) | null = null;
  private running = false;

  constructor(config: WorkspaceWebSocketServerConfig) {
    this.port = config.port;
    this.path = config.path ?? '/ws';
    this.hub = config.hub;
    this.autoSnapshotOnConnect = config.autoSnapshotOnConnect ?? true;
    this.externalServer = config.server;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.httpServer = this.externalServer ?? createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Nexus websocket server');
    });

    this.httpServer.on('upgrade', (request, socket, head) => {
      const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (requestPath !== this.path || !isValidUpgradeRequest(request)) {
        socket.destroy();
        return;
      }

      const acceptKey = upgradeKey(request);
      if (!acceptKey) {
        socket.destroy();
        return;
      }

      socket.write([
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '',
        '',
      ].join('\r\n'));

      const id = randomUUID();
      const record: ConnectionRecord = {
        id,
        socket,
        buffer: Buffer.alloc(0),
      };

      this.connections.set(id, record);
      this.hub.setConnectionState(this.connections.size, { connectedAt: new Date().toISOString() });
      this.emitter.emit('connection', id);

      this.sendToRecord(record, 'workspace:connected', {
        clientId: id,
        state: 'open',
      });

      if (this.autoSnapshotOnConnect) {
        this.sendToRecord(record, 'workspace:snapshot', this.hub.snapshot());
      }

      if (head.length > 0) {
        record.buffer = Buffer.concat([record.buffer, head]);
      }

      socket.on('data', (chunk) => {
        record.buffer = Buffer.concat([record.buffer, chunk]);
        const decoded = decodeFrames(record.buffer);
        record.buffer = decoded.remaining;

        if (decoded.closed) {
          socket.end();
          return;
        }

        if (decoded.ping) {
          socket.write(Buffer.from([0x8a, 0x00]));
        }

        for (const rawMessage of decoded.messages) {
          const parsed = safeParse(rawMessage);
          this.emitter.emit('message', id, parsed ?? rawMessage);

          if (!parsed) {
            this.sendToRecord(record, 'workspace:error', undefined, 'Invalid message payload');
            continue;
          }

          this.handleClientMessage(record, parsed);
        }
      });

      socket.on('close', () => {
        this.connections.delete(id);
        this.hub.setConnectionState(this.connections.size, { disconnectedAt: new Date().toISOString() });
        this.emitter.emit('disconnect', id);
      });

      socket.on('error', (error) => {
        this.emitter.emit('error', id, error);
      });
    });

    this.hubUnsubscribe = this.hub.subscribe((event) => {
      this.broadcast(event.event, event.data, undefined, event.requestId);
    });

    if (!this.externalServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.listen(this.port, resolve);
      });
    }

    this.running = true;
    this.emitter.emit('open');
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.hubUnsubscribe?.();
    this.hubUnsubscribe = null;

    for (const { socket } of this.connections.values()) {
      try {
        socket.end();
      } catch {
        // Ignore shutdown errors.
      }
    }
    this.connections.clear();

    if (this.httpServer && !this.externalServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => resolve());
      });
    }

    this.httpServer = null;
    this.running = false;
    this.emitter.emit('close');
  }

  broadcast(event: string, data?: unknown, error?: string, requestId?: string): void {
    for (const record of this.connections.values()) {
      this.sendToRecord(record, event, data, error, requestId);
    }
  }

  send(clientId: string, event: string, data?: unknown, error?: string, requestId?: string): void {
    const record = this.connections.get(clientId);
    if (!record) {
      return;
    }

    this.sendToRecord(record, event, data, error, requestId);
  }

  on(event: WebSocketEvent, handler: WebSocketServerEventHandler): void {
    this.emitter.on(event, handler as never);
  }

  getClients(): string[] {
    return Array.from(this.connections.keys());
  }

  isRunning(): boolean {
    return this.running;
  }

  private handleClientMessage(record: ConnectionRecord, message: WorkspaceClientMessage): void {
    switch (message.event) {
      case 'workspace:subscribe':
        this.sendToRecord(record, 'workspace:snapshot', this.hub.snapshot(), undefined, message.requestId);
        break;
      case 'workspace:request-snapshot':
        this.sendToRecord(record, 'workspace:snapshot', this.hub.snapshot(), undefined, message.requestId);
        break;
      case 'workspace:ping':
        this.sendToRecord(record, 'workspace:pong', { receivedAt: new Date().toISOString() }, undefined, message.requestId);
        break;
      case 'task:cancel':
        this.sendToRecord(record, 'workspace:error', undefined, 'task:cancel is not supported by the Phase 6 control surface', message.requestId);
        break;
      default:
        this.sendToRecord(record, 'workspace:error', undefined, `Unsupported workspace event: ${message.event}`, message.requestId);
        break;
    }
  }

  private sendToRecord(record: ConnectionRecord, event: string, data?: unknown, error?: string, requestId?: string): void {
    if (record.socket.destroyed) {
      return;
    }

    record.socket.write(encodeFrame(serializeMessage(event, data, error, requestId)));
  }
}

export function createWorkspaceWebSocketServer(config: WorkspaceWebSocketServerConfig): WebSocketServer {
  return new WorkspaceWebSocketServerImpl(config);
}
