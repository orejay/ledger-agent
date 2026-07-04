import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z
  .object({
    ANTHROPIC_MODEL: z.string().min(1).default('claude-haiku-4-5-20251001'),
    LANGFUSE_PUBLIC_KEY: z.string().min(1).optional(),
    LANGFUSE_SECRET_KEY: z.string().min(1).optional(),
    LANGFUSE_BASE_URL: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      Boolean(env.LANGFUSE_PUBLIC_KEY) === Boolean(env.LANGFUSE_SECRET_KEY),
    {
      message:
        'LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must both be set to enable tracing, or both omitted to disable it.',
      path: ['LANGFUSE_SECRET_KEY'],
    },
  );

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

const env = loadEnv();

export const config = {
  anthropicModel: env.ANTHROPIC_MODEL,
  tracingEnabled: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
};
