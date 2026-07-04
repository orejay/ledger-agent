import { describe, it, expect, beforeAll } from 'vitest';
import { McpToolSource } from '../tools/mcp-tool-source';

describe('McpToolSource (integration, spawns the real MCP server)', () => {
  const source = new McpToolSource();

  beforeAll(async () => {
    await source.connect();
  }, 20_000);

  it('lists the tools registered by the MCP server', async () => {
    const defs = await source.listTools();
    const names = defs.map((t) => t.name).sort();

    expect(names).toEqual(['flag_account', 'get_transactions']);
  });

  it('calls a tool and returns its JSON-stringified result', async () => {
    const result = await source.callTool('get_transactions', {
      accountId: '4471',
    });

    expect(JSON.parse(result)).toEqual([
      { id: 't1', amount: 2500, type: 'credit' },
      { id: 't2', amount: -80, type: 'debit' },
      { id: 't3', amount: -1200, type: 'debit' },
    ]);
  });
});
