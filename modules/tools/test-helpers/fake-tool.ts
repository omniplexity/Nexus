import { createInputSchema, createOutputSchema } from '../contracts/schema.js';
import type { ToolExecutionContext, ToolExecutionResult } from '../contracts/tool.js';
import { ToolLifecycleStatus } from '../contracts/tool.js';
import { BaseTool } from '../runtime/base-tool.js';
import { createToolExecutionError } from '../runtime/error-utils.js';

export class EchoTool extends BaseTool {
  constructor() {
    super({
      id: 'test.echo',
      name: 'test.echo',
      description: 'Echo test tool',
      status: ToolLifecycleStatus.AVAILABLE,
      inputSchema: createInputSchema(
        {
          value: { type: 'string', description: 'Value to echo' }
        },
        ['value']
      ),
      outputSchema: createOutputSchema({
        echoed: { type: 'string', description: 'Echoed value' }
      }),
      metadata: {
        id: 'test.echo',
        name: 'test.echo',
        description: 'Echo test tool',
        category: 'testing',
        tags: ['test', 'echo'],
        version: '1.0.0'
      }
    });
  }

  async execute(input: unknown): Promise<ToolExecutionResult> {
    const startedAt = Date.now();
    return this.createSuccessResult({
      echoed: String((input as { value: string }).value)
    }, startedAt);
  }
}

export class FlakyTool extends BaseTool {
  private attempts = 0;

  constructor(private readonly failCount: number) {
    super({
      id: 'test.flaky',
      name: 'test.flaky',
      description: 'Flaky test tool',
      status: ToolLifecycleStatus.AVAILABLE,
      config: {
        retries: failCount,
        timeout: 1000
      },
      inputSchema: createInputSchema({}, []),
      outputSchema: createOutputSchema({
        ok: { type: 'boolean', description: 'Success flag' }
      }),
      metadata: {
        id: 'test.flaky',
        name: 'test.flaky',
        description: 'Flaky test tool',
        category: 'testing',
        tags: ['test', 'flaky'],
        version: '1.0.0'
      }
    });
  }

  async execute(_input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startedAt = Date.now();
    this.attempts += 1;

    if (context.abortSignal?.aborted) {
      return this.createErrorResult(createToolExecutionError('Execution aborted'), startedAt);
    }

    if (this.attempts <= this.failCount) {
      return this.createErrorResult(createToolExecutionError('Intentional flaky failure', {
        attempts: this.attempts
      }), startedAt);
    }

    return this.createSuccessResult({ ok: true }, startedAt);
  }
}

export class SlowTool extends BaseTool {
  constructor(private readonly delayMs: number) {
    super({
      id: 'test.slow',
      name: 'test.slow',
      description: 'Slow test tool',
      status: ToolLifecycleStatus.AVAILABLE,
      config: {
        timeout: Math.max(10, delayMs - 5)
      },
      inputSchema: createInputSchema({}, []),
      outputSchema: createOutputSchema({
        ok: { type: 'boolean', description: 'Success flag' }
      }),
      metadata: {
        id: 'test.slow',
        name: 'test.slow',
        description: 'Slow test tool',
        category: 'testing',
        tags: ['test', 'slow'],
        version: '1.0.0'
      }
    });
  }

  async execute(_input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startedAt = Date.now();

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, this.delayMs);
      context.abortSignal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(createToolExecutionError('Execution aborted'));
        },
        { once: true }
      );
    });

    return this.createSuccessResult({ ok: true }, startedAt);
  }
}
