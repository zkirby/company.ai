import { tool } from 'ai';
import { writeFileSync } from 'fs';
import { cwd } from 'process';
import { z } from 'zod';

export default tool({
  description: 'Write a product specification in markdown',
  parameters: z.object({
    fileName: z.string().describe('The name of the file for the spec'),
    content: z.string().describe('The markdown contents'),
  }),
  execute: async ({ fileName, content }) => {
    await writeFileSync(cwd() + '/src/test-bed/' + `${fileName}.md`, content);
    return `The '${fileName}.md' product spec was successfully created`;
  },
});
