import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config';
import { tools } from '../tools';
import { z } from 'zod';
import { type TraceEvent, Tracer } from '../tracer/tracer';
import { start } from 'node:repl';
import { activeObservation, observation } from '../tracer/trace';

export class Agent {
  private client = new Anthropic();

  constructor(
    private toolRegistry: typeof tools,
    private approve: (
      name: string,
      input: unknown,
    ) => Promise<boolean> = async () => false,
    private tracer: Tracer = new Tracer(),
    private maxSteps = 8,
  ) {}

  private toolDefs() {
    return Object.values(this.toolRegistry).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: z.toJSONSchema(
        tool.inputSchema,
      ) as Anthropic.Tool.InputSchema,
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
          tools: this.toolDefs(),
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

          const tool = this.toolRegistry[block.name];
          console.log(`→ ${block.name}(${JSON.stringify(block.input)})`);

          if (
            tool.sensitive &&
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
            const args = tool.inputSchema.parse(block.input);
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
            const result = await tool.execute(args);
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
              content: JSON.stringify(result),
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
