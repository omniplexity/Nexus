# CLI Reference

> **Phase 1 Stub** — This documents the CLI interface contracts. Commands will be implemented in Phase 2+.

## Contract Source

Interface contracts defined in [`interfaces/contracts/cli.ts`](../../interfaces/contracts/cli.ts).

## Interfaces

### CliArgument

```typescript
interface CliArgument {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  default?: unknown;
  alias?: string;
}
```

### CliOption

```typescript
interface CliOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  default?: unknown;
  alias?: string;
  choices?: unknown[];
}
```

### CliCommand

```typescript
interface CliCommand {
  name: string;
  description: string;
  arguments?: CliArgument[];
  options?: CliOption[];
  handler: CliHandler;
  subcommands?: CliCommand[];
}
```

### CliHandler

```typescript
type CliHandler = (
  args: Record<string, unknown>,
  options: Record<string, unknown>
) => Promise<void>;
```

### CliParseResult

```typescript
interface CliParseResult {
  command: string;
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  raw: string[];
}
```

### CliConfig

```typescript
interface CliConfig {
  name: string;
  version: string;
  description?: string;
  executable?: string;
  defaultCommand?: string;
}
```

## Parser Interface

### CliParser

```typescript
interface CliParser {
  /** Register a command */
  command(cmd: CliCommand): void;
  
  /** Parse command line arguments */
  parse(argv: string[]): CliParseResult;
  
  /** Show help */
  help(command?: string, options?: CliHelpOptions): string;
  
  /** Get command by name */
  getCommand(name: string): CliCommand | undefined;
  
  /** List all commands */
  listCommands(): CliCommand[];
}
```

## Runner Interface

### CliRunner

```typescript
interface CliRunner {
  /** Run the CLI */
  run(argv: string[]): Promise<number>;
  
  /** Get parser */
  getParser(): CliParser;
  
  /** Add global option */
  addGlobalOption(option: CliOption): void;
}
```

## Expected Commands

> **Note:** These commands will be implemented in Phase 2+. This is a reference for planned functionality.

### Global Options

| Option | Alias | Type | Description |
|--------|-------|------|-------------|
| `--help` | `-h` | boolean | Show help |
| `--version` | `-v` | boolean | Show version |
| `--verbose` | | boolean | Verbose output |
| `--config` | `-c` | string | Config file path |

### Orchestration Commands

| Command | Description |
|---------|-------------|
| `nexus task create` | Create a new task |
| `nexus task list` | List all tasks |
| `nexus task status <id>` | Get task status |
| `nexus task cancel <id>` | Cancel a task |

### Node Commands

| Command | Description |
|---------|-------------|
| `nexus node list` | List all nodes |
| `nexus node info <id>` | Get node details |
| `nexus node create` | Create a new node |
| `nexus node delete <id>` | Delete a node |

### Tool Commands

| Command | Description |
|---------|-------------|
| `nexus tool list` | List all registered tools |
| `nexus tool info <name>` | Get tool schema |
| `nexus tool execute <name>` | Execute a tool |

### Agent Commands

| Command | Description |
|---------|-------------|
| `nexus agent list` | List all agents |
| `nexus agent create` | Create a new agent |
| `nexus agent run <id>` | Run an agent |
| `nexus agent stop <id>` | Stop an agent |

### Memory Commands

| Command | Description |
|---------|-------------|
| `nexus memory search <query>` | Search memory |
| `nexus memory list` | List memory entries |
| `nexus memory clear` | Clear memory |

## Usage Example

```typescript
import { CliParser, CliCommand, CliRunner } from '@nexus/cli';

const commands: CliCommand[] = [
  {
    name: 'task',
    description: 'Task management commands',
    subcommands: [
      {
        name: 'list',
        description: 'List all tasks',
        handler: async (args, options) => {
          console.log('Listing tasks...');
        }
      }
    ]
  }
];

const parser: CliParser = {
  command(cmd: CliCommand) {
    commands.push(cmd);
  },
  parse(argv: string[]) {
    return {
      command: 'task:list',
      args: {},
      options: {},
      raw: argv
    };
  },
  help(cmd?: string) {
    return 'Help text...';
  },
  getCommand(name: string) {
    return commands.find(c => c.name === name);
  },
  listCommands() {
    return commands;
  }
};

const runner: CliRunner = {
  async run(argv: string[]) {
    const result = parser.parse(argv);
    // Execute command...
    return 0;
  },
  getParser() {
    return parser;
  },
  addGlobalOption(option) {
    // Add global option...
  }
};
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Command not found |
| 130 | Interrupted (Ctrl+C) |

## Implementation Status

- **Phase 1:** Contract definitions (complete)
- **Phase 2:** CLI runner and parser implementation
- **Phase 3:** Full command implementation

---

See also: [INDEX.md](./INDEX.md) | [ERRORS.md](./ERRORS.md)
