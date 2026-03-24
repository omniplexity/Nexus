/**
 * Models Routes
 * 
 * REST endpoints for model information.
 */

import { Router, Request, Response } from 'express';

import { workspaceHub } from '../workspace';

const router = Router();

/**
 * GET /models - List available models
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    // If no API key, return default models
    if (!apiKey) {
      workspaceHub.setModels(getDefaultModels());
      res.json({
        models: getDefaultModels(),
      });
      return;
    }

    // Try to fetch models from OpenAI
    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        // Return defaults on error
        workspaceHub.setModels(getDefaultModels());
        res.json({
          models: getDefaultModels(),
        });
        return;
      }

      const data = await response.json() as {
        data: Array<{ id: string; name?: string }>;
      };

      const models = data.data.map((m) => ({
        id: m.id,
        name: m.name || m.id,
        role: inferRole(m.id),
      }));

      workspaceHub.setModels(models);
      res.json({ models });
    } catch {
      // Return defaults on network error
      workspaceHub.setModels(getDefaultModels());
      res.json({
        models: getDefaultModels(),
      });
    }
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch models',
      },
    });
  }
});

/**
 * Get default models
 */
function getDefaultModels() {
  return [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      role: 'fast',
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      role: 'reasoning',
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      role: 'reasoning',
      contextWindow: 128000,
      maxOutputTokens: 4096,
    },
  ];
}

/**
 * Infer model role from ID
 */
function inferRole(modelId: string): string {
  const lower = modelId.toLowerCase();
  
  if (lower.includes('gpt-3.5') || lower.includes('haiku') || lower.includes('flash')) {
    return 'fast';
  }
  if (lower.includes('code') || lower.includes('math')) {
    return 'specialized';
  }
  return 'reasoning';
}

export { router as modelsRouter };
