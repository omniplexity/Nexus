/**
 * Models Command
 * 
 * List available models from the API.
 */

import chalk from 'chalk';
import { NexusClient } from '../utils/client';

/**
 * List available models
 */
export async function modelsCommand(): Promise<void> {
  const client = new NexusClient({
    baseUrl: process.env.NEXUS_API_URL || 'http://localhost:3000/api',
  });

  try {
    const models = await client.listModels();

    if (models.length === 0) {
      console.log(chalk.yellow('No models available'));
      return;
    }

    console.log(chalk.bold('\n📦 Available Models'));
    console.log(chalk.gray('─'.repeat(50)));

    // Group models by role
    const byRole: Record<string, typeof models> = {};
    for (const model of models) {
      const role = model.role || 'unknown';
      if (!byRole[role]) {
        byRole[role] = [];
      }
      byRole[role].push(model);
    }

    // Display by role
    for (const [role, roleModels] of Object.entries(byRole)) {
      console.log(chalk.cyan(`\n${role.toUpperCase()}:`));
      for (const model of roleModels) {
        const name = chalk.white(model.name || model.id);
        const tokens = model.maxOutputTokens ? chalk.gray(`${model.maxOutputTokens}t`) : '';
        const context = model.contextWindow ? chalk.gray(`${model.contextWindow}c`) : '';
        
        console.log(chalk.gray('  •'), name, tokens, context);
      }
    }

    console.log();
  } catch (error) {
    console.log(chalk.red('❌ Unable to fetch models'));
    console.log(chalk.yellow('\nMake sure the API server is running'));
    throw error;
  }
}
