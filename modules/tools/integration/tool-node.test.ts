import { NodeStatus, NodeType } from '@nexus/core/contracts/node';
import type { ExecutionContext, Task , DAG } from '@nexus/core/contracts/orchestrator';

import { MinimalOrchestrator } from '../../../systems/orchestration/engine/orchestrator.js';
import { ToolNode } from '../../../systems/orchestration/nodes/tool.js';
import { createReadFileTool } from '../builtins/filesystem/read-file.js';
import { createToolExecutor } from '../runtime/executor.js';
import { createToolInvoker } from '../runtime/invoker.js';
import { createToolPolicy } from '../runtime/policy.js';
import { createToolRegistry } from '../runtime/registry.js';
import { EchoTool } from '../test-helpers/fake-tool.js';

function createExecutionContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    memory: {
      session: [],
      persistent: [],
      derived: [],
      totalTokens: 0
    },
    capabilities: {
      canAccessFilesystem: true,
      canExecuteCode: false,
      canAccessNetwork: true,
      canUseVectorSearch: false,
      customCapabilities: {}
    },
    variables: {},
    metadata: {
      startTime: new Date(),
      attemptNumber: 1
    },
    ...overrides
  };
}

describe('ToolNode integration', () => {
  it('executes a real registered tool through ToolInvoker', async () => {
    const registry = createToolRegistry();
    registry.register(new EchoTool());
    const invoker = createToolInvoker(createToolExecutor(registry));

    const node = new ToolNode({
      id: 'tool-1',
      name: 'Echo Node',
      toolId: 'test.echo',
      toolName: 'test.echo',
      invoker
    });

    const result = await node.execute({
      nodeId: node.id,
      data: { value: 'hello' },
      dependencies: {},
      context: {
        sessionId: 'session-1',
        userId: 'user-1',
        capabilities: createExecutionContext().capabilities,
        variables: {}
      }
    });

    expect(result.status).toBe(NodeStatus.COMPLETED);
    expect(result.data).toEqual({
      toolId: 'test.echo',
      toolName: 'test.echo',
      output: { echoed: 'hello' }
    });
  });

  it('returns failures for missing tools, schema errors, and denied capabilities', async () => {
    const registry = createToolRegistry();
    registry.register(new EchoTool());
    registry.register(createReadFileTool(createToolPolicy().filesystem));
    const invoker = createToolInvoker(createToolExecutor(registry));

    const missingNode = new ToolNode({
      id: 'tool-missing',
      name: 'Missing Tool Node',
      toolId: 'missing.tool',
      toolName: 'missing.tool',
      invoker
    });

    const missingResult = await missingNode.execute({
      nodeId: missingNode.id,
      data: {},
      dependencies: {},
      context: {
        sessionId: 'session-1',
        capabilities: createExecutionContext().capabilities,
        variables: {}
      }
    });
    expect(missingResult.status).toBe(NodeStatus.FAILED);
    expect(missingResult.error).toContain('Tool not found');

    const invalidInputNode = new ToolNode({
      id: 'tool-invalid',
      name: 'Invalid Input Node',
      toolId: 'test.echo',
      toolName: 'test.echo',
      invoker
    });

    const invalidInputResult = await invalidInputNode.execute({
      nodeId: invalidInputNode.id,
      data: {},
      dependencies: {},
      context: {
        sessionId: 'session-1',
        capabilities: createExecutionContext().capabilities,
        variables: {}
      }
    });
    expect(invalidInputResult.status).toBe(NodeStatus.FAILED);
    expect(invalidInputResult.error).toContain('validation');

    const deniedNode = new ToolNode({
      id: 'tool-denied',
      name: 'Denied Tool Node',
      toolId: 'filesystem.read_file',
      toolName: 'filesystem.read_file',
      invoker
    });

    const deniedResult = await deniedNode.execute({
      nodeId: deniedNode.id,
      data: { path: 'README.md' },
      dependencies: {},
      context: {
        sessionId: 'session-1',
        capabilities: {
          ...createExecutionContext().capabilities,
          canAccessFilesystem: false
        },
        variables: {}
      }
    });
    expect(deniedResult.status).toBe(NodeStatus.FAILED);
    expect(deniedResult.error).toContain('Filesystem capability');
  });

  it('allows MinimalOrchestrator to execute an explicit mixed DAG with injected tool runtime', async () => {
    const registry = createToolRegistry();
    registry.register(new EchoTool());
    const invoker = createToolInvoker(createToolExecutor(registry));

    const toolNode = new ToolNode({
      id: 'tool-node',
      name: 'Tool Node',
      toolId: 'test.echo',
      toolName: 'test.echo'
    });

    const reasoningNode = {
      id: 'reasoning-node',
      type: NodeType.REASONING,
      name: 'Reasoning Stub',
      config: {},
      async execute() {
        return {
          nodeId: 'reasoning-node',
          data: 'reasoned output',
          status: NodeStatus.COMPLETED,
          metadata: {
            startTime: new Date(),
            endTime: new Date(),
            tokensUsed: 1
          }
        };
      },
      validate() {
        return true;
      },
      getDependencies() {
        return [];
      },
      clone() {
        return this;
      }
    };

    const dag: DAG = {
      id: 'explicit-dag',
      nodes: {
        'reasoning-node': reasoningNode,
        'tool-node': toolNode
      },
      edges: []
    };

    const task: Task = {
      id: 'task-1',
      type: 'explicit-dag',
      input: { value: 'from-task' },
      metadata: {
        dag
      }
    };

    const orchestrator = new MinimalOrchestrator();
    orchestrator.setToolInvoker(invoker);

    const result = await orchestrator.execute(task, createExecutionContext());

    expect(result.status).toBe('completed');
    expect(result.metrics.completedNodes).toBe(2);
    expect(result.nodeOutputs['tool-node'].status).toBe(NodeStatus.COMPLETED);
    expect(result.output).toEqual({
      'reasoning-node': 'reasoned output',
      'tool-node': {
        toolId: 'test.echo',
        toolName: 'test.echo',
        output: { echoed: 'from-task' }
      }
    });
  });

  it('hydrates plain object tool nodes inside explicit DAGs', async () => {
    const registry = createToolRegistry();
    registry.register(new EchoTool());
    const invoker = createToolInvoker(createToolExecutor(registry));

    const orchestrator = new MinimalOrchestrator();
    orchestrator.setToolInvoker(invoker);

    const task: Task = {
      id: 'task-2',
      type: 'explicit-dag',
      input: { value: 'plain-object' },
      metadata: {
        dag: {
          id: 'plain-dag',
          nodes: {
            'tool-node': {
              id: 'tool-node',
              type: NodeType.TOOL,
              name: 'Plain Tool Node',
              config: {
                toolId: 'test.echo',
                toolName: 'test.echo'
              },
              async execute() {
                throw new Error('Should be replaced by ToolNode hydration');
              },
              validate() {
                return true;
              },
              getDependencies() {
                return [];
              },
              clone() {
                return this;
              }
            }
          },
          edges: []
        }
      }
    };

    const result = await orchestrator.execute(task, createExecutionContext());

    expect(result.status).toBe('completed');
    expect(result.nodeOutputs['tool-node'].status).toBe(NodeStatus.COMPLETED);
    expect(result.output).toEqual({
      toolId: 'test.echo',
      toolName: 'test.echo',
      output: { echoed: 'plain-object' }
    });
  });
});
