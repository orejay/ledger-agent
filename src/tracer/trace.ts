import { startActiveObservation, startObservation } from '@langfuse/tracing';
import { tracingEnabled } from './instrumentation';

const noopSpan: any = {
  update() {
    return this;
  },
  end() {},
};

export function activeObservation<T>(
  name: string,
  fn: (span: typeof noopSpan) => Promise<T>,
): Promise<T> {
  if (!tracingEnabled) return fn(noopSpan);
  return startActiveObservation(name, fn as any);
}

export function observation(
  name: string,
  input: Record<string, unknown>,
  opts: { asType: 'generation' | 'tool' },
) {
  if (!tracingEnabled) return noopSpan;
  return startObservation(
    name,
    input,
    opts as Parameters<typeof startObservation>[2],
  );
}
