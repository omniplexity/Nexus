import { Router, type Request, type Response } from 'express';

import { capabilityCatalog } from '../capabilities';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    ...capabilityCatalog,
    execution: {
      taskEndpoint: '/api/tasks',
      workspaceEndpoint: '/api/workspace',
      modelsEndpoint: '/api/models',
    },
  });
});

export { router as capabilitiesRouter };
