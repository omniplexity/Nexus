import { spawn } from 'node:child_process';

export function resolveOpenCommand(platform: NodeJS.Platform = process.platform): { command: string; args: string[] } {
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', ''] };
  }

  if (platform === 'darwin') {
    return { command: 'open', args: [] };
  }

  return { command: 'xdg-open', args: [] };
}

export function openWorkspaceUrl(url: string): Promise<void> {
  const { command, args } = resolveOpenCommand();

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args, url], {
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });

    child.on('error', reject);
    child.unref();
    resolve();
  });
}
