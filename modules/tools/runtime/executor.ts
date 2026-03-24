import { randomUUID } from 'node:crypto';

import { ErrorCode } from '@nexus/core/contracts/errors';

import type { ToolPolicy } from '../contracts/policy.js';
import type { RunningExecution, ToolCache, ToolExecutor, ToolRegistry } from '../contracts/registry.js';
import type { Tool, ToolExecutionContext, ToolExecutionResult } from '../contracts/tool.js';

import {
  createToolAuthorizationError,
  createToolInputError,
  createToolNotFoundError,
  createToolTimeoutError,
  toToolExecutionError
} from './error-utils.js';
import { createToolPolicy, assertToolCapabilities } from './policy.js';
import { InMemoryToolRegistry } from './registry.js';

export interface ToolExecutorOptions {
  cache?: ToolCache;
  policy?: Partial<ToolPolicy>;
  defaultTimeoutMs?: number;
  defaultRetries?: number;
}

interface ActiveExecution {
  controller: AbortController;
  info: RunningExecution;
}

function isToolRetryable(errorCode?: string): boolean {
  return errorCode !== ErrorCode.TOL_001 && errorCode !== ErrorCode.TOL_004 && errorCode !== ErrorCode.TOL_005;
}

function serializeCacheKey(toolId: string, input: unknown): string {
  return `${toolId}:${JSON.stringify(input)}`;
}

function serializeCapabilityScope(context: ToolExecutionContext): string {
  return JSON.stringify({
    sessionId: context.sessionId,
    userId: context.userId,
    capabilities: context.capabilities,
    variables: context.variables
  });
}

