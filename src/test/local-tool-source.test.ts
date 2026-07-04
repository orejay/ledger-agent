import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { LocalToolSource } from '../tools/local-tool-source';
import { makeMockTool } from './mock-tool';

describe('LocalToolSource', () => {
  it('lists tools with a JSON-schema-shaped inputSchema', async () => {
    const tool = makeMockTool('get_transactions', [], {
      inputSchema: z.object({ accountId: z.string() }),
    });
    const source = new LocalToolSource({ [tool.name]: tool });

    const defs = await source.listTools();

    expect(defs).toEqual([
      {
        name: 'get_transactions',
        description: 'mock get_transactions',
        inputSchema: expect.objectContaining({ type: 'object' }),
      },
    ]);
  });

  it('parses input, executes the tool, and returns a JSON string', async () => {
    const tool = makeMockTool(
      'get_transactions',
      [{ id: 't1', amount: -50, type: 'debit' }],
      { inputSchema: z.object({ accountId: z.string() }) },
    );
    const source = new LocalToolSource({ [tool.name]: tool });

    const result = await source.callTool('get_transactions', {
      accountId: '4471',
    });

    expect(tool.calls).toEqual([{ accountId: '4471' }]);
    expect(JSON.parse(result)).toEqual([
      { id: 't1', amount: -50, type: 'debit' },
    ]);
  });

  it('throws when input fails schema validation', async () => {
    const tool = makeMockTool('get_transactions', [], {
      inputSchema: z.object({ accountId: z.string() }),
    });
    const source = new LocalToolSource({ [tool.name]: tool });

    await expect(source.callTool('get_transactions', {})).rejects.toThrow();
    expect(tool.calls.length).toBe(0);
  });
});
