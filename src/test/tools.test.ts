import { describe, it, expect } from 'vitest';
import { getTransactions } from '../tools/get-transactions';
import { flagAccount } from '../tools/flag-account';

describe('getTransactions', () => {
  it('returns transactions for a known account', async () => {
    const result = await getTransactions.execute({ accountId: '4471' });

    expect(result).toEqual([
      { id: 't1', amount: 2500, type: 'credit' },
      { id: 't2', amount: -80, type: 'debit' },
      { id: 't3', amount: -1200, type: 'debit' },
    ]);
  });

  it('returns an empty list for an unknown account', async () => {
    const result = await getTransactions.execute({ accountId: 'unknown' });

    expect(result).toEqual([]);
  });
});

describe('flagAccount', () => {
  it('is marked sensitive', () => {
    expect(flagAccount.sensitive).toBe(true);
  });

  it('flags the given account and echoes it back', async () => {
    const result = await flagAccount.execute({
      accountId: '4471',
      reason: 'suspicious activity',
    });

    expect(result).toEqual({ flagged: true, accountId: '4471' });
  });
});
