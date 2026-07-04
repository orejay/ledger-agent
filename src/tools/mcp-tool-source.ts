import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ToolSource, ToolDefinition } from './types';

export class McpToolSource implements ToolSource {
  private client = new Client({ name: 'ledger-agent', version: '1.0.0' });

  async connect() {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', 'src/mcp/server.ts'],
    });
    await this.client.connect(transport);
  }

  async listTools(): Promise<ToolDefinition[]> {
    const { tools } = await this.client.listTools();
    return tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema,
    }));
  }

  async callTool(name: string, input: unknown): Promise<string> {
    const result = await this.client.callTool({
      name,
      arguments: input as Record<string, unknown>,
    });
    const textBlock = (
      result.content as Array<{ type: string; text?: string }>
    ).find((b) => b.type === 'text');
    return textBlock?.text ?? '';
  }
}
