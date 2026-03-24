import net from 'node:net';
import path from 'node:path';

import type { ToolPolicy } from '../contracts/policy.js';
import type { ToolCapabilities , Tool } from '../contracts/tool.js';

import {
  createToolAuthorizationError,
  createToolExecutionError
} from './error-utils.js';

export interface ToolPolicyOverrides {
  filesystem?: Partial<ToolPolicy['filesystem']>;
  network?: Partial<ToolPolicy['network']>;
}

export function createToolPolicy(overrides: ToolPolicyOverrides = {}): ToolPolicy {
  return {
    filesystem: {
      rootDirectory: process.cwd(),
      allowRead: true,
      allowList: true,
      maxFileSizeBytes: 256_000,
      maxDirectoryEntries: 200,
      ...overrides.filesystem
    },
    network: {
      allowHttpGet: true,
      allowedProtocols: ['https:'],
      allowLocalhost: false,
      allowPrivateNetwork: false,
      timeoutMs: 10_000,
      maxResponseBytes: 256_000,
      maxRedirects: 3,
      ...overrides.network
    }
  };
}

function isSubPath(rootDirectory: string, resolvedPath: string): boolean {
  const relative = path.relative(rootDirectory, resolvedPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isPrivateIpv4(ipAddress: string): boolean {
  const octets = ipAddress.split('.').map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
}

function isPrivateIpv6(ipAddress: string): boolean {
  const normalized = ipAddress.toLowerCase();
  return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
}

function isPrivateAddress(hostname: string): boolean {
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4) {
    return isPrivateIpv4(hostname);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(hostname);
  }
  return false;
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local');
}

export function resolvePolicyPath(filePath: string, policy: ToolPolicy['filesystem']): string {
  const rootDirectory = path.resolve(policy.rootDirectory);
  const resolvedPath = path.resolve(rootDirectory, filePath);

  if (!isSubPath(rootDirectory, resolvedPath)) {
    throw createToolAuthorizationError('Filesystem access outside the workspace root is not allowed', {
      filePath,
      resolvedPath,
      rootDirectory
    });
  }

  return resolvedPath;
}

export function assertFilesystemReadAllowed(policy: ToolPolicy['filesystem']): void {
  if (!policy.allowRead) {
    throw createToolAuthorizationError('Filesystem read access is disabled by policy');
  }
}

export function assertFilesystemListAllowed(policy: ToolPolicy['filesystem']): void {
  if (!policy.allowList) {
    throw createToolAuthorizationError('Filesystem directory listing is disabled by policy');
  }
}

export function assertNetworkUrlAllowed(url: URL, policy: ToolPolicy['network']): void {
  if (!policy.allowHttpGet) {
    throw createToolAuthorizationError('Network access is disabled by policy');
  }

  if (!policy.allowedProtocols.includes(url.protocol)) {
    throw createToolAuthorizationError('URL protocol is not allowed by policy', {
      protocol: url.protocol
    });
  }

  if (policy.allowedHosts && policy.allowedHosts.length > 0 && !policy.allowedHosts.includes(url.hostname)) {
    throw createToolAuthorizationError('Host is not allowlisted by policy', {
      hostname: url.hostname
    });
  }

  if (policy.blockedHosts?.includes(url.hostname)) {
    throw createToolAuthorizationError('Host is blocked by policy', {
      hostname: url.hostname
    });
  }

  if (!policy.allowLocalhost && isLocalHostname(url.hostname)) {
    throw createToolAuthorizationError('Localhost targets are blocked by policy', {
      hostname: url.hostname
    });
  }

  if (!policy.allowPrivateNetwork && isPrivateAddress(url.hostname)) {
    throw createToolAuthorizationError('Private network targets are blocked by policy', {
      hostname: url.hostname
    });
  }
}

export function assertToolCapabilities(tool: Tool, capabilities: ToolCapabilities): void {
  if (tool.id.startsWith('filesystem.') && !capabilities.filesystem.read) {
    throw createToolAuthorizationError('Filesystem capability is required for this tool', {
      toolId: tool.id
    });
  }

  if (tool.id === 'http.get' && !capabilities.network.http) {
    throw createToolAuthorizationError('Network capability is required for this tool', {
      toolId: tool.id
    });
  }
}

export function assertRedirectAllowed(redirectCount: number, policy: ToolPolicy['network']): void {
  if (redirectCount > policy.maxRedirects) {
    throw createToolExecutionError('Maximum redirect limit exceeded', {
      maxRedirects: policy.maxRedirects
    });
  }
}
