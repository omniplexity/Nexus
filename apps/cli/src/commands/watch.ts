/**
 * Watch Command
 *
 * Stream workspace events from the Phase 6 WebSocket surface.
 */

import chalk from 'chalk';

import { NexusClient } from '../utils/client';

type WorkspaceSocketMessage = {
  event: string;
  data?: unknown;
  error?: string;
};

export async function watchCommand(): Promise<void> {
  const client = new NexusClient({
    baseUrl: process.env.NEXUS_API_URL || 'http://localhost:3000/api',
  });

  const snapshot = await client.getWorkspace();
  printSnapshot(snapshot.status.status, snapshot.tasks.length, snapshot.logs.length);

  const wsUrl = process.env.NEXUS_WS_URL || 'ws://localhost:3000/ws';
  const socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    console.log(chalk.green(`Connected to ${wsUrl}`));
    socket.send(JSON.stringify({ event: 'workspace:subscribe' }));
  });

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(String(event.data)) as WorkspaceSocketMessage;
      if (message.event === 'workspace:snapshot' && message.data && typeof message.data === 'object') {
        const data = message.data as {
          status?: { status?: string };
          tasks?: unknown[];
          logs?: unknown[];
        };
        printSnapshot(data.status?.status || 'unknown', data.tasks?.length || 0, data.logs?.length || 0);
        return;
      }

      const line = message.error ? `${message.event} - ${message.error}` : message.event;
      console.log(chalk.gray(`[event] ${line}`));
    } catch (error) {
      console.log(chalk.red('Failed to parse workspace event:'), error instanceof Error ? error.message : String(error));
    }
  });

  socket.addEventListener('close', () => {
    console.log(chalk.yellow('Workspace stream disconnected'));
  });

  socket.addEventListener('error', () => {
    console.log(chalk.red('Workspace stream error'));
  });
}

function printSnapshot(status: string, tasks: number, logs: number): void {
  console.log(chalk.bold('\n📡 Workspace Watch'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Status:'), chalk.white(status));
  console.log(chalk.cyan('Tasks:'), chalk.white(String(tasks)));
  console.log(chalk.cyan('Logs:'), chalk.white(String(logs)));
}
