/**
 * Nexus API Server
 * 
 * Express-based REST API for Nexus orchestration.
 */

import { createWorkspaceWebSocketServer } from '@nexus/websocket';
import 'dotenv/config';
import cors from 'cors';
import express, { Express, Request, Response, NextFunction, json, urlencoded } from 'express';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

import { capabilitiesRouter } from './routes/capabilities';
import { chatRouter } from './routes/chat';
import { modelsRouter } from './routes/models';
import { statusRouter } from './routes/status';
import { tasksRouter } from './routes/tasks';
import { workspaceRouter } from './routes/workspace';
import { workspaceHub } from './workspace';

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const API_PREFIX = '/api';

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (${requestId})`);
  next();
});

// Health check (moved from /health to /api/health in v1.0.0)
app.get(`${API_PREFIX}/health`, (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use(`${API_PREFIX}/tasks`, tasksRouter);
app.use(`${API_PREFIX}/chat`, chatRouter);
app.use(`${API_PREFIX}/status`, statusRouter);
app.use(`${API_PREFIX}/models`, modelsRouter);
app.use(`${API_PREFIX}/capabilities`, capabilitiesRouter);
app.use(`${API_PREFIX}/workspace`, workspaceRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╭──────────────────────────────────────────╮
│  🚀 Nexus API Server                     │
│                                          │
│  Server running at: http://localhost:${PORT}  │
│  API prefix: ${API_PREFIX}                    │
│                                          │
│  Endpoints:                               │
│  • GET  /api/health         Health check │
│  • POST ${API_PREFIX}/chat             Master chat  │
│  • POST ${API_PREFIX}/tasks            Create task │
│  • GET  ${API_PREFIX}/tasks/:id        Get task    │
│  • GET  ${API_PREFIX}/status           System info │
│  • GET  ${API_PREFIX}/models           List models  │
│  • GET  ${API_PREFIX}/capabilities     Capability deck │
│  • GET  ${API_PREFIX}/workspace        Workspace UI │
╰──────────────────────────────────────────╯
  `);
});

const workspaceWebSocketServer = createWorkspaceWebSocketServer({
  port: PORT,
  path: '/ws',
  server,
  hub: workspaceHub,
  autoSnapshotOnConnect: true,
});

workspaceWebSocketServer.start().catch((error) => {
  console.error('Failed to start workspace websocket server:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  workspaceWebSocketServer.stop().finally(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

export { app, server, workspaceWebSocketServer };
