#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const nodeCommand = process.execPath;
const tsxCommand = resolve(repoRoot, 'interfaces/api/node_modules/tsx/dist/cli.mjs');
const tscCommand = resolve(repoRoot, 'node_modules/typescript/bin/tsc');
const apiPort = Number(process.env.NEXUS_API_PORT ?? process.env.PORT ?? 3000);
const apiBaseUrl = process.env.NEXUS_API_URL ?? `http://localhost:${apiPort}/api`;
const apiHealthUrl = `${apiBaseUrl}/health`;
const apiWsUrl = process.env.NEXUS_WS_URL ?? `ws://localhost:${apiPort}/ws`;

const targets = new Map([
  ['api', { label: 'API server', mode: 'api' }],
  ['web', { label: 'Web workspace', mode: 'web' }],
  ['desktop', { label: 'Desktop workspace', mode: 'desktop' }],
  ['cli', { label: 'CLI', mode: 'cli' }],
]);

const [, , rawTarget, ...rawArgs] = process.argv;
const target = rawTarget?.trim();

if (!target || target === '--help' || target === '-h') {
  printHelp();
  process.exit(0);
}

if (!targets.has(target)) {
  console.error(`Unknown target: ${target}`);
  printHelp();
  process.exit(1);
}

const args = rawArgs.filter((value) => value !== '--');
const children = new Set();
let shuttingDown = false;

process.on('SIGINT', () => {
  void shutdown(130);
});

process.on('SIGTERM', () => {
  void shutdown(143);
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  void shutdown(1);
});

async function main() {
  const targetConfig = targets.get(target);
  if (!targetConfig) {
    throw new Error(`Unsupported target: ${target}`);
  }

  if (targetConfig.mode === 'api') {
    if (await waitForPortOpen(apiPort, 10, 250)) {
      logLauncher(`Reusing existing API listener on port ${apiPort}`);
      console.log(`Nexus API is already running at ${apiBaseUrl}`);
      return;
    }

    logLauncher(`Starting API on port ${apiPort}`);
    await runManagedForeground(nodeCommand, [tsxCommand, 'watch', 'src/index.ts'], resolve(repoRoot, 'interfaces/api'), {
      PORT: String(apiPort),
    });
    return;
  }

  if (targetConfig.mode === 'web') {
    logLauncher(`Starting web workspace on port ${process.env.NEXUS_WEB_PORT ?? 4173}`);
    const apiState = await ensureApiRunning();
    if (!apiState.reused) {
      children.add(apiState.child);
      await waitForHealth(apiHealthUrl);
    }
    const bundleWatcher = startBackground(
      nodeCommand,
      [tscCommand, '--watch'],
      resolve(repoRoot, 'apps/web')
    );
    children.add(bundleWatcher);
    await waitForFile(resolve(repoRoot, 'apps/web/dist/client.js'));
    const runtime = await runManagedForeground(
      nodeCommand,
      [tsxCommand, 'watch', 'src/index.ts'],
      resolve(repoRoot, 'apps/web'),
      {
        NEXUS_API_BASE_URL: process.env.NEXUS_API_BASE_URL ?? `http://localhost:${apiPort}`,
        NEXUS_WS_URL: apiWsUrl,
      }
    );
    await shutdown(runtime.code ?? 0);
    return;
  }

  if (targetConfig.mode === 'desktop') {
    logLauncher(`Starting desktop workspace on port ${process.env.NEXUS_WEB_PORT ?? 4173}`);
    const apiState = await ensureApiRunning();
    if (!apiState.reused) {
      children.add(apiState.child);
      await waitForHealth(apiHealthUrl);
    }
    const bundleWatcher = startBackground(
      nodeCommand,
      [tscCommand, '--watch'],
      resolve(repoRoot, 'apps/web')
    );
    children.add(bundleWatcher);
    await waitForFile(resolve(repoRoot, 'apps/web/dist/client.js'));
    const runtime = await runManagedForeground(
      nodeCommand,
      [tsxCommand, 'watch', 'src/index.ts'],
      resolve(repoRoot, 'apps/desktop'),
      {
        NEXUS_API_BASE_URL: process.env.NEXUS_API_BASE_URL ?? `http://localhost:${apiPort}`,
        NEXUS_WS_URL: apiWsUrl,
      }
    );
    await shutdown(runtime.code ?? 0);
    return;
  }

  if (targetConfig.mode === 'cli') {
    logLauncher('Starting CLI command runner');
    const apiState = await ensureApiRunning();
    if (!apiState.reused) {
      children.add(apiState.child);
      await waitForHealth(apiHealthUrl);
    }

    const cliArgs = args.length > 0 ? args : ['status'];
    if (args.length === 0) {
      console.log('No CLI command provided. Defaulting to `status`.');
    }

    const runtime = await runManagedForeground(
      nodeCommand,
      [tsxCommand, 'src/index.ts', ...cliArgs],
      resolve(repoRoot, 'apps/cli'),
      {
        NEXUS_API_URL: apiBaseUrl,
      }
    );
    await shutdown(runtime.code ?? 0);
  }
}

