export interface TraceEvent {
  type: 'model_call' | 'tool_call' | 'tool_result' | 'denied';
  name?: string;
  input?: unknown;
  output?: unknown;
  step: number;
  at: number;
}

export class Tracer {
  private events: TraceEvent[] = [];

  record(event: Omit<TraceEvent, 'at'>) {
    this.events.push({ ...event, at: Date.now() });
  }

  get trace(): TraceEvent[] {
    return this.events;
  }

  print() {
    for (const e of this.events) {
      console.log(
        `[step ${e.step}] ${e.type}${e.name ? ` ${e.name}` : ''}`,
        e.input ?? e.output ?? '',
      );
    }
  }
}
