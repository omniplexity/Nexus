import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { createToolPolicy } from '../runtime/policy.js';

import { createListDirectoryTool } from './filesystem/list-directory.js';
import { createReadFileTool } from './filesystem/read-file.js';
import { createHttpGetTool } from './http/get.js';

function createExecutionContext() {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    capabilities: {
      filesystem: {
        read: true,
        write: false,
        delete: false,
        list: true
      },
      network: {
        http: true,
        websocket: false
      },
      codeExecution: {
        sandboxed: false,
        timeout: 0
      },
      vectorSearch: false
    },
    variables: {},
    metadata: {
      requestId: 'request-1',
      timestamp: new Date()
    }
  };
}

describe('built-in tools', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'nexus-tools-'));
    await writeFile(path.join(workspaceRoot, 'note.txt'), 'hello world', 'utf8');
    await mkdir(path.join(workspaceRoot, 'docs'));
    await writeFile(path.join(workspaceRoot, 'docs', 'guide.md'), '# guide', 'utf8');
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('reads files within the workspace root and rejects traversal', async () => {
    const policy = createToolPolicy({
      filesystem: {
        rootDirectory: workspaceRoot
      }
    });

    const tool = createReadFileTool(policy.filesystem);

    const readResult = await tool.execute({ path: 'note.txt' }, createExecutionContext());
    expect(readResult.success).toBe(true);
    expect(readResult.output).toMatchObject({
      relativePath: 'note.txt',
      content: 'hello world'
    });

    const traversalResult = await tool.execute({ path: '../outside.txt' }, createExecutionContext());
    expect(traversalResult.success).toBe(false);
    expect(traversalResult.error?.code).toBe('TOL_005');
  });

  it('lists directory metadata and respects file size policy', async () => {
    const policy = createToolPolicy({
      filesystem: {
        rootDirectory: workspaceRoot,
        maxFileSizeBytes: 4
      }
    });

    const listTool = createListDirectoryTool(policy.filesystem);
    const listResult = await listTool.execute({ path: '.' }, createExecutionContext());
    expect(listResult.success).toBe(true);
    expect(listResult.output).toMatchObject({
      relativePath: '',
      truncated: false
    });

    const readTool = createReadFileTool(policy.filesystem);
    const oversizedResult = await readTool.execute({ path: 'note.txt' }, createExecutionContext());
    expect(oversizedResult.success).toBe(false);
    expect(oversizedResult.error?.code).toBe('TOL_002');
  });

  it('performs http get requests with redirect support and blocks disallowed targets by default', async () => {
    const server = http.createServer((request, response) => {
      if (request.url === '/redirect') {
        response.writeHead(302, { Location: '/final' });
        response.end();
        return;
      }

      if (request.url === '/large') {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('x'.repeat(1024));
        return;
      }

      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('ok');
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve test server address');
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;

      const defaultTool = createHttpGetTool(createToolPolicy().network);
      const blockedResult = await defaultTool.execute({ url: `${baseUrl}/final` }, createExecutionContext());
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.error?.code).toBe('TOL_005');

      const allowedTool = createHttpGetTool(
        createToolPolicy({
          network: {
            allowedProtocols: ['http:'],
            allowLocalhost: true,
            allowPrivateNetwork: true,
            maxRedirects: 1,
            maxResponseBytes: 256
          }
        }).network
      );

      const successResult = await allowedTool.execute({ url: `${baseUrl}/redirect` }, createExecutionContext());
      expect(successResult.success).toBe(true);
      expect(successResult.output).toMatchObject({
        status: 200,
        body: 'ok'
      });

      const sizeLimitedTool = createHttpGetTool(
        createToolPolicy({
          network: {
            allowedProtocols: ['http:'],
            allowLocalhost: true,
            allowPrivateNetwork: true,
            maxResponseBytes: 128
          }
        }).network
      );

      const oversizedResult = await sizeLimitedTool.execute({ url: `${baseUrl}/large` }, createExecutionContext());
      expect(oversizedResult.success).toBe(false);
      expect(oversizedResult.error?.code).toBe('TOL_002');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});
