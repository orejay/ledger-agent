import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config';
import { type TraceEvent, Tracer } from '../tracer/tracer';
import { activeObservation, observation } from '../tracer/trace';
import { ToolSource } from '../tools/types';

export class Agent {
  private client = new Anthropic();

  constructor(
    private toolSource: ToolSource,
    private approve: (
      name: string,
      input: unknown,
    ) => Promise<boolean> = async () => false,
    private sensitiveTools: Set<string> = new Set(['flag_account']),
    private tracer: Tracer = new Tracer(),
    private maxSteps = 8,
  ) {}

  private isSensitive(name: string): boolean {
    return this.sensitiveTools.has(name);
  }

  private async toolDefs() {
    const defs = await this.toolSource.listTools();
    return defs.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));
  }

  async run(
    question: string,
  ): Promise<{ answer: string; trace: TraceEvent[] }> {
    return activeObservation('agent-run', async (root) => {
      root.update({ input: question });
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: question },
      ];

      for (let step = 0; step < this.maxSteps; step++) {
        this.tracer.record({ type: 'model_call', step });

        const gen = observation(
          'model-call',
          {
            input: messages,
            model: config.anthropicModel,
          },
          { asType: 'generation' },
        );
        const response = await this.client.messages.create({
          model: config.anthropicModel,
          max_tokens: 1024,
          messages,
          tools: await this.toolDefs(),
        });
        gen
          .update({
            output: response.content,
            usageDetails: {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
            },
          })
          .end();

        if (response.stop_reason !== 'tool_use') {
          const text = response.content.find((c) => c.type === 'text');

          root.update({ output: text?.type === 'text' ? text.text : '' });
          return {
            answer: text?.type === 'text' ? text.text : '',
            trace: this.tracer.trace,
          };
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') {
            continue;
          }

          console.log(`→ ${block.name}(${JSON.stringify(block.input)})`);

          if (
            this.isSensitive(block.name) &&
            !(await this.approve(block.name, block.input))
          ) {
            this.tracer.record({ type: 'denied', name: block.name, step });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Denied: this action was not approved by a human.',
              is_error: true,
            });
            continue;
          }

          try {
            this.tracer.record({
              type: 'tool_call',
              name: block.name,
              input: block.input,
              step,
            });
            const toolObservation = observation(
              block.name,
              { input: block.input },
              { asType: 'tool' },
            );
            const result = await this.toolSource.callTool(
              block.name,
              block.input,
            );
            toolObservation.update({ output: result }).end();
            this.tracer.record({
              type: 'tool_result',
              name: block.name,
              output: result,
              step,
            });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            });
          } catch (error) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: (error as Error).message }),
              is_error: true,
            });
          }
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
      }

      const answer = 'Max steps reached without a final answer.';
      root.update({ output: answer });
      return {
        answer,
        trace: this.tracer.trace,
      };
    });
  }
}
