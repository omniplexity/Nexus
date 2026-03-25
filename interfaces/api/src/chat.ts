import { randomUUID } from 'node:crypto';

import { ModelRole, MessageRole, type Message, type ModelRequest, type ToolDefinition } from '@nexus/core/contracts/model-provider';
import type { ChatPlan, ChatRequest, ChatResponse, ChatToolRun } from '@nexus/interfaces/contracts/chat';
import { createOpenAIProvider } from '@nexus/models';
import { createToolExecutor, createToolPolicy, createToolRegistry, registerBuiltInTools, type Tool } from '@nexus/tools';
import type { WorkspaceGraph, WorkspaceGraphEdge, WorkspaceGraphNode, WorkspaceTaskRecord } from '@nexus/websocket';

import { workspaceHub } from './workspace';

type PlannerState = {
  taskId: string;
  conversationId: string;
  request: ChatRequest;
  createdAt: string;
  modelId: string;
  toolDefinitions: ToolDefinition[];
  toolsByName: Map<string, Tool>;
};

const toolRegistry = createToolRegistry();
registerBuiltInTools(toolRegistry, {
  policy: createToolPolicy({
    filesystem: {
      rootDirectory: process.cwd(),
      allowRead: true,
      allowList: true,
    },
    network: {
      allowHttpGet: true,
      allowLocalhost: false,
      allowPrivateNetwork: false,
    },
  }),
});

const toolExecutor = createToolExecutor(toolRegistry);

function escapeControl(value: string): string {
  return value.replaceAll('\r', '').trim();
}

function toolToDefinition(tool: Tool): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: schemaToJson(tool.inputSchema),
    },
  };
}

function schemaToJson(schema: Tool['inputSchema']): Record<string, unknown> {
  return {
    type: schema.type,
    properties: Object.fromEntries(
      Object.entries(schema.properties).map(([key, parameter]) => [key, parameterToJson(parameter)])
    ),
    ...(schema.required ? { required: schema.required } : {}),
    ...(schema.additionalProperties !== undefined ? { additionalProperties: schema.additionalProperties } : {}),
  };
}

function parameterToJson(parameter: Tool['inputSchema']['properties'][string]): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    type: parameter.type,
    description: parameter.description,
  };

  if (parameter.required !== undefined) {
    mapped.required = parameter.required;
  }
  if (parameter.default !== undefined) {
    mapped.default = parameter.default;
  }
  if (parameter.enum !== undefined) {
    mapped.enum = parameter.enum;
  }
  if (parameter.items !== undefined) {
    mapped.items = parameterToJson(parameter.items);
  }
  if (parameter.properties !== undefined) {
    mapped.properties = Object.fromEntries(
      Object.entries(parameter.properties).map(([key, value]) => [key, parameterToJson(value)])
    );
  }

  return mapped;
}

function buildPlannerMessages(request: ChatRequest): Message[] {
  const messages: Message[] = [
    {
      role: MessageRole.SYSTEM,
      content: [
        'You are Nexus, a master orchestration assistant.',
        'Your job is to produce a short plan, choose only the tools required, and then let the tool runtime execute them.',
        'Prefer the smallest useful tool set.',
        'If no tool is needed, answer directly.',
        'Keep the plan concise and concrete.',
      ].join(' '),
    },
  ];

  for (const line of request.context ?? []) {
    messages.push({
      role: MessageRole.SYSTEM,
      content: line,
    });
  }

  messages.push({
    role: MessageRole.USER,
    content: escapeControl(request.message),
  });

  return messages;
}

function buildHeuristicPlan(request: ChatRequest, toolNames: string[]): ChatPlan {
  const lower = request.message.toLowerCase();
  const selectedTools = toolNames.filter((toolName) => {
    if (toolName === 'filesystem.read_file') {
      return /read|inspect|open|source|file/.test(lower);
    }
    if (toolName === 'filesystem.list_directory') {
      return /list|tree|directory|repo|structure|files/.test(lower);
    }
    if (toolName === 'http.get') {
      return /http|url|docs|documentation|website|reference|link/.test(lower);
    }
    return false;
  });

  const summary = selectedTools.length > 0
    ? `Plan: use ${selectedTools.join(', ')} to gather the needed context, then answer the request.`
    : 'Plan: respond directly because no tool access is required for this request.';

  return {
    summary,
    selectedTools,
    steps: selectedTools.map((toolId, index) => ({
      id: `step-${index + 1}`,
      title: `Run ${toolId}`,
      description: `Use ${toolId} to support the request.`,
      toolId,
      status: 'planned',
    })),
  };
}

