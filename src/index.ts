import * as readline from 'node:readline/promises';
import { Agent } from './agent';
import { logger } from './logger/logger';
import { McpToolSource } from './tools/mcp-tool-source';
import { shutdownTracing } from './tracer/instrumentation';

const approve = async (name: string, input: unknown): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(
    `Approve ${name}(${JSON.stringify(input)})? (y/n) `,
  );
  rl.close();
  return answer.trim().toLowerCase() === 'y';
};

async function main() {
  const toolSource = new McpToolSource();
  await toolSource.connect();

  const agent = new Agent(toolSource, approve);
  const { answer } = await agent.run(
    'Review account 4471 and flag it if anything looks unusual.',
  );
  console.log('\n' + answer);

  await shutdownTracing();
}

main().catch((err) => {
  logger.error('fatal', { error: (err as Error).message });
  process.exit(1);
});
