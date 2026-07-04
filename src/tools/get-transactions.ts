import { z } from 'zod';
import { Tool } from './types';

const inputSchema = z.object({
  accountId: z.string(),
});

const fakeData: Record<
  string,
  Array<{ id: string; amount: number; type: string }>
> = {
  '4471': [
    { id: 't1', amount: 2500, type: 'credit' },
    { id: 't2', amount: -80, type: 'debit' },
    { id: 't3', amount: -1200, type: 'debit' },
  ],
  '4472': [{ id: 't4', amount: 500, type: 'credit' }],
};

export const getTransactions: Tool = {
  name: 'get_transactions',
  description: 'Fetch recent transactions for a given account ID.',
  inputSchema: inputSchema,
  execute: async (args: z.infer<typeof inputSchema>) => {
    return fakeData[args.accountId] ?? [];
  },
};
