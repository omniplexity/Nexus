/**
 * Status Routes
 * 
 * REST endpoints for system status.
 */

import { Router, Request, Response } from 'express';

import { workspaceHub } from '../workspace';

const router = Router();

/**
 * GET /status - Get system status
 */
router.get('/', (_req: Request, res: Response) => {
  const snapshot = workspaceHub.snapshot();

  res.json({
    ...snapshot.status,
    tasks: snapshot.metrics.totalTasks,
    logs: snapshot.metrics.totalLogs,
    connections: snapshot.connections.active,
  });
});

/**
 * GET /status/readiness - Readiness probe
 */
router.get('/readiness', (_req: Request, res: Response) => {
  // Check if API key is configured
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  if (!hasApiKey) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'API key not configured',
    });
    return;
  }

  res.json({
    status: 'ready',
  });
});

/**
 * GET /status/liveness - Liveness probe
 */
router.get('/liveness', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export { router as statusRouter };
