import { flagAccount } from './flag-account';
import { getTransactions } from './get-transactions';
import { Tool } from './types';

export const tools: Record<string, Tool> = {
  [getTransactions.name]: getTransactions,
  [flagAccount.name]: flagAccount,
};

export type ToolName = keyof typeof tools;
