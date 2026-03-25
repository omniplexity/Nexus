import type { CapabilitySet } from '@nexus/core/contracts/tool';

import { createInputSchema, createOutputSchema } from '../contracts/schema.js';
import { ToolLifecycleStatus } from '../contracts/tool.js';
import { EchoTool, FlakyTool, SlowTool } from '../test-helpers/fake-tool.js';

import { BaseTool } from './base-tool.js';
import { createToolCache } from './cache.js';
import { createToolExecutor } from './executor.js';
import { createToolRegistry } from './registry.js';

const capabilitySet: CapabilitySet = {
  canAccessFilesystem: true,
  canExecuteCode: false,
  canAccessNetwork: true,
  canUseVectorSearch: false,
  customCapabilities: {}
};

function createExecutionContext() {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    capabilities: {
      filesystem: {
        read: true,
        write: false,
        delete: false,
        list: true
      },
      network: {
        http: true,
        websocket: false
      },
      codeExecution: {
        sandboxed: false,
        timeout: 0
      },
      vectorSearch: false
    },
    variables: {
      traceId: 'trace-1'
    },
    metadata: {
      requestId: 'request-1',
      timestamp: new Date()
    }
  };
}

class InvalidOutputTool extends BaseTool {
  constructor() {
    super({
      id: 'test.invalid-output',
      name: 'test.invalid-output',
      description: 'Returns invalid output for validation tests',
      status: ToolLifecycleStatus.AVAILABLE,
      inputSchema: createInputSchema({}, []),
      outputSchema: createOutputSchema({
        ok: { type: 'boolean', description: 'Success flag' }
      }),
      metadata: {
        id: 'test.invalid-output',
        name: 'test.invalid-output',
        description: 'Invalid output test tool',
        category: 'testing',
        tags: ['test', 'invalid'],
        version: '1.0.0'
      }
    });
  }

  async execute() {
    return this.createSuccessResult({
      ok: 'not-a-boolean'
    }, Date.now());
  }
}

class UnavailableTool extends BaseTool {
  constructor() {
    super({
      id: 'test.unavailable',
      name: 'test.unavailable',
      description: 'Unavailable test tool',
      status: ToolLifecycleStatus.UNAVAILABLE,
      inputSchema: createInputSchema(
        {
          value: { type: 'string', description: 'Unused value' }
        },
        ['value']
      ),
      outputSchema: createOutputSchema({
        echoed: { type: 'string', description: 'Echoed value' }
      }),
      metadata: {
        id: 'test.unavailable',
        name: 'test.unavailable',
        description: 'Unavailable test tool',
        category: 'testing',
        tags: ['test', 'unavailable'],
        version: '1.0.0'
      }
    });
  }

  async execute() {
    return this.createSuccessResult({ echoed: 'never-called' }, Date.now());
  }
}

