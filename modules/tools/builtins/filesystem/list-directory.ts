import fs from 'node:fs/promises';
import path from 'node:path';

import type { ToolPolicy } from '../../contracts/policy.js';
import { createInputSchema, createOutputSchema } from '../../contracts/schema.js';
import { ToolLifecycleStatus } from '../../contracts/tool.js';
import { BaseTool } from '../../runtime/base-tool.js';
import { createToolExecutionError } from '../../runtime/error-utils.js';
import { assertFilesystemListAllowed, resolvePolicyPath } from '../../runtime/policy.js';

interface DirectoryEntryOutput {
  name: string;
  type: 'file' | 'directory' | 'other';
  size: number;
}

export class ListDirectoryTool extends BaseTool {
  constructor(private readonly policy: ToolPolicy['filesystem']) {
    super({
      id: 'filesystem.list_directory',
      name: 'filesystem.list_directory',
      description: 'List directory contents from the workspace root without reading file bodies.',
      status: ToolLifecycleStatus.AVAILABLE,
      config: {
        timeout: 5000,
        retries: 0,
        cache: true,
        cacheTtlMs: 15000
      },
      inputSchema: createInputSchema(
        {
          path: {
            type: 'string',
            description: 'Directory path relative to the workspace root'
          }
        },
        ['path']
      ),
      outputSchema: createOutputSchema({
        path: { type: 'string', description: 'Normalized absolute path' },
        relativePath: { type: 'string', description: 'Path relative to the workspace root' },
        truncated: { type: 'boolean', description: 'Whether the directory listing was truncated' },
        entries: {
          type: 'array',
          description: 'Directory entries',
          items: {
            type: 'object',
            description: 'Directory entry',
            properties: {
              name: { type: 'string', description: 'Entry name', required: true },
              type: { type: 'string', description: 'Entry type', required: true },
              size: { type: 'number', description: 'Entry size in bytes', required: true }
            }
          }
        }
      }),
      metadata: {
        id: 'filesystem.list_directory',
        name: 'filesystem.list_directory',
        description: 'List directory metadata from the workspace root.',
        category: 'filesystem',
        tags: ['filesystem', 'read', 'directory'],
        version: '1.0.0'
      }
    });
  }

  async execute(input: unknown): Promise<import('../../contracts/tool.js').ToolExecutionResult> {
    const startedAt = Date.now();

    try {
      assertFilesystemListAllowed(this.policy);

      const requestedPath = String((input as { path: string }).path);
      const resolvedPath = resolvePolicyPath(requestedPath, this.policy);
      const stats = await fs.stat(resolvedPath);

      if (!stats.isDirectory()) {
        throw createToolExecutionError('Requested path is not a directory', {
          path: requestedPath
        });
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const limitedEntries = entries.slice(0, this.policy.maxDirectoryEntries);

      const outputEntries: DirectoryEntryOutput[] = await Promise.all(
        limitedEntries.map(async entry => {
          const entryPath = path.join(resolvedPath, entry.name);
          const entryStats = await fs.stat(entryPath);

          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
            size: entryStats.size
          };
        })
      );

      return this.createSuccessResult({
        path: resolvedPath,
        relativePath: path.relative(path.resolve(this.policy.rootDirectory), resolvedPath),
        truncated: entries.length > this.policy.maxDirectoryEntries,
        entries: outputEntries
      }, startedAt);
    } catch (error) {
      return this.createErrorResult(error, startedAt);
    }
  }
}

export function createListDirectoryTool(policy: ToolPolicy['filesystem']): ListDirectoryTool {
  return new ListDirectoryTool(policy);
}
