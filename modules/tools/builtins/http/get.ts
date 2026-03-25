import { TextDecoder } from 'node:util';

import type { ToolPolicy } from '../../contracts/policy.js';
import { createInputSchema, createOutputSchema } from '../../contracts/schema.js';
import { ToolLifecycleStatus } from '../../contracts/tool.js';
import { BaseTool } from '../../runtime/base-tool.js';
import { createToolExecutionError } from '../../runtime/error-utils.js';
import {
  assertNetworkUrlAllowed,
  assertRedirectAllowed
} from '../../runtime/policy.js';

function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

async function readResponseBody(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }

  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let done = false;

  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (done) {
      continue;
    }

    const value = chunk.value;
    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw createToolExecutionError('HTTP response exceeds the maximum allowed size', {
        maxBytes
      });
    }

    chunks.push(value);
  }

  return chunks.map(chunk => decoder.decode(chunk, { stream: true })).join('') + decoder.decode();
}

async function fetchWithRedirects(
  url: URL,
  policy: ToolPolicy['network'],
  signal?: AbortSignal
): Promise<Response> {
  let currentUrl = url;
  let redirectCount = 0;
  let pending = true;

  while (pending) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        'user-agent': 'nexus-capability-fabric/1.0'
      }
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    pending = false;
    redirectCount += 1;
    assertRedirectAllowed(redirectCount, policy);

    const location = response.headers.get('location');
    if (!location) {
      throw createToolExecutionError('HTTP redirect response is missing a location header', {
        url: currentUrl.toString()
      });
    }

    currentUrl = new URL(location, currentUrl);
    assertNetworkUrlAllowed(currentUrl, policy);
    pending = true;
  }

  throw createToolExecutionError('HTTP redirect flow terminated unexpectedly', {
    url: currentUrl.toString()
  });
}

export class HttpGetTool extends BaseTool {
  constructor(private readonly policy: ToolPolicy['network']) {
    super({
      id: 'http.get',
      name: 'http.get',
      description: 'Perform a policy-restricted HTTPS GET request.',
      status: ToolLifecycleStatus.AVAILABLE,
      config: {
        timeout: policy.timeoutMs,
        retries: 0,
        cache: true,
        cacheTtlMs: 10000
      },
      inputSchema: createInputSchema(
        {
          url: {
            type: 'string',
            description: 'HTTPS URL to fetch'
          }
        },
        ['url']
      ),
      outputSchema: createOutputSchema({
        url: { type: 'string', description: 'Resolved URL' },
        status: { type: 'number', description: 'HTTP status code' },
        headers: { type: 'object', description: 'HTTP response headers' },
        body: { type: 'string', description: 'HTTP response body as text' }
      }),
      metadata: {
        id: 'http.get',
        name: 'http.get',
        description: 'Fetch HTTPS resources with redirect and size limits.',
        category: 'network',
        tags: ['http', 'network', 'read'],
        version: '1.0.0'
      }
    });
  }

  async execute(
    input: unknown,
    context: import('../../contracts/tool.js').ToolExecutionContext
  ): Promise<import('../../contracts/tool.js').ToolExecutionResult> {
    const startedAt = Date.now();

    try {
      const url = new URL(String((input as { url: string }).url));
      assertNetworkUrlAllowed(url, this.policy);

      const response = await fetchWithRedirects(url, this.policy, context.abortSignal);
      const body = await readResponseBody(response, this.policy.maxResponseBytes);

      return this.createSuccessResult({
        url: response.url,
        status: response.status,
        headers: normalizeHeaders(response.headers),
        body
      }, startedAt);
    } catch (error) {
      return this.createErrorResult(error, startedAt);
    }
  }
}

export function createHttpGetTool(policy: ToolPolicy['network']): HttpGetTool {
  return new HttpGetTool(policy);
}
