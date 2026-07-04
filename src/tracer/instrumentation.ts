import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

const enabled = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
);

export const sdk = enabled
  ? new NodeSDK({
      spanProcessors: [new LangfuseSpanProcessor()],
    })
  : null;

sdk?.start();

export const tracingEnabled = enabled;
export async function shutdownTracing() {
  if (enabled) await sdk?.shutdown();
}
