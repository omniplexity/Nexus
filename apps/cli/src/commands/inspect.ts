/**
 * Inspect Command
 *
 * Show the workspace snapshot and live control-surface state.
 */

import chalk from 'chalk';

import { NexusClient } from '../utils/client';

export async function inspectCommand(): Promise<void> {
  const client = new NexusClient({
    baseUrl: process.env.NEXUS_API_URL || 'http://localhost:3000/api',
  });

  const snapshot = await client.getWorkspace();

  console.log(chalk.bold('\n🧭 Nexus Workspace Snapshot'));
  console.log(chalk.gray('─'.repeat(50)));

  console.log(chalk.cyan('Status:'), chalk.white(snapshot.status.status));
  console.log(chalk.cyan('Version:'), chalk.white(snapshot.status.version));
  console.log(chalk.cyan('Environment:'), chalk.white(snapshot.status.environment));
  console.log(chalk.cyan('Uptime:'), chalk.white(formatUptime(snapshot.status.uptime)));
  console.log(chalk.cyan('Tasks:'), chalk.white(String(snapshot.metrics.totalTasks)));
  console.log(chalk.cyan('Connections:'), chalk.white(String(snapshot.metrics.activeConnections)));

  console.log(chalk.cyan('\nExecution Graph:'));
  if (snapshot.graph.nodes.length === 0) {
    console.log(chalk.gray('  No graph data available'));
  } else {
    for (const node of snapshot.graph.nodes.slice(0, 12)) {
      console.log(chalk.gray('  •'), chalk.white(node.label), chalk.gray(`(${node.status})`));
    }
    if (snapshot.graph.nodes.length > 12) {
      console.log(chalk.gray(`  ... and ${snapshot.graph.nodes.length - 12} more nodes`));
    }
  }

  console.log(chalk.cyan('\nRecent Logs:'));
  const recentLogs = snapshot.logs.slice(-5);
  if (recentLogs.length === 0) {
    console.log(chalk.gray('  No logs available'));
  } else {
    for (const entry of recentLogs) {
      console.log(chalk.gray('  •'), chalk.white(entry.scope), chalk.gray(`- ${entry.message}`));
    }
  }

  console.log();
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}
