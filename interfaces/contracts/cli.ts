/**
 * CLI Interface Contracts for Nexus
 * 
 * Defines the command-line interface contracts.
 */

/**
 * CLI command argument
 */
export interface CliArgument {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  default?: unknown;
  alias?: string;
}

/**
 * CLI command option
 */
export interface CliOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  default?: unknown;
  alias?: string;
  choices?: unknown[];
}

/**
 * CLI command definition
 */
export interface CliCommand {
  name: string;
  description: string;
  arguments?: CliArgument[];
  options?: CliOption[];
  handler: CliHandler;
  subcommands?: CliCommand[];
}

/**
 * CLI command handler
 */
export type CliHandler = (args: Record<string, unknown>, options: Record<string, unknown>) => Promise<void>;

/**
 * CLI parse result
 */
export interface CliParseResult {
  command: string;
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  raw: string[];
}

/**
 * CLI help options
 */
export interface CliHelpOptions {
  verbose?: boolean;
  examples?: boolean;
}

/**
 * CLI parser interface
 */
export interface CliParser {
  /**
   * Register a command
   */
  command(cmd: CliCommand): void;
  
  /**
   * Parse command line arguments
   */
  parse(argv: string[]): CliParseResult;
  
  /**
   * Show help
   */
  help(command?: string, options?: CliHelpOptions): string;
  
  /**
   * Get command by name
   */
  getCommand(name: string): CliCommand | undefined;
  
  /**
   * List all commands
   */
  listCommands(): CliCommand[];
}

/**
 * CLI runner interface
 */
export interface CliRunner {
  /**
   * Run the CLI
   */
  run(argv: string[]): Promise<number>;
  
  /**
   * Get parser
   */
  getParser(): CliParser;
  
  /**
   * Add global option
   */
  addGlobalOption(option: CliOption): void;
}

/**
 * CLI configuration
 */
export interface CliConfig {
  name: string;
  version: string;
  description?: string;
  executable?: string;
  defaultCommand?: string;
}
