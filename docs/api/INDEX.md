# Nexus API Documentation

> **Phase 1 Stub** — This documentation represents interface contracts defined in Phase 1. Endpoints and commands will be implemented in subsequent phases.

## Overview

Nexus provides multiple interaction interfaces:

- **REST API** — HTTP-based API for programmatic access
- **CLI** — Command-line interface for terminal operations
- **WebSocket** — Real-time workspace communication and control surface transport
- **Events** — Internal event system for component communication

## API Reference

| Document | Description |
|----------|-------------|
| [REST.md](./REST.md) | REST API endpoints and usage |
| [CLI.md](./CLI.md) | Command-line interface commands |
| [WebSocket.md](./WebSocket.md) | WebSocket events and messages |
| [ERRORS.md](./ERRORS.md) | Error codes and handling guide |
| [EVENTS.md](./EVENTS.md) | Event system reference |

## Contract Sources

These API stubs are generated from contract definitions in:

- [`interfaces/contracts/api.ts`](../../interfaces/contracts/api.ts) — REST API contracts
- [`interfaces/contracts/cli.ts`](../../interfaces/contracts/cli.ts) — CLI contracts
- [`interfaces/contracts/websocket.ts`](../../interfaces/contracts/websocket.ts) — WebSocket contracts
- [`core/contracts/errors.ts`](../../core/contracts/errors.ts) — Error contracts
- [`core/contracts/events.ts`](../../core/contracts/events.ts) — Event contracts

## Quick Start

### REST API

```typescript
// Example: Starting the API server (Phase 2+)
import { ApiServer } from '@nexus/api';

const server: ApiServer = {
  port: 3000,
  host: 'localhost',
  async start() { /* ... */ },
  async stop() { /* ... */ },
  register(route) { /* ... */ },
  isRunning() { return true; },
  getInfo() { return { port: 3000, host: 'localhost', uptime: 0, version: '0.0.1' }; }
};

await server.start();
```

### CLI

```typescript
// Example: CLI parser usage (Phase 2+)
import { CliParser, CliCommand } from '@nexus/cli';

const parser: CliParser = {
  command(cmd: CliCommand) { /* ... */ },
  parse(argv: string[]) { /* ... */ },
  help(cmd?: string) { return ''; },
  getCommand(name: string) { return undefined; },
  listCommands() { return []; }
};
```

### WebSocket

```typescript
// Example: WebSocket client (Phase 6 complete)
import { WebSocketClient, WebSocketState } from '@nexus/websocket';

const client: WebSocketClient = {
  id: 'client-1',
  state: WebSocketState.CONNECTING,
  async connect(url: string) { /* ... */ },
  async disconnect() { /* ... */ },
  send(event: string, data?: unknown) { /* ... */ },
  on(event, handler) { /* ... */ },
  off(event, handler) { /* ... */ },
  isConnected() { return false; }
};
```

## Version

This documentation reflects **Phase 1** of the Nexus implementation. API contracts are stable, but implementations will be added in later phases.

Last updated: 2026-03-21
