import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config';
import { tools } from '../tools';
import { z } from 'zod';

export class Agent {
  private client = new Anthropic();

  constructor(
    private toolRegistry: typeof tools,
    private approve: (
      name: string,
      input: unknown,
    ) => Promise<boolean> = async () => false,
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

  async run(question: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: question },
    ];

    for (let step = 0; step < this.maxSteps; step++) {
      const response = await this.client.messages.create({
        model: config.anthropicModel,
        max_tokens: 1024,
        messages,
        tools: this.toolDefs(),
      });

      if (response.stop_reason !== 'tool_use') {
        const text = response.content.find((c) => c.type === 'text');

        return text?.type === 'text' ? text.text : '';
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') {
          continue;
        }

        const tool = this.toolRegistry[block.name];
        console.log(`→ ${block.name}(${JSON.stringify(block.input)})`);

        if (tool.sensitive && !(await this.approve(block.name, block.input))) {
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
          const result = await tool.execute(args);
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

    return 'Max steps reached without a final answer.';
  }
}
