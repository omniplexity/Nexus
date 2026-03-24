import path from 'node:path';

import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@nexus\/core\/(.*)$/,
        replacement: path.join(repoRoot, 'core', '$1')
      },
      {
        find: '@nexus/core',
        replacement: path.join(repoRoot, 'core')
      },
      {
        find: /^@nexus\/systems-memory\/(.*)$/,
        replacement: path.join(repoRoot, 'systems', 'memory', '$1')
      },
      {
        find: '@nexus/systems-memory',
        replacement: path.join(repoRoot, 'systems', 'memory')
      },
      {
        find: /^@nexus\/systems\/(.*)$/,
        replacement: path.join(repoRoot, 'systems', '$1')
      },
      {
        find: '@nexus/systems',
        replacement: path.join(repoRoot, 'systems')
      }
    ]
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['runtime/**/*.test.ts', 'builtins/**/*.test.ts', 'integration/**/*.test.ts']
  }
});
