import { describe, it, expect } from 'vitest';
import { Tracer } from '../tracer/tracer';

describe('Tracer', () => {
  it('records events in order and stamps them with a timestamp', () => {
    const tracer = new Tracer();

    tracer.record({ type: 'model_call', step: 0 });
    tracer.record({ type: 'tool_call', name: 'get_transactions', step: 0 });

    expect(tracer.trace).toHaveLength(2);
    expect(tracer.trace[0]).toMatchObject({ type: 'model_call', step: 0 });
    expect(tracer.trace[1]).toMatchObject({
      type: 'tool_call',
      name: 'get_transactions',
      step: 0,
    });
    expect(tracer.trace[0].at).toEqual(expect.any(Number));
  });

  it('starts empty', () => {
    expect(new Tracer().trace).toEqual([]);
  });
});
