import { z } from 'zod';
import { Tool } from './types';

const InputSchema = z.object({
  accountId: z.string(),
  reason: z.string(),
});

const flagged: Array<{ accountId: string; reason: string }> = [];

export const flagAccount: Tool = {
  name: 'flag_account',
  description:
    'Flag an account for manual review. Use when transactions look unusual or high-risk.',
  inputSchema: InputSchema,
  sensitive: true,
  execute: async (args: z.infer<typeof InputSchema>) => {
    flagged.push({ accountId: args.accountId, reason: args.reason });
    return { flagged: true, accountId: args.accountId };
  },
};
