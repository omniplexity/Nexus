/**
 * Status Command
 * 
 * Check system status and health.
 */

import chalk from 'chalk';

import { NexusClient } from '../utils/client';

export interface StatusOptions {
  verbose?: boolean;
}

/**
 * Check system status
 */
export async function statusCommand(options: StatusOptions): Promise<void> {
  const client = new NexusClient({
    baseUrl: process.env.NEXUS_API_URL || 'http://localhost:3000/api',
  });

  try {
    // Get system status
    const status = await client.getStatus();

    // Display status
    console.log(chalk.bold('\n🔍 Nexus System Status'));
    console.log(chalk.gray('─'.repeat(40)));

    // Status indicator
    const isHealthy = status.status === 'healthy';
    const statusColor = isHealthy ? chalk.green : chalk.red;
    console.log(chalk.cyan('Status:'), statusColor(status.status || 'unknown'));

    // Version
    console.log(chalk.cyan('Version:'), chalk.white(status.version || '0.0.1'));

    // Uptime
    if (status.uptime) {
      console.log(chalk.cyan('Uptime:'), chalk.white(formatUptime(status.uptime)));
    }

    // Models
    if (status.models) {
      console.log(chalk.cyan('\nAvailable Models:'));
      for (const model of status.models.slice(0, 5)) {
        console.log(chalk.gray('  •'), chalk.white(model.name || model.id));
      }
      if (status.models.length > 5) {
        console.log(chalk.gray(`  ... and ${status.models.length - 5} more`));
      }
    }

    // Verbose info
    if (options.verbose) {
      console.log(chalk.bold('\n📋 Detailed Info'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(JSON.stringify(status, null, 2));
    }

    console.log();
  } catch (error) {
    console.log(chalk.red('❌ Unable to connect to Nexus API'));
    console.log(chalk.yellow('\nMake sure the API server is running:'));
    console.log(chalk.gray('  npm run dev --workspace=@nexus/api'));
    console.log();
    throw error;
  }
}

/**
 * Format uptime in human-readable format
 */
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
