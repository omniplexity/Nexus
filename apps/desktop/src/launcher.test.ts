import { describe, expect, it } from 'vitest';

import { resolveOpenCommand } from './launcher';

describe('resolveOpenCommand', () => {
  it('maps platform commands correctly', () => {
    expect(resolveOpenCommand('win32')).toEqual({ command: 'cmd', args: ['/c', 'start', ''] });
    expect(resolveOpenCommand('darwin')).toEqual({ command: 'open', args: [] });
    expect(resolveOpenCommand('linux')).toEqual({ command: 'xdg-open', args: [] });
  });
});
