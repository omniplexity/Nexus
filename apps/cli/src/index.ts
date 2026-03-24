#!/usr/bin/env node

/**
 * Nexus CLI Entry Point
 * 
 * Command-line interface for Nexus.
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { runCommand } from './commands/run';
import { statusCommand } from './commands/status';
import { version } from './utils/version';

const program = new Command();

program
  .name('nexus')
  .description('Nexus - Cognitive Operating System for AI Orchestration')
  .version(version);

/**
 * Run command - Execute a task
 */
program
  .command('run <task>')
  .description('Execute a task')
  .option('-m, --model <model>', 'Model to use', 'gpt-4o-mini')
  .option('-t, --temperature <value>', 'Temperature for model', '0.7')
  .option('--stream', 'Stream the response', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (task: string, options) => {
    try {
      await runCommand(task, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Status command - Check system status
 */
program
  .command('status')
  .description('Check system status')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      await statusCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Models command - List available models
 */
program
  .command('models')
  .description('List available models')
  .action(async () => {
    try {
      const { modelsCommand } = await import('./commands/models');
      await modelsCommand();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('Invalid command:'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}
