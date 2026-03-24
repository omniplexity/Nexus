import { Router, Request, Response } from 'express';

import { workspaceHub } from '../workspace';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(workspaceHub.snapshot());
});

router.get('/graph', (_req: Request, res: Response) => {
  res.json(workspaceHub.snapshot().graph);
});

router.get('/logs', (_req: Request, res: Response) => {
  res.json({ logs: workspaceHub.snapshot().logs });
});

router.get('/tasks', (_req: Request, res: Response) => {
  res.json({ tasks: workspaceHub.listTasks() });
});

export { router as workspaceRouter };
