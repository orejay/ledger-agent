import { z } from 'zod';
import { Tool } from '../tools/types';

export function makeMockTool(
  name: string,
  returnValue: unknown,
  opts: { sensitive?: boolean; inputSchema?: z.ZodType } = {},
): Tool & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    name,
    description: `mock ${name}`,
    inputSchema: opts.inputSchema ?? z.object({}).passthrough(),
    sensitive: opts.sensitive ?? false,
    calls,
    execute: async (args: unknown) => {
      calls.push(args);
      return returnValue;
    },
  };
}