function createGraph(taskId: string, plan: ChatPlan, toolRuns: ChatToolRun[], finalStatus: WorkspaceTaskRecord['status']): WorkspaceGraph {
  const nodes: WorkspaceGraphNode[] = [
    {
      id: `${taskId}:prompt`,
      label: 'User prompt',
      type: 'chat',
      status: 'completed',
      description: 'Incoming master chat request',
    },
    {
      id: `${taskId}:plan`,
      label: 'Plan',
      type: 'planner',
      status: finalStatus === 'failed' ? 'failed' : 'completed',
      description: plan.summary,
    },
    ...toolRuns.map((run) => ({
      id: `${taskId}:${run.toolId}`,
      label: run.toolName,
      type: 'tool',
      status: run.status,
      description: run.error || run.output ? 'Tool execution result available' : 'Tool execution pending',
    })),
    {
      id: `${taskId}:final`,
      label: 'Final answer',
      type: 'assistant',
      status: finalStatus,
      description: 'Assistant response to the user',
    },
  ];

  const edges: WorkspaceGraphEdge[] = [
    { sourceId: `${taskId}:prompt`, targetId: `${taskId}:plan` },
    ...toolRuns.map((run) => ({
      sourceId: `${taskId}:plan`,
      targetId: `${taskId}:${run.toolId}`,
      condition: run.toolId,
    })),
    { sourceId: `${taskId}:plan`, targetId: `${taskId}:final` },
  ];

  return {
    id: `chat-${taskId}`,
    nodes,
    edges,
    activeTaskId: taskId,
  };
}

function toToolExecutionContext(taskId: string): import('@nexus/tools').ToolExecutionContext {
  return {
    sessionId: taskId,
    capabilities: {
      filesystem: {
        read: true,
        write: false,
        delete: false,
        list: true,
      },
      network: {
        http: true,
        websocket: false,
      },
      codeExecution: {
        sandboxed: false,
        timeout: 0,
      },
      vectorSearch: false,
    },
    variables: {},
    metadata: {
      requestId: taskId,
      timestamp: new Date(),
    },
  };
}

function getPlannerProvider(): ReturnType<typeof createOpenAIProvider> | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return createOpenAIProvider();
}

function serializeResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function parseToolArguments(rawArguments: string): unknown {
  try {
    return JSON.parse(rawArguments);
  } catch {
    return { input: rawArguments };
  }
}

function inferFallbackToolInput(toolId: string, message: string): unknown {
  const fileMatch = message.match(/(?:read|inspect|open)\s+(?:the\s+)?([A-Za-z0-9_./\\-]+\.[A-Za-z0-9]+|[A-Za-z0-9_./\\-]+)/i);
  const urlMatch = message.match(/https?:\/\/[^\s)]+/i);

  if (toolId === 'filesystem.read_file') {
    return { path: fileMatch?.[1] ?? 'README.md' };
  }

  if (toolId === 'filesystem.list_directory') {
    return { path: fileMatch?.[1] ?? '.' };
  }

  if (toolId === 'http.get') {
    return { url: urlMatch?.[0] ?? 'https://example.com' };
  }

  return {};
}

