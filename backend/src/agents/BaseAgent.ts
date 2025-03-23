import { getModelClient, SUPPORTED_MODELS, DEFAULT_MODEL } from '../utils/models.js';
import { logMessage } from '../utils/logger.js';
import { calculateCost } from '../utils/cost.js';
import { ContentType } from '../constants.js';
import { Agent } from '../models/index.js';
import { GLOBAL_STORE } from '../constants.js';
import { v4 as uuidv4 } from 'uuid';
import { z, ZodObject, ZodRawShape } from 'zod';
import { generateObject, streamText } from 'ai';

// Message structure for memory
interface MemoryMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Base Agent class that all specific agents will extend
 */
export class BaseAgent {
  public readonly agentType: string;
  public readonly description: string;
  public readonly systemMessage: string;
  public model: string;
  public readonly id: string;
  protected memory: MemoryMessage[];

  /**
   * Create a new BaseAgent
   * @param agentType - Type of agent (delegator, builder, etc.)
   * @param description - Human-readable description of the agent
   * @param systemMessage - System message for the LLM
   */
  constructor(agentType: string, description: string, systemMessage: string) {
    this.agentType = agentType;
    this.description = description;
    this.systemMessage = systemMessage;
    this.model = DEFAULT_MODEL;
    this.id = `${this.agentType}|${uuidv4().slice(0, 8)}`;
    this.memory = [];

    // Initialize agent in the database
    void this._initializeAgent();
  }

  /**
   * Initialize agent record in the database
   */
  private async _initializeAgent(): Promise<void> {
    try {
      // Check if agent already exists
      const existingAgent = await Agent.findOne({
        where: {
          id: this.id,
          projectId: GLOBAL_STORE.PROJECT_ID,
        },
      });

      if (!existingAgent) {
        // Create a new agent record
        await Agent.create({
          id: this.id,
          projectId: GLOBAL_STORE.PROJECT_ID,
          model: this.model,
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessage({
        source: this.id,
        content: `Failed to initialize agent: ${errorMessage}`,
        contentType: ContentType.ERROR,
      });
    }
  }

  /**
   * Update the agent's model
   * @param modelName - New model name
   */
  public async updateModel(modelName: string): Promise<void> {
    try {
      if (!SUPPORTED_MODELS[modelName]) {
        throw new Error(`Model ${modelName} not supported`);
      }

      // Update model in database
      await Agent.update(
        { model: modelName },
        {
          where: {
            id: this.id,
            projectId: GLOBAL_STORE.PROJECT_ID,
          },
        }
      );

      // Update local model reference
      this.model = modelName;

      logMessage({
        source: this.id,
        content: `Model updated to ${modelName}`,
        contentType: ContentType.INFO,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessage({
        source: this.id,
        content: `Failed to update model: ${errorMessage}`,
        contentType: ContentType.ERROR,
      });
      throw error;
    }
  }

  /**
   * Call the LLM with a structured output format
   * @param prompt - User prompt
   * @param outputSchema - Zod schema for output validation
   * @returns Structured response from the LLM
   */
  public async call<T extends ZodRawShape>(
    prompt: string,
    outputSchema: ZodObject<T>
  ): Promise<z.infer<ZodObject<T>>> {
    logMessage({
      source: this.id,
      content: prompt,
      contentType: ContentType.MESSAGE,
    });

    try {
      // Add to memory
      this.memory.push({ role: 'user', content: prompt });

      // Prepare messages for the LLM
      const messages: MemoryMessage[] = [
        { role: 'system', content: this.systemMessage },
        ...this.memory.slice(-10), // Keep last 10 messages for context
      ];

      // Get client for current model
      const client = getModelClient(this.model);

      // Call LLM
      const response = await generateObject({
        model: client,
        messages,
        schema: outputSchema,
      });

      // Parse response
      const parsedContent = response.object;
      if (!parsedContent) {
        throw new Error('No content returned from LLM');
      }

      // Add to memory
      this.memory.push({ role: 'assistant', content: JSON.stringify(parsedContent) });

      // Calculate and record usage
      const inputTokens = response.usage?.promptTokens ?? 0;
      const outputTokens = response.usage?.completionTokens ?? 0;
      const cost = calculateCost(inputTokens, outputTokens, this.model);

      // Update agent stats in database
      await this._recordUsage(inputTokens, outputTokens, cost);

      // Log usage information
      logMessage({
        source: this.id,
        content: JSON.stringify({
          cost,
          inputTokens,
          outputTokens,
        }),
        contentType: ContentType.INFO,
      });

      return parsedContent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessage({
        source: this.id,
        content: `Error calling LLM: ${errorMessage}`,
        contentType: ContentType.ERROR,
      });
      throw error;
    }
  }

  /**
   * Stream LLM response
   * @param prompt - User prompt
   * @returns Generator with streamed response
   */
  public async *stream(prompt: string): AsyncGenerator<string, string> {
    logMessage({
      source: this.id,
      content: prompt,
      contentType: ContentType.MESSAGE,
    });

    try {
      // Add to memory
      this.memory.push({ role: 'user', content: prompt });

      // Prepare messages for the LLM
      const messages: MemoryMessage[] = [
        { role: 'system', content: this.systemMessage },
        ...this.memory.slice(-10), // Keep last 10 messages for context
      ];

      // Get client for current model
      const client = getModelClient(this.model);

      // Initialize tracking variables
      let fullResponse = '';
      let usage = { prompt_tokens: 0, completion_tokens: 0 };

      // Stream response
      const { textStream: stream } = await streamText({
        model: client,
        messages,
      });

      for await (const content of stream) {
        if (content) {
          fullResponse += content;

          // Log and yield each chunk
          logMessage({
            source: this.id,
            content,
            contentType: ContentType.MESSAGE_STREAM,
          });

          yield content;

          // Roughly estimate tokens (this is approximate)
          usage.completion_tokens += Math.ceil(content.length / 4);
        }
      }

      // Estimate prompt tokens (this is approximate)
      usage.prompt_tokens = messages.reduce(
        (acc, msg) => acc + Math.ceil(msg.content.length / 4),
        0
      );

      // Add to memory
      this.memory.push({ role: 'assistant', content: fullResponse });

      // Calculate and record usage
      const cost = calculateCost(usage.prompt_tokens, usage.completion_tokens, this.model);

      // Update agent stats in database
      await this._recordUsage(usage.prompt_tokens, usage.completion_tokens, cost);

      // Log usage information
      logMessage({
        source: this.id,
        content: JSON.stringify({
          cost,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
        }),
        contentType: ContentType.INFO,
      });

      return fullResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessage({
        source: this.id,
        content: `Error streaming from LLM: ${errorMessage}`,
        contentType: ContentType.ERROR,
      });
      throw error;
    }
  }

  /**
   * Record usage statistics in the database
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cost - Cost of the API call
   */
  private async _recordUsage(
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    try {
      await Agent.increment(
        {
          inputTokens,
          outputTokens,
          cost,
        },
        {
          where: {
            id: this.id,
            projectId: GLOBAL_STORE.PROJECT_ID,
          },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessage({
        source: this.id,
        content: `Failed to record usage: ${errorMessage}`,
        contentType: ContentType.ERROR,
      });
    }
  }

  /**
   * Handle a conversation message (to be implemented by subclasses)
   * @param source - Source of the conversation
   * @param message - The conversation message
   */
  public async handleConversation(message: string): Promise<void> {
    // Default implementation just streams the response
    const generator = this.stream(message);
    for await (const _ of generator) {
      // Process each chunk (already logged in stream method)
    }
  }
}
