import * as readline from 'node:readline/promises';
import { Agent } from './agent';
import { tools } from './tools';

const approve = async (name: string, input: unknown) => {
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

const agent = new Agent(tools, approve);
const { answer, trace } = await agent.run('Review account 4471 and flag it.');
console.log('Answer:', answer);
console.log('Trace:', trace);