export class DefaultToolExecutor implements ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly cache?: ToolCache;
  private readonly policy: ToolPolicy;
  private readonly defaultTimeoutMs: number;
  private readonly defaultRetries: number;
  private readonly running = new Map<string, ActiveExecution>();

  constructor(registry: ToolRegistry, options: ToolExecutorOptions = {}) {
    this.registry = registry;
    this.cache = options.cache;
    this.policy = createToolPolicy(options.policy);
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5000;
    this.defaultRetries = options.defaultRetries ?? 0;
  }

  async execute(
    toolId: string,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.registry.get(toolId);
    return this.executeTool(tool, toolId, input, context);
  }

  async executeByName(
    toolName: string,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.registry.getByName(toolName);
    return this.executeTool(tool, toolName, input, context);
  }

  async executeParallel(
    requests: { toolId: string; input: unknown }[],
    context: ToolExecutionContext
  ): Promise<Map<string, ToolExecutionResult>> {
    const entries = await Promise.all(
      requests.map(async request => {
        const result = await this.execute(request.toolId, request.input, context);
        return [request.toolId, result] as const;
      })
    );

    return new Map(entries);
  }

  cancel(executionId: string): void {
    const activeExecution = this.running.get(executionId);
    if (!activeExecution) {
      return;
    }

    activeExecution.info.status = 'cancelling';
    activeExecution.controller.abort();
  }

  getRunning(): RunningExecution[] {
    return Array.from(this.running.values()).map(entry => ({ ...entry.info }));
  }

  getPolicy(): ToolPolicy {
    return this.policy;
  }

  private async executeTool(
    tool: Tool | undefined,
    requestedId: string,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    if (!tool) {
      return this.createFailedResult(requestedId, requestedId, 0, createToolNotFoundError('Tool not found', {
        toolId: requestedId
      }));
    }

    if (tool.status !== 'available') {
      return this.createFailedResult(tool.id, tool.name, 0, createToolNotFoundError('Tool is not available', {
        toolId: tool.id,
        status: tool.status
      }));
    }

    try {
      assertToolCapabilities(tool, context.capabilities);
    } catch (error) {
      return this.createFailedResult(tool.id, tool.name, 0, error);
    }

    const validation = tool.validateInput(input);
    if (!validation.valid) {
      return this.createFailedResult(tool.id, tool.name, 0, createToolInputError('Tool input validation failed', {
        toolId: tool.id,
        errors: validation.errors
      }));
    }

    const useCache = Boolean(tool.config.cache && this.cache);
    const cacheKey = useCache
      ? `${serializeCacheKey(tool.id, input)}:${serializeCapabilityScope(context)}`
      : undefined;
    if (cacheKey && this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true
          }
        };
      }
    }

    const retries = tool.config.retries ?? this.defaultRetries;
    let attempt = 0;

    while (attempt <= retries) {
      attempt += 1;

      const executionId = randomUUID();
      const controller = new AbortController();
      const runningExecution: ActiveExecution = {
        controller,
        info: {
          executionId,
          toolId: tool.id,
          toolName: tool.name,
          startTime: new Date(),
          status: 'running'
        }
      };

      this.running.set(executionId, runningExecution);
      const startedAt = Date.now();

      try {
        const result = await this.executeWithTimeout(
          tool,
          input,
          {
            ...context,
            abortSignal: controller.signal,
            metadata: {
              ...context.metadata,
              executionId
            }
          },
          tool.config.timeout ?? this.defaultTimeoutMs
        );

        this.running.delete(executionId);

        if (!result.success) {
          if (attempt <= retries && isToolRetryable(result.error?.code)) {
            continue;
          }
          return {
            ...result,
            metadata: {
              ...result.metadata,
              executionId
            }
          };
        }

        const outputValidation = tool.validateOutput(result.output);
        if (!outputValidation.valid) {
          const validationError = createToolInputError('Tool output validation failed', {
            toolId: tool.id,
            errors: outputValidation.errors
          });
          if (attempt <= retries) {
            continue;
          }
          return this.createFailedResult(tool.id, tool.name, Date.now() - startedAt, validationError, executionId);
        }

        if (this.registry instanceof InMemoryToolRegistry) {
          this.registry.markUsed(tool.id);
        }

        const finalResult: ToolExecutionResult = {
          ...result,
          metadata: {
            ...result.metadata,
            cacheHit: false,
            executionId
          }
        };

        if (cacheKey && this.cache) {
          this.cache.set(cacheKey, finalResult);
        }

        return finalResult;
      } catch (error) {
        this.running.delete(executionId);

        if (attempt <= retries && isToolRetryable(toToolExecutionError(error).code)) {
          continue;
        }

        return this.createFailedResult(tool.id, tool.name, Date.now() - startedAt, error, executionId);
      }
    }

    return this.createFailedResult(tool.id, tool.name, 0, createToolAuthorizationError('Tool execution exhausted retry attempts', {
      toolId: tool.id
    }));
  }

  private async executeWithTimeout(
    tool: Tool,
    input: unknown,
    context: ToolExecutionContext,
    timeoutMs: number
  ): Promise<ToolExecutionResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(createToolTimeoutError(`Tool execution timed out after ${timeoutMs}ms`, {
          toolId: tool.id,
          timeoutMs
        }));
      }, timeoutMs);

      context.abortSignal?.addEventListener(
        'abort',
        () => {
          if (timer) {
            clearTimeout(timer);
          }
          reject(createToolTimeoutError('Tool execution was cancelled', {
            toolId: tool.id
          }));
        },
        { once: true }
      );
    });

    try {
      return await Promise.race([
        tool.execute(input, context),
        timeoutPromise
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private createFailedResult(
    toolId: string,
    toolName: string,
    duration: number,
    error: unknown,
    executionId?: string
  ): ToolExecutionResult {
    return {
      success: false,
      output: null,
      error: toToolExecutionError(error),
      metadata: {
        toolId,
        toolName,
        duration,
        executionId,
        cacheHit: false
      }
    };
  }
}

export function createToolExecutor(
  registry: ToolRegistry,
  options?: ToolExecutorOptions
): DefaultToolExecutor {
  return new DefaultToolExecutor(registry, options);
}
