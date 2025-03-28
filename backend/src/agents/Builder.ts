// import { BaseAgent } from './BaseAgent.js';
// import { readFile, writeFile } from '../utils/file-utils.js';
// import { logMessage } from '../utils/logger.js';
// import { ContentType, AgentTypes } from '../constants.js';
// import { z } from 'zod';

// // Define types for task objects
// export interface BuilderTask {
//   task: string;
//   context: string;
//   files: string[];
// }

// // Define the output schema for the Builder agent
// const FileSchema = z.object({
//   file: z.string(),
//   content: z.string(),
// });

// const WorkSchema = z.object({
//   files: z.array(FileSchema),
// });

// // System message for the Builder agent
// const SYSTEM_MESSAGE = `
// You are an elite software engineer that writes code using node.ts and javascript.
// You are given a list of files you need to write as well as some instructions about
// how the files you're tasked with fit into the bigger program.
// You are only responsible for your task, but the team task is provided for context.
// ALWAYS ensure that you output the full contents of the original file and modifications. This file
// is going to be hot reloaded back into the website so it must be working.
// `;

// /**
//  * Builder Agent that implements code tasks
//  */
// export class Builder extends BaseAgent {
//   /**
//    * Create a new Builder agent
//    */
//   constructor() {
//     super(AgentTypes.BUILDER, 'A software developer', SYSTEM_MESSAGE);
//   }

//   /**
//    * Process file strings to create a context string
//    * @param files - Array of file paths
//    * @returns Concatenated file contents
//    */
//   async processFileStrings(files: string[]): Promise<string> {
//     let result = '';

//     for (const filePath of files) {
//       const content = await readFile(filePath);
//       result += `${filePath}\n${content}\n\n`;
//     }

//     return result;
//   }

//   /**
//    * Handle a task message
//    * @param task - Task object
//    */
//   async handleTask(task: BuilderTask): Promise<void> {
//     try {
//       // Process files to create context
//       const fileString = await this.processFileStrings(task.files);

//       // Create prompt with task and files
//       const prompt = `Team task: ${task.context}; Your Task: ${task.task}\nFiles: ${fileString}`;

//       // Call LLM with structured output schema
//       const work = await this.call(prompt, WorkSchema);

//       // Write files to disk
//       for (const file of work.files) {
//         logMessage({
//           source: this.id,
//           content: file.content,
//           contentType: ContentType.MESSAGE,
//         });

//         // Write the file
//         await writeFile(file.file, file.content);
//       }
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       logMessage({
//         source: this.id,
//         content: `Error handling task: ${errorMessage}`,
//         contentType: ContentType.ERROR,
//       });
//       throw error;
//     }
//   }
// }
