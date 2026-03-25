import type { ChatRequest } from '@nexus/interfaces/contracts/chat';
import { Router, type Request, type Response } from 'express';

import { queueChatTask } from '../chat';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const body = req.body as Partial<ChatRequest> | undefined;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Message is required',
      },
    });
    return;
  }

  try {
    const result = await queueChatTask({
      message,
      model: typeof body?.model === 'string' ? body.model : undefined,
      temperature: typeof body?.temperature === 'number' ? body.temperature : undefined,
      maxTokens: typeof body?.maxTokens === 'number' ? body.maxTokens : undefined,
      conversationId: typeof body?.conversationId === 'string' ? body.conversationId : undefined,
      context: Array.isArray(body?.context) ? body.context.filter((entry): entry is string => typeof entry === 'string') : undefined,
    });

    res.status(202).json(result);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to queue chat request',
      },
    });
  }
});

export { router as chatRouter };
