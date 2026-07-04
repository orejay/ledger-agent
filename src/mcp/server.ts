import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { tools } from '../tools';

const server = new McpServer({ name: 'ledger-tools', version: '1.0.0' });

for (const tool of Object.values(tools)) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (args) => {
      const parsed = tool.inputSchema.parse(args);
      const result = await tool.execute(parsed);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
