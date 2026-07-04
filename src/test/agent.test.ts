import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Agent } from '../agent';
import { Tracer } from '../tracer/tracer';
import { LocalToolSource } from '../tools/local-tool-source';
import { makeMockTool } from './mock-tool';
import {
  makeScriptedClient,
  textResponse,
  toolUseResponse,
} from './mock-anthropic-client';

describe('Agent tool-calling', () => {
  it('calls get_transactions for an account query', async () => {
    const getTx = makeMockTool(
      'get_transactions',
      [{ id: 't1', amount: -1200, type: 'debit' }],
      { inputSchema: z.object({ accountId: z.string() }) },
    );
    const client = makeScriptedClient([
      toolUseResponse('get_transactions', { accountId: '4471' }),
      textResponse('Account 4471 has one recent debit of $1200.'),
    ]);

    const agent = new Agent(
      new LocalToolSource({ [getTx.name]: getTx }),
      async () => true,
      undefined,
      undefined,
      undefined,
      client,
    );
    const { answer } = await agent.run(
      'What are the recent transactions on account 4471?',
    );

    expect(getTx.calls).toEqual([{ accountId: '4471' }]);
    expect(answer).toBe('Account 4471 has one recent debit of $1200.');
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
    const client = makeScriptedClient([
      toolUseResponse('flag_account', {
        accountId: '4471',
        reason: 'suspicious activity',
      }),
      textResponse('The flag was not approved.'),
    ]);

    const agent = new Agent(
      new LocalToolSource({ [flag.name]: flag }),
      async () => false,
      undefined,
      undefined,
      undefined,
      client,
    );

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
    const client = makeScriptedClient([
      toolUseResponse('flag_account', {
        accountId: '4471',
        reason: 'suspicious activity',
      }),
      textResponse('Account 4471 has been flagged.'),
    ]);

    const agent = new Agent(
      new LocalToolSource({ [flag.name]: flag }),
      async () => true,
      undefined,
      undefined,
      undefined,
      client,
    );

    await agent.run('Flag account 4471 for suspicious activity.');

    expect(flag.calls.length).toBeGreaterThan(0);
  });

  it('recovers when the model calls a tool with input that fails schema validation', async () => {
    const getTx = makeMockTool('get_transactions', [], {
      inputSchema: z.object({ accountId: z.string() }),
    });
    const client = makeScriptedClient([
      toolUseResponse('get_transactions', { wrongField: 'oops' }),
      textResponse('Sorry, I could not look up that account.'),
    ]);

    const agent = new Agent(
      new LocalToolSource({ [getTx.name]: getTx }),
      async () => true,
      undefined,
      undefined,
      undefined,
      client,
    );
    const { answer } = await agent.run('Look up an account.');

    expect(getTx.calls.length).toBe(0);
    expect(answer).toBe('Sorry, I could not look up that account.');
  });

  it('recovers when a tool throws during execution', async () => {
    const failingTool = makeMockTool('get_transactions', null, {
      inputSchema: z.object({ accountId: z.string() }),
    });
    failingTool.execute = async () => {
      throw new Error('downstream service unavailable');
    };
    const client = makeScriptedClient([
      toolUseResponse('get_transactions', { accountId: '4471' }),
      textResponse('The transaction service is temporarily unavailable.'),
    ]);

    const agent = new Agent(
      new LocalToolSource({ [failingTool.name]: failingTool }),
      async () => true,
      undefined,
      undefined,
      undefined,
      client,
    );
    const { answer } = await agent.run(
      'What are the recent transactions on account 4471?',
    );

    expect(answer).toBe('The transaction service is temporarily unavailable.');
  });

  it('stops after maxSteps and reports that no final answer was reached', async () => {
    const getTx = makeMockTool(
      'get_transactions',
      [{ id: 't1', amount: -1200, type: 'debit' }],
      { inputSchema: z.object({ accountId: z.string() }) },
    );
    const client = makeScriptedClient([
      toolUseResponse('get_transactions', { accountId: '4471' }),
    ]);

    const agent = new Agent(
      new LocalToolSource({ [getTx.name]: getTx }),
      async () => true,
      undefined,
      new Tracer(),
      1,
      client,
    );
    const { answer } = await agent.run(
      'What are the recent transactions on account 4471?',
    );

    expect(answer).toBe('Max steps reached without a final answer.');
    expect(client.calls.length).toBe(1);
  });
});
