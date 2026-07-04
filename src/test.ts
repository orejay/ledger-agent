import { Agent } from './agent';
import { tools } from './tools';

const agent = new Agent(tools);

// await agent.run('show me recent activity on account 4471').then((response) => {
//   console.log('Agent response:', response);
// });

agent
  .run("Review account 4471's recent activity and flag the account.")
  .then((response) => {
    console.log('Agent response:', response);
  });
