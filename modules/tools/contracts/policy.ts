/**
 * Tool policy contracts for built-in tool enforcement.
 */

export interface FilesystemPolicy {
  rootDirectory: string;
  allowRead: boolean;
  allowList: boolean;
  maxFileSizeBytes: number;
  maxDirectoryEntries: number;
}

export interface NetworkPolicy {
  allowHttpGet: boolean;
  allowedProtocols: string[];
  allowLocalhost: boolean;
  allowPrivateNetwork: boolean;
  allowedHosts?: string[];
  blockedHosts?: string[];
  timeoutMs: number;
  maxResponseBytes: number;
  maxRedirects: number;
}

export interface ToolPolicy {
  filesystem: FilesystemPolicy;
  network: NetworkPolicy;
}
