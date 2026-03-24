import { ErrorCode, ToolError, ValidationError, createErrorResponse, isNexusError } from '@nexus/core/contracts/errors';
import type { ToolExecutionError } from '@nexus/core/contracts/tool';

export function toToolExecutionError(
  error: unknown,
  fallbackCode: ErrorCode = ErrorCode.TOL_002
): ToolExecutionError {
  if (isNexusError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message
    };
  }

  return {
    code: fallbackCode,
    message: String(error)
  };
}

export function createValidationError(message: string, details?: Record<string, unknown>): ValidationError {
  return new ValidationError(message, details);
}

export function createToolAuthorizationError(
  message: string,
  details?: Record<string, unknown>
): ToolError {
  return new ToolError(message, ErrorCode.TOL_005, details);
}

export function createToolExecutionError(message: string, details?: Record<string, unknown>): ToolError {
  return new ToolError(message, ErrorCode.TOL_002, details);
}

export function createToolTimeoutError(message: string, details?: Record<string, unknown>): ToolError {
  return new ToolError(message, ErrorCode.TOL_003, details);
}

export function createToolInputError(message: string, details?: Record<string, unknown>): ToolError {
  return new ToolError(message, ErrorCode.TOL_004, details);
}

export function createToolNotFoundError(message: string, details?: Record<string, unknown>): ToolError {
  return new ToolError(message, ErrorCode.TOL_001, details);
}

export function createSafeErrorDetails(error: unknown): Record<string, unknown> {
  return createErrorResponse(error);
}
