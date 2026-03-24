import { pathToFileURL } from 'node:url';

import { startWorkspaceWebApp } from '@nexus/web';

import { openWorkspaceUrl } from './launcher';

async function main(): Promise<void> {
  const webPort = Number(process.env.NEXUS_WEB_PORT ?? 4173);
  const apiBaseUrl = process.env.NEXUS_API_BASE_URL ?? 'http://localhost:3000';
  const wsUrl = process.env.NEXUS_WS_URL ?? 'ws://localhost:3000/ws';

  const runtime = await startWorkspaceWebApp({
    port: webPort,
    apiBaseUrl,
    wsUrl,
    title: 'Nexus Desktop Workspace',
  });

  try {
    await openWorkspaceUrl(runtime.url);
  } catch (error) {
    console.warn('Unable to open desktop workspace automatically:', error instanceof Error ? error.message : String(error));
  }

  console.log(`Desktop workspace ready at ${runtime.url}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error('Failed to start desktop workspace:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
