/**
 * Nexus API Server
 * 
 * Express-based REST API for Nexus orchestration.
 */

import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { tasksRouter } from './routes/tasks';
import { statusRouter } from './routes/status';
import { modelsRouter } from './routes/models';

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const API_PREFIX = '/api';

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (${requestId})`);
  next();
});

// Health check (no prefix)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use(`${API_PREFIX}/tasks`, tasksRouter);
app.use(`${API_PREFIX}/status`, statusRouter);
app.use(`${API_PREFIX}/models`, modelsRouter);

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
│  • GET  /health              Health check │
│  • POST ${API_PREFIX}/tasks            Create task │
│  • GET  ${API_PREFIX}/tasks/:id        Get task    │
│  • GET  ${API_PREFIX}/status           System info │
│  • GET  ${API_PREFIX}/models           List models  │
╰──────────────────────────────────────────╯
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };
