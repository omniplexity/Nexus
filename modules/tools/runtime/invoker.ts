import { randomUUID } from 'node:crypto';

import type {
  CapabilitySet,
  ToolContext,
  ToolInvocationRequest,
  ToolInvoker,
  ToolResult
} from '@nexus/core/contracts/tool';

import type { ToolExecutor } from '../contracts/registry.js';
import type { ToolCapabilities } from '../contracts/tool.js';

function toToolCapabilities(capabilities: CapabilitySet): ToolCapabilities {
  return {
    filesystem: {
      read: capabilities.canAccessFilesystem,
      write: false,
      delete: false,
      list: capabilities.canAccessFilesystem
    },
    network: {
      http: capabilities.canAccessNetwork,
      websocket: false
    },
    codeExecution: {
      sandboxed: capabilities.canExecuteCode,
      timeout: 0
    },
    vectorSearch: capabilities.canUseVectorSearch
  };
}

function createExecutionContext(context: ToolContext) {
  return {
    sessionId: context.sessionId,
    userId: context.userId,
    capabilities: toToolCapabilities(context.capabilities),
    variables: context.variables,
    metadata: {
      requestId: randomUUID(),
      timestamp: new Date()
    }
  };
}

export class DefaultToolInvoker implements ToolInvoker {
  constructor(private readonly executor: ToolExecutor) {}

  async invoke(request: ToolInvocationRequest): Promise<ToolResult> {
    return this.executor.execute(request.toolId, request.input, createExecutionContext(request.context));
  }

  cancel(executionId: string): void {
    this.executor.cancel(executionId);
  }
}

export function createToolInvoker(executor: ToolExecutor): DefaultToolInvoker {
  return new DefaultToolInvoker(executor);
}
