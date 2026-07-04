import { describe, it, expect } from 'vitest';
import { Agent } from '../agent';
import { makeMockTool } from './mock-tool';
import { LocalToolSource } from '../tools/local-tool-source';
import { z } from 'zod';

describe('Agent tool-calling', () => {
  it('calls get_transactions for an account query', async () => {
    const getTx = makeMockTool(
      'get_transactions',
      [{ id: 't1', amount: -1200, type: 'debit' }],
      { inputSchema: z.object({ accountId: z.string() }) },
    );
    const registry = { [getTx.name]: getTx };

    const agent = new Agent(new LocalToolSource(registry), async () => true);
    await agent.run('What are the recent transactions on account 4471?');

    expect(getTx.calls.length).toBeGreaterThan(0);
    expect(getTx.calls[0]).toMatchObject({ accountId: '4471' });
  });

  it('does not execute a sensitive tool when approval is denied', async () => {
    const flag = makeMockTool(
      'flag_account',
      { flagged: true },
      {
        sensitive: true,
        inputSchema: z.object({ accountId: z.string(), reason: z.string() }),
      },
    );
    const registry = { [flag.name]: flag };

    const agent = new Agent(new LocalToolSource(registry), async () => false);

    await agent.run('Flag account 4471 for suspicious activity.');

    expect(flag.calls.length).toBe(0);
  });

  it('executes a sensitive tool when approval is granted', async () => {
    const flag = makeMockTool(
      'flag_account',
      { flagged: true },
      {
        sensitive: true,
        inputSchema: z.object({ accountId: z.string(), reason: z.string() }),
      },
    );
    const registry = { [flag.name]: flag };

    const agent = new Agent(new LocalToolSource(registry), async () => true);

    await agent.run('Flag account 4471 for suspicious activity.');

    expect(flag.calls.length).toBeGreaterThan(0);
  });
});
