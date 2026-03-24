import {
  createWorkspaceHub,
  type WorkspaceHub,
  type WorkspaceModelRecord,
} from '@nexus/websocket';

export function getDefaultModels(): WorkspaceModelRecord[] {
  return [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      role: 'fast',
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      role: 'reasoning',
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      role: 'reasoning',
      contextWindow: 128000,
      maxOutputTokens: 4096,
    },
  ];
}

export const workspaceHub: WorkspaceHub = createWorkspaceHub({
  version: process.env.npm_package_version || '0.0.1',
  environment: process.env.NODE_ENV || 'development',
  models: getDefaultModels(),
});

export function inferRole(modelId: string): string {
  const lower = modelId.toLowerCase();

  if (lower.includes('gpt-3.5') || lower.includes('haiku') || lower.includes('flash')) {
    return 'fast';
  }

  if (lower.includes('code') || lower.includes('math')) {
    return 'specialized';
  }

  return 'reasoning';
}
