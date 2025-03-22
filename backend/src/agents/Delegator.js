import { BaseAgent } from './BaseAgent.js';
import { readFile, getRepoFiles } from '../utils/file-utils.js';
import { logMessage } from '../utils/logger.js';
import { ContentType, AgentTypes } from '../constants.js';
import { z } from 'zod';
import path from 'path';

// Define the output schema for the Delegator agent
const TaskSchema = z.object({
  context: z.string(),
  tasks: z.array(z.object({
    task: z.string(),
    files: z.array(z.string())
  }))
});

// System message for the Delegator agent
const SYSTEM_MESSAGE = `
You are a software architect that helps break down coding tasks into smaller tasks.
Your job is to analyze a codebase and recommend specific files to write or modify.
You will receive a high-level task and need to break it down into a series of smaller,
more focused tasks along with the relevant files for each task.

For each task, consider:
1. What files need to be created or modified
2. How the changes fit into the overall architecture
3. Dependencies between tasks

Provide a clear breakdown of tasks that can be assigned to developers.
`;

/**
 * Delegator Agent that breaks down tasks
 */
export class Delegator extends BaseAgent {
  /**
   * Create a new Delegator agent
   */
  constructor() {
    super(
      AgentTypes.DELEGATOR,
      'A software architect',
      SYSTEM_MESSAGE
    );
  }

  /**
   * Gather codebase context
   * @param {number} maxFiles - Maximum number of files to include
   * @returns {Promise<string>} - Codebase context
   */
  async getCodebaseContext(maxFiles = 20) {
    try {
      // Get repository files
      const files = await getRepoFiles('.', [
        'node_modules/*',
        '.git/*',
        '*.log',
        '*.lock'
      ]);
      
      // Sort by importance and take the top N
      const importantFiles = files
        .filter(file => !file.includes('node_modules/'))
        .filter(file => ['.js', '.ts', '.jsx', '.tsx', '.json'].some(ext => file.endsWith(ext)))
        .slice(0, maxFiles);
      
      // Read file contents
      let context = '';
      for (const file of importantFiles) {
        const content = await readFile(file);
        context += `File: ${file}\n${content}\n\n`;
      }
      
      return context;
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Error gathering codebase context: ${error.message}`,
        contentType: ContentType.ERROR
      });
      return '';
    }
  }

  /**
   * Handle a delegator message
   * @param {string} message - The user's task request
   */
  async handleDelegatorTask(message) {
    try {
      // Get codebase context
      const codebaseContext = await this.getCodebaseContext();
      
      // Create prompt with task and codebase context
      const prompt = `
User Request: ${message}

Codebase Context:
${codebaseContext}

Break down this task into smaller, more manageable tasks. For each task, specify which files should be created or modified.
      `;
      
      // Call LLM with structured output schema
      const taskBreakdown = await this.call(prompt, TaskSchema);
      
      // Process each task
      const { Builder } = await import('./Builder.js');
      
      for (const task of taskBreakdown.tasks) {
        // Create a builder agent for each task
        const builder = new Builder();
        
        // Send task to builder
        await builder.handleTask({
          task: task.task,
          context: taskBreakdown.context,
          files: task.files
        });
      }
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Error handling delegator task: ${error.message}`,
        contentType: ContentType.ERROR
      });
      throw error;
    }
  }
}