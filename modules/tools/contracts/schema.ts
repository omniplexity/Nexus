/**
 * Tool Schema Contracts for Nexus
 * 
 * Defines JSON Schema types for tool input/output validation.
 */

/**
 * JSON Schema type alias for cleaner imports
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

/**
 * Tool input schema
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool output schema
 */
export interface ToolOutputSchema {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

/**
 * Creates a JSON Schema from ToolInputSchema
 */
export function createInputSchema(properties: Record<string, ToolParameter>, required?: string[]): ToolInputSchema {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false
  };
}

/**
 * Creates a JSON Schema from ToolOutputSchema
 */
export function createOutputSchema(properties: Record<string, ToolParameter>): ToolOutputSchema {
  return {
    type: 'object',
    properties
  };
}

/**
 * Common schema definitions using generic Record type
 */
export const CommonSchemas: Record<string, ToolInputSchema | ToolOutputSchema> = {
  /** String input */
  string: {
    type: 'object',
    properties: {
      value: { type: 'string', description: 'String value', required: true }
    }
  },

  /** Number input */
  number: {
    type: 'object',
    properties: {
      value: { type: 'number', description: 'Number value', required: true }
    }
  },

  /** Boolean input */
  boolean: {
    type: 'object',
    properties: {
      value: { type: 'boolean', description: 'Boolean value', required: true }
    }
  },

  /** Array input */
  array: {
    type: 'object',
    properties: {
      items: { type: 'array', description: 'Array of items', required: true }
    }
  },

  /** Object input */
  object: {
    type: 'object',
    properties: {
      data: { type: 'object', description: 'Object data', required: true }
    }
  },

  /** Any output */
  any: {
    type: 'object',
    properties: {
      result: { type: 'any', description: 'Any result', required: true }
    }
  },

  /** Success output */
  success: {
    type: 'object',
    properties: {
      success: { type: 'boolean', description: 'Success flag', required: true },
      message: { type: 'string', description: 'Result message' }
    },
    required: ['success']
  },

  /** Error output */
  error: {
    type: 'object',
    properties: {
      success: { type: 'boolean', description: 'Success flag', required: true },
      error: { type: 'string', description: 'Error message', required: true },
      code: { type: 'string', description: 'Error code' }
    },
    required: ['success', 'error']
  }
} as const;