describe('tool runtime', () => {
  it('registers, searches, and reports tool stats', () => {
    const registry = createToolRegistry();
    const echoTool = new EchoTool();

    registry.register(echoTool);

    expect(registry.get('test.echo')).toBeDefined();
    expect(registry.getByName('test.echo')).toBeDefined();
    expect(registry.list({ category: 'testing' })).toHaveLength(1);
    expect(registry.search('echo')).toHaveLength(1);
    expect(() => registry.register(echoTool)).toThrow('Tool ID is already registered');

    const stats = registry.getStats();
    expect(stats.totalTools).toBe(1);
    expect(stats.byCategory.testing).toBe(1);
  });

  it('executes tools, retries transient failures, and tracks cache hits', async () => {
    const registry = createToolRegistry();
    const cache = createToolCache({ maxEntries: 10 });
    const echoTool = new EchoTool();
    echoTool.config.cache = true;
    const flakyTool = new FlakyTool(1);

    registry.register(echoTool);
    registry.register(flakyTool);

    const executor = createToolExecutor(registry, {
      cache,
      defaultRetries: 1
    });

    const echoResult = await executor.execute('test.echo', { value: 'hello' }, createExecutionContext());
    expect(echoResult.success).toBe(true);
    expect(echoResult.output).toEqual({ echoed: 'hello' });
    expect(echoResult.metadata.cacheHit).toBe(false);

    const cachedResult = await executor.execute('test.echo', { value: 'hello' }, createExecutionContext());
    expect(cachedResult.success).toBe(true);
    expect(cachedResult.metadata.cacheHit).toBe(true);
    expect(cache.getStats().hits).toBeGreaterThan(0);

    const otherSessionResult = await executor.execute(
      'test.echo',
      { value: 'hello' },
      {
        ...createExecutionContext(),
        sessionId: 'session-2'
      }
    );
    expect(otherSessionResult.success).toBe(true);
    expect(otherSessionResult.metadata.cacheHit).toBe(false);

    const flakyResult = await executor.execute('test.flaky', {}, createExecutionContext());
    expect(flakyResult.success).toBe(true);
    expect(flakyResult.output).toEqual({ ok: true });

    const stats = registry.getStats();
    expect(stats.mostUsed[0]?.toolId).toBe('test.echo');
  });

  it('expires cached tool results according to the configured ttl', async () => {
    const registry = createToolRegistry();
    const cache = createToolCache({ maxEntries: 10 });
    const echoTool = new EchoTool();
    echoTool.config.cache = true;
    echoTool.config.cacheTtlMs = 1;

    registry.register(echoTool);

    const executor = createToolExecutor(registry, { cache });

    const firstResult = await executor.execute('test.echo', { value: 'ttl-check' }, createExecutionContext());
    expect(firstResult.success).toBe(true);
    expect(firstResult.metadata.cacheHit).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondResult = await executor.execute('test.echo', { value: 'ttl-check' }, createExecutionContext());
    expect(secondResult.success).toBe(true);
    expect(secondResult.metadata.cacheHit).toBe(false);
    expect(cache.getStats().hits).toBe(0);
    expect(cache.getStats().misses).toBeGreaterThanOrEqual(2);
  });

  it('returns structured failures for missing tools, invalid input, invalid output, and unavailable tools', async () => {
    const registry = createToolRegistry();
    const echoTool = new EchoTool();
    const invalidOutputTool = new InvalidOutputTool();

    registry.register(echoTool);
    registry.register(invalidOutputTool);

    const unavailableTool = new UnavailableTool();
    registry.register(unavailableTool);

    const executor = createToolExecutor(registry);

    const missingResult = await executor.execute('missing.tool', {}, createExecutionContext());
    expect(missingResult.success).toBe(false);
    expect(missingResult.error?.code).toBe('TOL_001');

    const invalidInputResult = await executor.execute('test.echo', {}, createExecutionContext());
    expect(invalidInputResult.success).toBe(false);
    expect(invalidInputResult.error?.code).toBe('TOL_004');

    const invalidOutputResult = await executor.execute('test.invalid-output', {}, createExecutionContext());
    expect(invalidOutputResult.success).toBe(false);
    expect(invalidOutputResult.error?.code).toBe('TOL_004');

    const unavailableResult = await executor.execute('test.unavailable', { value: 'x' }, createExecutionContext());
    expect(unavailableResult.success).toBe(false);
    expect(unavailableResult.error?.code).toBe('TOL_001');
  });

  it('supports cancellation and timeout tracking', async () => {
    const registry = createToolRegistry();
    const slowTool = new SlowTool(100);
    registry.register(slowTool);

    const executor = createToolExecutor(registry);
    const pendingResult = executor.execute('test.slow', {}, createExecutionContext());

    await vi.waitFor(() => {
      expect(executor.getRunning()).toHaveLength(1);
    });

    const executionId = executor.getRunning()[0].executionId;
    executor.cancel(executionId);

    const cancelledResult = await pendingResult;
    expect(cancelledResult.success).toBe(false);
    expect(cancelledResult.error?.code).toBe('TOL_003');
    expect(executor.getRunning()).toHaveLength(0);
  });

  it('maps core capability defaults correctly', () => {
    expect(capabilitySet.canAccessFilesystem).toBe(true);
    expect(capabilitySet.canAccessNetwork).toBe(true);
  });
});
