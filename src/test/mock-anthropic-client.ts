import type Anthropic from '@anthropic-ai/sdk';
import type { AnthropicClient } from '../agent';

const usage = {
  input_tokens: 1,
  output_tokens: 1,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: null,
  server_tool_use: null,
  service_tier: null,
};

/**
 * Test fixtures are built as loosely-typed objects and cast to `Anthropic.Message`
 * because the SDK's response types require internal/beta fields (e.g. `caller`,
 * `stop_details`) that are irrelevant to the agent loop and churn across SDK versions.
 */
export function textResponse(text: string): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-4-5-20251001',
    content: [{ type: 'text', text, citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage,
  } as unknown as Anthropic.Message;
}

export function toolUseResponse(
  name: string,
  input: unknown,
  id = `toolu_${name}`,
): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-4-5-20251001',
    content: [{ type: 'tool_use', id, name, input }],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage,
  } as unknown as Anthropic.Message;
}

/** A fake Anthropic client that replays a fixed script of responses, one per call. */
export function makeScriptedClient(
  responses: Anthropic.Message[],
): AnthropicClient & { calls: Anthropic.MessageCreateParams[] } {
  const calls: Anthropic.MessageCreateParams[] = [];
  let step = 0;
  return {
    calls,
    messages: {
      create: (async (params: Anthropic.MessageCreateParams) => {
        calls.push(params);
        const response = responses[Math.min(step, responses.length - 1)];
        step++;
        return response;
      }) as Anthropic.Messages['create'],
    },
  };
}
