import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { config } from '../config/config';

const enabled = config.tracingEnabled;

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
