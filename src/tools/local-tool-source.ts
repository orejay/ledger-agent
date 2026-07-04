import { z } from 'zod';
import type { Tool, ToolSource, ToolDefinition } from './types';
import { tools } from './index';

export class LocalToolSource implements ToolSource {
  constructor(private registry: Record<string, Tool> = tools) {}

  async listTools(): Promise<ToolDefinition[]> {
    return Object.values(this.registry).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: z.toJSONSchema(t.inputSchema),
    }));
  }

  async callTool(name: string, input: unknown): Promise<string> {
    const tool = this.registry[name];
    const args = tool.inputSchema.parse(input);
    const result = await tool.execute(args);
    return JSON.stringify(result);
  }
}
