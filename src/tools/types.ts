import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  sensitive?: boolean;
  execute: (args: any) => Promise<unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface ToolSource {
  listTools(): Promise<ToolDefinition[]>;
  callTool(name: string, input: unknown): Promise<string>;
}
