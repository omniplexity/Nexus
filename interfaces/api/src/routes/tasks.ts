/**
 * Tasks Routes
 * 
 * REST endpoints for task execution.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory task storage (Phase 2 - no persistence)
interface TaskStore {
  [taskId: string]: {
    id: string;
    input: unknown;
    type: string;
    status: string;
    output?: unknown;
    error?: string;
    createdAt: string;
    completedAt?: string;
    metadata?: Record<string, unknown>;
  };
}

const taskStore: TaskStore = {};

/**
 * POST /tasks - Create and execute a task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { input, type, config, metadata } = req.body;

    // Validate input
    if (!input) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input is required',
        },
      });
      return;
    }

    const taskId = uuidv4();
    const task = {
      id: taskId,
      input,
      type: type || 'reasoning',
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata,
    };

    // Store task
    taskStore[taskId] = task;

    // Execute task asynchronously (in production, this would be a job queue)
    executeTask(taskId, input, config).then((result) => {
      taskStore[taskId] = {
        ...taskStore[taskId],
        ...result,
        completedAt: new Date().toISOString(),
      };
    });

    // Return immediately with task ID
    res.status(202).json({
      taskId,
      status: 'pending',
      message: 'Task queued for execution',
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create task',
      },
    });
  }
});

/**
 * GET /tasks/:id - Get task by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const task = taskStore[id];

  if (!task) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Task with ID "${id}" not found`,
      },
    });
    return;
  }

  res.json({
    taskId: task.id,
    status: task.status,
    output: task.output,
    error: task.error,
    metrics: task.metadata?.metrics,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  });
});

/**
 * GET /tasks - List all tasks
 */
router.get('/', (_req: Request, res: Response) => {
  const tasks = Object.values(taskStore).map((task) => ({
    taskId: task.id,
    type: task.type,
    status: task.status,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  }));

  res.json({ tasks });
});

/**
 * Execute a task (simplified for Phase 2)
 */
async function executeTask(
  taskId: string,
  input: unknown,
  config?: Record<string, unknown>
): Promise<{ status: string; output?: unknown; error?: string; metadata?: Record<string, unknown> }> {
  try {
    // Update status to running
    taskStore[taskId].status = 'running';

    // Get model from environment or config
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return {
        status: 'failed',
        error: 'OPENAI_API_KEY not configured',
      };
    }

    // Build the prompt
    const prompt = typeof input === 'string' ? input : JSON.stringify(input);

    // Call OpenAI API
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };

    const output = data.choices[0]?.message?.content || '';

    return {
      status: 'completed',
      output,
      metadata: {
        model,
        tokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Task execution failed',
    };
  }
}

export { router as tasksRouter };