async function planAndExecuteChat(state: PlannerState): Promise<void> {
  const provider = getPlannerProvider();
  const createdAt = state.createdAt;
  const toolNames = state.toolDefinitions.map((definition) => definition.function.name);

  workspaceHub.appendLog({
    level: 'info',
    scope: 'chat',
    message: `Planning chat task ${state.taskId}`,
    details: {
      conversationId: state.conversationId,
      model: state.modelId,
    },
  });

  workspaceHub.recordEvent({
    event: 'chat:plan-start',
    timestamp: createdAt,
    data: {
      taskId: state.taskId,
      conversationId: state.conversationId,
      message: state.request.message,
      model: state.modelId,
    },
    source: 'api/chat',
  });

  let plan: ChatPlan = buildHeuristicPlan(state.request, toolNames);
  let finalAnswer = '';
  const toolRuns: ChatToolRun[] = [];
  const assistantMessages: Message[] = [];

  try {
    if (provider) {
      const modelRequest: ModelRequest = {
        model: state.modelId,
        messages: buildPlannerMessages(state.request),
        tools: state.toolDefinitions,
        config: {
          role: ModelRole.REASONING,
          temperature: state.request.temperature ?? 0.2,
          maxTokens: state.request.maxTokens ?? 2048,
        },
      };

      const plannerResponse = await provider.complete(modelRequest);
      const selectedToolIds = plannerResponse.toolCalls?.map((toolCall) => toolCall.function.name).filter(Boolean) ?? [];

      plan = {
        summary: plannerResponse.content.trim() || plan.summary,
        selectedTools: selectedToolIds.length > 0 ? selectedToolIds : plan.selectedTools,
        steps: (selectedToolIds.length > 0 ? selectedToolIds : plan.selectedTools).map((toolId, index) => ({
          id: `step-${index + 1}`,
          title: `Use ${toolId}`,
          description: `Execute ${toolId} to satisfy the request.`,
          toolId,
          status: 'planned',
        })),
      };

      assistantMessages.push({
        role: MessageRole.ASSISTANT,
        content: plan.summary,
        toolCalls: plannerResponse.toolCalls,
      });
    }
  } catch (error) {
    workspaceHub.appendLog({
      level: 'warn',
      scope: 'chat',
      message: `Planner failed for chat task ${state.taskId}; using heuristic plan`,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  workspaceHub.recordEvent({
    event: 'chat:plan-ready',
    timestamp: new Date().toISOString(),
    data: {
      taskId: state.taskId,
      plan,
    },
    source: 'api/chat',
  });

  workspaceHub.upsertTask({
    taskId: state.taskId,
    type: 'chat',
    status: 'running',
    createdAt,
    inputPreview: state.request.message,
    metadata: {
      conversationId: state.conversationId,
      chat: {
        request: state.request,
        plan,
        model: state.modelId,
      },
    },
    graph: createGraph(state.taskId, plan, toolRuns, 'running'),
  });

  if (plan.selectedTools.length === 0) {
    finalAnswer = plan.summary;
  } else {
    const toolContext = toToolExecutionContext(state.taskId);
    const toolMessages: Message[] = [];

    for (const toolId of plan.selectedTools) {
      const tool = state.toolsByName.get(toolId);
      if (!tool) {
        const missingRun: ChatToolRun = {
          toolId,
          toolName: toolId,
          input: {},
          status: 'failed',
          error: `Tool "${toolId}" is not registered`,
        };
        toolRuns.push(missingRun);
        workspaceHub.recordEvent({
          event: 'chat:tool-result',
          timestamp: new Date().toISOString(),
          data: {
            taskId: state.taskId,
            run: missingRun,
          },
          source: 'api/chat',
        });
        continue;
      }

      const selectedCall = assistantMessages.at(0)?.toolCalls?.find((call) => call.function.name === toolId);
      const toolInput = selectedCall
        ? parseToolArguments(selectedCall.function.arguments)
        : inferFallbackToolInput(toolId, state.request.message);

      workspaceHub.recordEvent({
        event: 'chat:tool-start',
        timestamp: new Date().toISOString(),
        data: {
          taskId: state.taskId,
          toolId,
          toolName: tool.name,
          input: toolInput,
        },
        source: 'api/chat',
      });

      const startedAt = Date.now();
      const result = await toolExecutor.executeByName(tool.name, toolInput, toolContext);
      const run: ChatToolRun = {
        toolId: tool.id,
        toolName: tool.name,
        input: toolInput,
        output: result.output,
        status: result.success ? 'completed' : 'failed',
        durationMs: Date.now() - startedAt,
        error: result.error?.message,
      };
      toolRuns.push(run);

      workspaceHub.recordEvent({
        event: 'chat:tool-result',
        timestamp: new Date().toISOString(),
        data: {
          taskId: state.taskId,
          run,
        },
        source: 'api/chat',
      });

      toolMessages.push({
        role: MessageRole.TOOL,
        content: serializeResult(result.output ?? result.error ?? {}),
        toolCallId: selectedCall?.id ?? tool.id,
        name: tool.name,
      });
    }

    if (provider) {
      const completionMessages: Message[] = [
        ...buildPlannerMessages(state.request),
        ...assistantMessages,
        ...toolMessages,
      ];

      const finalResponse = await provider.complete({
        model: state.modelId,
        messages: completionMessages,
        config: {
          role: ModelRole.REASONING,
          temperature: 0.2,
          maxTokens: state.request.maxTokens ?? 2048,
        },
      });

      finalAnswer = finalResponse.content.trim();
    } else {
      finalAnswer = toolRuns.length > 0
        ? `Executed ${toolRuns.map((run) => run.toolName).join(', ')}.\n\n${toolRuns.map((run) => serializeResult(run.output ?? run.error ?? {})).join('\n\n')}`
        : plan.summary;
    }
  }

  const finalStatus: WorkspaceTaskRecord['status'] = toolRuns.some((run) => run.status === 'failed')
    ? 'failed'
    : 'completed';

  workspaceHub.upsertTask({
    taskId: state.taskId,
    type: 'chat',
    status: finalStatus,
    createdAt,
    completedAt: new Date().toISOString(),
    inputPreview: state.request.message,
    outputPreview: finalAnswer || plan.summary,
    metadata: {
      conversationId: state.conversationId,
      chat: {
        request: state.request,
        plan,
        toolRuns,
        finalAnswer: finalAnswer || plan.summary,
        model: state.modelId,
      },
    },
    graph: createGraph(state.taskId, plan, toolRuns, finalStatus),
  });

  workspaceHub.appendLog({
    level: finalStatus === 'completed' ? 'info' : 'error',
    scope: 'chat',
    message: `Chat task ${state.taskId} ${finalStatus}`,
    details: {
      conversationId: state.conversationId,
      toolRuns,
    },
  });

  workspaceHub.recordEvent({
    event: 'chat:final-answer',
    timestamp: new Date().toISOString(),
    data: {
      taskId: state.taskId,
      status: finalStatus,
      answer: finalAnswer || plan.summary,
      plan,
      toolRuns,
    },
    source: 'api/chat',
  });
}

export async function queueChatTask(request: ChatRequest): Promise<ChatResponse> {
  const taskId = randomUUID();
  const conversationId = request.conversationId ?? taskId;
  const createdAt = new Date().toISOString();
  const modelId = request.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const toolDefinitions = toolRegistry.list().map(toolToDefinition);
  const toolsByName = new Map(toolRegistry.list().map((tool) => [tool.name, tool]));

  workspaceHub.upsertTask({
    taskId,
    type: 'chat',
    status: 'pending',
    createdAt,
    inputPreview: request.message,
    metadata: {
      conversationId,
      chat: {
        request,
        model: modelId,
      },
    },
    graph: {
      id: `chat-${taskId}`,
      nodes: [
        {
          id: `${taskId}:prompt`,
          label: 'User prompt',
          type: 'chat',
          status: 'completed',
          description: 'Incoming master chat request',
        },
      ],
      edges: [],
      activeTaskId: taskId,
    },
  });

  workspaceHub.appendLog({
    level: 'info',
    scope: 'chat',
    message: `Queued master chat task ${taskId}`,
    details: {
      conversationId,
      model: modelId,
    },
  });

  void planAndExecuteChat({
    taskId,
    conversationId,
    request,
    createdAt,
    modelId,
    toolDefinitions,
    toolsByName,
  }).catch((error) => {
    workspaceHub.patchTask(taskId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });

    workspaceHub.appendLog({
      level: 'error',
      scope: 'chat',
      message: `Chat task ${taskId} failed`,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    workspaceHub.recordEvent({
      event: 'chat:final-answer',
      timestamp: new Date().toISOString(),
      data: {
        taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      },
      source: 'api/chat',
    });
  });

  return {
    taskId,
    conversationId,
    status: 'pending',
    message: 'Chat queued for planning and tool execution',
  };
}
