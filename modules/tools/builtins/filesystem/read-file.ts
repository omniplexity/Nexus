import fs from 'node:fs/promises';
import path from 'node:path';

import type { ToolPolicy } from '../../contracts/policy.js';
import { createInputSchema, createOutputSchema } from '../../contracts/schema.js';
import { ToolLifecycleStatus } from '../../contracts/tool.js';
import { BaseTool } from '../../runtime/base-tool.js';
import {
  createToolExecutionError
} from '../../runtime/error-utils.js';
import {
  assertFilesystemReadAllowed,
  resolvePolicyPath
} from '../../runtime/policy.js';

export class ReadFileTool extends BaseTool {
  constructor(private readonly policy: ToolPolicy['filesystem']) {
    super({
      id: 'filesystem.read_file',
      name: 'filesystem.read_file',
      description: 'Read a UTF-8 text file from the workspace root.',
      status: ToolLifecycleStatus.AVAILABLE,
      config: {
        timeout: 5000,
        retries: 0,
        cache: true,
        cacheTtlMs: 30000
      },
      inputSchema: createInputSchema(
        {
          path: {
            type: 'string',
            description: 'Path relative to the workspace root'
          }
        },
        ['path']
      ),
      outputSchema: createOutputSchema({
        path: { type: 'string', description: 'Normalized absolute path' },
        relativePath: { type: 'string', description: 'Path relative to the workspace root' },
        content: { type: 'string', description: 'UTF-8 file contents' },
        size: { type: 'number', description: 'File size in bytes' }
      }),
      metadata: {
        id: 'filesystem.read_file',
        name: 'filesystem.read_file',
        description: 'Read a text file from the workspace root.',
        category: 'filesystem',
        tags: ['filesystem', 'read', 'file'],
        version: '1.0.0'
      }
    });
  }

  async execute(input: unknown): Promise<import('../../contracts/tool.js').ToolExecutionResult> {
    const startedAt = Date.now();

    try {
      assertFilesystemReadAllowed(this.policy);

      const requestedPath = String((input as { path: string }).path);
      const resolvedPath = resolvePolicyPath(requestedPath, this.policy);
      const stats = await fs.stat(resolvedPath);

      if (!stats.isFile()) {
        throw createToolExecutionError('Requested path is not a file', {
          path: requestedPath
        });
      }

      if (stats.size > this.policy.maxFileSizeBytes) {
        throw createToolExecutionError('Requested file exceeds the maximum allowed size', {
          path: requestedPath,
          size: stats.size,
          maxFileSizeBytes: this.policy.maxFileSizeBytes
        });
      }

      const content = await fs.readFile(resolvedPath, 'utf8');

      return this.createSuccessResult({
        path: resolvedPath,
        relativePath: path.relative(path.resolve(this.policy.rootDirectory), resolvedPath),
        content,
        size: stats.size
      }, startedAt);
    } catch (error) {
      return this.createErrorResult(error, startedAt);
    }
  }
}

export function createReadFileTool(policy: ToolPolicy['filesystem']): ReadFileTool {
  return new ReadFileTool(policy);
}
