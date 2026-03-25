import { access, readFile } from 'node:fs/promises';
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
const packageRoot = dirname(currentDir);

function resolveConfig(options: WorkspaceWebAppOptions = {}): WorkspaceWebAppConfig & { port: number } {
  const port = options.port ?? Number(process.env.NEXUS_WEB_PORT ?? 4173);
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXUS_API_BASE_URL ?? 'http://localhost:3000';
  const wsUrl = options.wsUrl ?? process.env.NEXUS_WS_URL ?? 'ws://localhost:3000/ws';
  const title = options.title ?? 'Nexus Workspace';

  return { port, apiBaseUrl, wsUrl, title };
}

async function serveAsset(response: ServerResponse, assetName: string): Promise<void> {
  const assetCandidates = [
    join(currentDir, assetName),
    join(packageRoot, 'dist', assetName),
  ];

  response.setHeader('Cache-Control', 'no-store');

  try {
    const filePath = await resolveAssetPath(assetCandidates);
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

function serveFavicon(response: ServerResponse): void {
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'image/svg+xml; charset=utf-8',
  });
  response.end(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Nexus"><rect width="64" height="64" rx="16" fill="#050814"/><path d="M14 46V18h8l12 16V18h8v28h-8L22 30v16z" fill="#7dd3fc"/></svg>`
  );
}

async function resolveAssetPath(candidates: string[]): Promise<string> {
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to resolve workspace asset');
}

export async function startWorkspaceWebApp(options: WorkspaceWebAppOptions = {}): Promise<WorkspaceWebAppRuntime> {
  const config = resolveConfig(options);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/';

    if (url === '/' || url.startsWith('/?')) {
      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(renderWorkspaceShell(config));
      return;
    }

    if (url === '/client.js' || url === '/capabilities.js' || url === '/render.js' || url === '/html.js') {
      await serveAsset(res, url.slice(1));
      return;
    }

    if (url === '/favicon.ico') {
      serveFavicon(res);
      return;
    }

    if (url.endsWith('.js.map')) {
      await serveAsset(res, url.slice(1));
      return;
    }

    if (url === '/health') {
      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      });
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
