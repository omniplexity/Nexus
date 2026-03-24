import type { ToolExecutionError } from '@nexus/core/contracts/tool';

import type { ToolInputSchema, ToolOutputSchema } from '../contracts/schema.js';
import type {
  Tool,
  ToolConfig,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolMetadata
} from '../contracts/tool.js';
import { ToolLifecycleStatus } from '../contracts/tool.js';

import { toToolExecutionError } from './error-utils.js';
import { validateAgainstSchema } from './schema-validator.js';

export interface BaseToolOptions {
  id: string;
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  outputSchema: ToolOutputSchema;
  metadata: ToolMetadata;
  config?: ToolConfig;
  status?: ToolLifecycleStatus;
}

export abstract class BaseTool implements Tool {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly inputSchema: ToolInputSchema;
  public readonly outputSchema: ToolOutputSchema;
  public status: ToolLifecycleStatus;
  public config: ToolConfig;

  private readonly metadata: ToolMetadata;

  constructor(options: BaseToolOptions) {
    this.id = options.id;
    this.name = options.name;
    this.description = options.description;
    this.inputSchema = options.inputSchema;
    this.outputSchema = options.outputSchema;
    this.status = options.status ?? ToolLifecycleStatus.AVAILABLE;
    this.config = {
      timeout: 5000,
      retries: 0,
      cache: false,
      sandboxed: false,
      ...options.config
    };
    this.metadata = options.metadata;
  }

  abstract execute(input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult>;

  validateInput(input: unknown): { valid: boolean; errors?: string[] } {
    return validateAgainstSchema(this.inputSchema, input, 'input');
  }

  validateOutput(output: unknown): { valid: boolean; errors?: string[] } {
    return validateAgainstSchema(this.outputSchema, output, 'output');
  }

  getMetadata(): ToolMetadata {
    return { ...this.metadata };
  }

  protected createSuccessResult(
    output: unknown,
    startedAt: number,
    metadata?: Partial<ToolExecutionResult['metadata']>
  ): ToolExecutionResult {
    return {
      success: true,
      output,
      metadata: {
        toolId: this.id,
        toolName: this.name,
        duration: Date.now() - startedAt,
        ...metadata
      }
    };
  }

  protected createErrorResult(
    error: unknown,
    startedAt: number,
    metadata?: Partial<ToolExecutionResult['metadata']>
  ): ToolExecutionResult {
    return {
      success: false,
      output: null,
      error: toToolExecutionError(error),
      metadata: {
        toolId: this.id,
        toolName: this.name,
        duration: Date.now() - startedAt,
        ...metadata
      }
    };
  }

  protected createErrorResultFromParts(
    error: ToolExecutionError,
    startedAt: number,
    metadata?: Partial<ToolExecutionResult['metadata']>
  ): ToolExecutionResult {
    return {
      success: false,
      output: null,
      error,
      metadata: {
        toolId: this.id,
        toolName: this.name,
        duration: Date.now() - startedAt,
        ...metadata
      }
    };
  }
}
