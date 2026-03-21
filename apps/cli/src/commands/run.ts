/**
 * Run Command
 * 
 * Executes a task using the Nexus API.
 */

import chalk from 'chalk';
import ora from 'ora';
import { NexusClient } from '../utils/client';

export interface RunOptions {
  model?: string;
  temperature?: string;
  stream?: boolean;
  verbose?: boolean;
}

/**
 * Execute a task
 */
export async function runCommand(task: string, options: RunOptions): Promise<void> {
  const spinner = ora({
    text: 'Executing task...',
    spinner: 'dots',
  }).start();

  try {
    // Create API client
    const client = new NexusClient({
      baseUrl: process.env.NEXUS_API_URL || 'http://localhost:3000/api',
    });

    // Execute task
    const response = await client.createTask({
      input: task,
      type: 'reasoning',
      config: {
        model: options.model,
        temperature: options.temperature ? parseFloat(options.temperature) : 0.7,
      },
    });

    spinner.succeed(chalk.green('Task completed!'));

    // Display results
    console.log(chalk.bold('\n📊 Results:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    if (response.output) {
      console.log(chalk.white(response.output));
    }

    if (options.verbose && response.metrics) {
      console.log(chalk.bold('\n📈 Metrics:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('Nodes:'), `${response.metrics.completedNodes}/${response.metrics.totalNodes}`);
      console.log(chalk.cyan('Tokens:'), response.metrics.totalTokens);
      console.log(chalk.cyan('Latency:'), `${response.metrics.totalLatencyMs}ms`);
    }

    if (response.error) {
      console.log(chalk.red('\n❌ Error:'), response.error);
    }
  } catch (error) {
    spinner.fail(chalk.red('Task failed'));
    
    if (options.verbose) {
      console.error(chalk.red('Details:'), error);
    } else {
      console.log(chalk.yellow('\nTip: Run with --verbose for more details'));
    }
    
    throw error;
  }
}
