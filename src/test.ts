import { sdk } from './tracer/instrumentation'; // MUST be first — sets up tracing before anything else
import { startActiveObservation } from '@langfuse/tracing';

await startActiveObservation('pipe-test', async (span) => {
  span.update({ input: 'hello', output: 'world' });
});

await sdk?.shutdown(); // force-flush before the script exits, or the span is lost
