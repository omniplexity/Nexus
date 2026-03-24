import type { ToolInputSchema, ToolOutputSchema, ToolParameter } from '../contracts/schema.js';

export interface SchemaValidationResult {
  valid: boolean;
  errors?: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateEnum(
  parameter: ToolParameter,
  value: unknown,
  path: string,
  errors: string[]
): void {
  if (!parameter.enum) {
    return;
  }

  if (!parameter.enum.some(candidate => Object.is(candidate, value))) {
    errors.push(`${path} must be one of: ${parameter.enum.map(String).join(', ')}`);
  }
}

function validateParameter(
  parameter: ToolParameter,
  value: unknown,
  path: string,
  errors: string[]
): void {
  switch (parameter.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${path} must be a string`);
        return;
      }
      validateEnum(parameter, value, path, errors);
      return;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`${path} must be a number`);
        return;
      }
      validateEnum(parameter, value, path, errors);
      return;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`${path} must be a boolean`);
        return;
      }
      validateEnum(parameter, value, path, errors);
      return;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${path} must be an array`);
        return;
      }
      if (parameter.items) {
        value.forEach((item, index) => validateParameter(parameter.items!, item, `${path}[${index}]`, errors));
      }
      return;
    case 'object':
      if (!isPlainObject(value)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (parameter.properties) {
        for (const [key, childParameter] of Object.entries(parameter.properties)) {
          const childValue = value[key];
          if (childValue === undefined) {
            if (childParameter.required) {
              errors.push(`${path}.${key} is required`);
            }
            continue;
          }

          validateParameter(childParameter, childValue, `${path}.${key}`, errors);
        }
      }
      return;
    case 'any':
      return;
    default:
      errors.push(`${path} has unsupported schema type "${parameter.type}"`);
  }
}

function validateObjectSchema(
  schema: ToolInputSchema | ToolOutputSchema,
  value: unknown,
  schemaName: string
): SchemaValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(value)) {
    return {
      valid: false,
      errors: [`${schemaName} must be an object`]
    };
  }

  for (const requiredKey of schema.required ?? []) {
    if (!(requiredKey in value)) {
      errors.push(`${schemaName}.${requiredKey} is required`);
    }
  }

  if ('additionalProperties' in schema && schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in schema.properties)) {
        errors.push(`${schemaName}.${key} is not allowed`);
      }
    }
  }

  for (const [key, parameter] of Object.entries(schema.properties)) {
    if (!(key in value)) {
      continue;
    }

    validateParameter(parameter, value[key], `${schemaName}.${key}`, errors);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function validateAgainstSchema(
  schema: ToolInputSchema | ToolOutputSchema,
  value: unknown,
  schemaName: string = 'value'
): SchemaValidationResult {
  return validateObjectSchema(schema, value, schemaName);
}
