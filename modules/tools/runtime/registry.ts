import { ValidationError } from '@nexus/core/contracts/errors';

import type { RegistryEntry, RegistryStats, ToolFilter, ToolRegistry } from '../contracts/registry.js';
import type { Tool } from '../contracts/tool.js';

function includesText(source: string, query: string): boolean {
  return source.toLowerCase().includes(query.toLowerCase());
}

export class InMemoryToolRegistry implements ToolRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly names = new Map<string, string>();

  register(tool: Tool): void {
    if (this.entries.has(tool.id)) {
      throw new ValidationError('Tool ID is already registered', { toolId: tool.id });
    }

    if (this.names.has(tool.name)) {
      throw new ValidationError('Tool name is already registered', { toolName: tool.name });
    }

    this.entries.set(tool.id, {
      tool,
      registeredAt: new Date(),
      usageCount: 0
    });
    this.names.set(tool.name, tool.id);
  }

  unregister(toolId: string): boolean {
    const entry = this.entries.get(toolId);
    if (!entry) {
      return false;
    }

    this.entries.delete(toolId);
    this.names.delete(entry.tool.name);
    return true;
  }

  get(toolId: string): Tool | undefined {
    return this.entries.get(toolId)?.tool;
  }

  getByName(name: string): Tool | undefined {
    const toolId = this.names.get(name);
    return toolId ? this.get(toolId) : undefined;
  }

  list(filter?: ToolFilter): Tool[] {
    const tools = Array.from(this.entries.values()).map(entry => entry.tool);
    if (!filter) {
      return tools;
    }

    return tools.filter(tool => {
      const metadata = tool.getMetadata();

      if (filter.name && tool.name !== filter.name && tool.id !== filter.name) {
        return false;
      }

      if (filter.category && metadata.category !== filter.category) {
        return false;
      }

      if (filter.tags && filter.tags.some(tag => !metadata.tags.includes(tag))) {
        return false;
      }

      if (filter.status && tool.status !== filter.status) {
        return false;
      }

      return true;
    });
  }

  search(query: string, limit: number = 10): Tool[] {
    const results = Array.from(this.entries.values())
      .map(entry => entry.tool)
      .filter(tool => {
        const metadata = tool.getMetadata();
        return (
          includesText(tool.id, query) ||
          includesText(tool.name, query) ||
          includesText(tool.description, query) ||
          includesText(metadata.category, query) ||
          metadata.tags.some(tag => includesText(tag, query))
        );
      });

    return results.slice(0, limit);
  }

  has(toolId: string): boolean {
    return this.entries.has(toolId);
  }

  getStats(): RegistryStats {
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const mostUsed = Array.from(this.entries.entries())
      .map(([toolId, entry]) => ({
        toolId,
        usageCount: entry.usageCount
      }))
      .sort((left, right) => right.usageCount - left.usageCount)
      .slice(0, 10);

    for (const entry of this.entries.values()) {
      const category = entry.tool.getMetadata().category;
      byCategory[category] = (byCategory[category] ?? 0) + 1;
      byStatus[entry.tool.status] = (byStatus[entry.tool.status] ?? 0) + 1;
    }

    return {
      totalTools: this.entries.size,
      byCategory,
      byStatus,
      mostUsed
    };
  }

  clear(): void {
    this.entries.clear();
    this.names.clear();
  }

  markUsed(toolId: string): void {
    const entry = this.entries.get(toolId);
    if (!entry) {
      return;
    }

    entry.lastUsed = new Date();
    entry.usageCount += 1;
  }
}

export function createToolRegistry(): InMemoryToolRegistry {
  return new InMemoryToolRegistry();
}
