import type { ToolPolicy } from '../contracts/policy.js';
import type { ToolRegistry } from '../contracts/registry.js';
import { createToolPolicy } from '../runtime/policy.js';

import { createListDirectoryTool } from './filesystem/list-directory.js';
import { createReadFileTool } from './filesystem/read-file.js';
import { createHttpGetTool } from './http/get.js';

export interface BuiltInToolOptions {
  policy?: Partial<ToolPolicy>;
}

export function createBuiltInTools(options: BuiltInToolOptions = {}) {
  const policy = createToolPolicy(options.policy);

  return [
    createReadFileTool(policy.filesystem),
    createListDirectoryTool(policy.filesystem),
    createHttpGetTool(policy.network)
  ];
}

export function registerBuiltInTools(
  registry: ToolRegistry,
  options: BuiltInToolOptions = {}
) {
  const tools = createBuiltInTools(options);
  for (const tool of tools) {
    registry.register(tool);
  }
  return tools;
}

export * from './filesystem/read-file.js';
export * from './filesystem/list-directory.js';
export * from './http/get.js';