function startBackground(command, commandArgs, cwd, extraEnv = {}) {
  const child = spawn(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: false,
  });

  child.once('exit', (code, signal) => {
    if (!shuttingDown && code !== 0 && signal !== 'SIGINT' && signal !== 'SIGTERM') {
      console.error(`Background process exited unexpectedly (${code ?? signal ?? 'unknown'}).`);
      void shutdown(code ?? 1);
    }
  });

  child.once('error', (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    void shutdown(1);
  });

  return child;
}

function runProcess(command, commandArgs, cwd, extraEnv = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv,
      },
      shell: false,
    });

    children.add(child);

    child.once('error', async (error) => {
      children.delete(child);
      rejectPromise(error);
    });

    child.once('exit', async (code, signal) => {
      children.delete(child);
      resolvePromise({ code, signal });
    });
  });
}

async function runManagedForeground(command, commandArgs, cwd, extraEnv = {}) {
  const result = await runProcess(command, commandArgs, cwd, extraEnv);

  if (result.code === 0 || result.signal === 'SIGINT' || result.signal === 'SIGTERM') {
    return result;
  }

  throw new Error(`Process failed with ${result.code ?? result.signal ?? 'unknown'}`);
}

async function waitForHealth(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting until the API is ready.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureApiRunning() {
  if (await waitForPortOpen(apiPort, 10, 250)) {
    logLauncher(`Reusing API on port ${apiPort}`);
    return { reused: true };
  }

  logLauncher(`API port ${apiPort} is free; starting API`);
  const child = startBackground(
    nodeCommand,
    [tsxCommand, 'watch', 'src/index.ts'],
    resolve(repoRoot, 'interfaces/api'),
    {
      PORT: String(apiPort),
    }
  );

  return { reused: false, child };
}

async function isPortOpen(port) {
  for (const host of ['127.0.0.1', '::1']) {
    const reachable = await canConnect(host, port);
    if (reachable) {
      return true;
    }
  }

  return false;
}

async function waitForPortOpen(port, attempts = 1, delayMs = 0) {
  for (let index = 0; index < attempts; index += 1) {
    if (await isPortOpen(port)) {
      return true;
    }

    if (delayMs > 0 && index < attempts - 1) {
      await delay(delayMs);
    }
  }

  return false;
}

async function waitForFile(filePath, timeoutMs = 30_000, delayMs = 250) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      // Keep waiting until the bundle exists.
    }

    await delay(delayMs);
  }

  throw new Error(`Timed out waiting for ${filePath}`);
}

async function canConnect(host, port) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host, port });

    socket.once('connect', () => {
      socket.destroy();
      resolvePromise(true);
    });

    socket.once('error', () => {
      resolvePromise(false);
    });

    socket.setTimeout(500, () => {
      socket.destroy();
      resolvePromise(false);
    });
  });
}

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function shutdown(exitCode) {
  if (shuttingDown) {
    process.exitCode = exitCode;
    return;
  }

  shuttingDown = true;
  process.exitCode = exitCode;

  for (const child of children) {
    try {
      child.kill('SIGINT');
    } catch {
      // Best effort on shutdown.
    }
  }

  await delay(250);

  for (const child of children) {
    try {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    } catch {
      // Best effort on shutdown.
    }
  }

  children.clear();
}

function printHelp() {
  console.log(`Nexus launchers

Usage:
  npm run launch -- <target> [args...]

Targets:
  api       Start the API server in watch mode
  web       Start API + web workspace with live rebuilds
  desktop   Start API + desktop workspace with live rebuilds
  cli       Start API + CLI command runner

Examples:
  npm run launch -- api
  npm run launch -- web
  npm run launch -- desktop
  npm run launch -- cli status
  npm run launch -- cli run "What should the first screen show?"
`);
}

function logLauncher(message) {
  console.log(`[launcher] ${message}`);
}
