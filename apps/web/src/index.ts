import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { renderWorkspaceShell, type WorkspaceWebAppConfig } from './html';

export interface WorkspaceWebAppRuntime {
  port: number;
  url: string;
  server: ReturnType<typeof createServer>;
  stop(): Promise<void>;
}

export interface WorkspaceWebAppOptions {
  port?: number;
  apiBaseUrl?: string;
  wsUrl?: string;
  title?: string;
}

const currentDir = dirname(fileURLToPath(import.meta.url));

function resolveConfig(options: WorkspaceWebAppOptions = {}): WorkspaceWebAppConfig & { port: number } {
  const port = options.port ?? Number(process.env.NEXUS_WEB_PORT ?? 4173);
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXUS_API_BASE_URL ?? 'http://localhost:3000';
  const wsUrl = options.wsUrl ?? process.env.NEXUS_WS_URL ?? 'ws://localhost:3000/ws';
  const title = options.title ?? 'Nexus Workspace';

  return { port, apiBaseUrl, wsUrl, title };
}

async function serveAsset(response: ServerResponse, assetName: string): Promise<void> {
  try {
    const filePath = join(currentDir, assetName);
    const contents = await readFile(filePath, 'utf8');
    const contentType = assetName.endsWith('.js')
      ? 'text/javascript; charset=utf-8'
      : 'text/plain; charset=utf-8';

    response.writeHead(200, { 'Content-Type': contentType });
    response.end(contents);
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
}

export async function startWorkspaceWebApp(options: WorkspaceWebAppOptions = {}): Promise<WorkspaceWebAppRuntime> {
  const config = resolveConfig(options);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/';

    if (url === '/' || url.startsWith('/?')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderWorkspaceShell(config));
      return;
    }

    if (url === '/client.js') {
      await serveAsset(res, 'client.js');
      return;
    }

    if (url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', app: 'workspace-web', port: config.port }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  await new Promise<void>((resolve) => {
    server.listen(config.port, resolve);
  });

  const url = `http://localhost:${config.port}`;
  console.log(`Nexus web workspace running at ${url}`);

  return {
    port: config.port,
    url,
    server,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startWorkspaceWebApp().catch((error) => {
    console.error('Failed to start workspace web app:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
