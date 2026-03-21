/**
 * Status Routes
 * 
 * REST endpoints for system status.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Track server start time
const startTime = Date.now();

/**
 * GET /status - Get system status
 */
router.get('/', (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    status: 'healthy',
    version: process.env.npm_package_version || '0.0.1',
    uptime: uptimeSeconds,
    environment: process.env.NODE_ENV || 'development',
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
