import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  sensitive?: boolean;
  execute: (args: any) => Promise<unknown>;
}
