import { getModelClient, SUPPORTED_MODELS, DEFAULT_MODEL } from '../utils/models.js';
import { logMessage } from '../utils/logger.js';
import { calculateCost } from '../utils/cost.js';
import { ContentType } from '../constants.js';
import { Agent } from '../models/index.js';
import { GLOBAL_STORE } from '../constants.js';
import { v4 as uuidv4 } from 'uuid';
import { CoreMessage, generateText, streamText, ToolSet } from 'ai';

/**
 * Base Agent class that all specific agents will extend
 */
export class BaseAgent {
  public readonly description: string;
  public readonly systemMessage: string;
  public model: string;
  public readonly id: string;
  protected memory: CoreMessage[];
  private tools: ToolSet;

  /**
   * Create a new BaseAgent
   * @param agentType - Type of agent (delegator, builder, etc.)
   * @param description - Human-readable description of the agent
   * @param systemMessage - System message for the LLM
   */
  constructor({
    description,
    systemMessage,
    tools,
    model,
    id,
  }: {
    description: string;
    systemMessage: string;
    tools: ToolSet;
    model?: string;
    id?: string;
  }) {
    this.tools = tools;
    this.description = description;
    this.systemMessage = systemMessage;
    this.model = model ?? DEFAULT_MODEL;
    this.id = id ?? uuidv4();
    this.memory = [];
  }

  /**
   * Generate a random first name
   */
  private _generateRandomFirstName(): string {
    const firstNames = [
      'Alex',
      'Bailey',
      'Casey',
      'Dakota',
      'Elliott',
      'Finley',
      'Gray',
      'Harper',
      'Jordan',
      'Kai',
      'Logan',
      'Morgan',
      'Noah',
      'Parker',
      'Quinn',
      'Riley',
      'Sage',
      'Taylor',
      'Avery',
      'Blake',
      'Charlie',
      'Drew',
      'Emerson',
      'Frankie',
      'Jamie',
      'Kelly',
      'Lee',
      'Mason',
      'Noel',
      'Peyton',
      'Reese',
      'Skyler',
      'Tatum',
      'Whitney',
      'Zion',
      'Phoenix',
      'River',
      'Rowan',
      'Sawyer',
      'Sidney',
    ];
    const index = Math.floor(Math.random() * firstNames.length);
    return firstNames[index] || 'Unknown'; // Fallback in case of undefined
  }

  /**
   * Generate a random last name
   */
  private _generateRandomLastName(): string {
    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Jones',
      'Brown',
      'Davis',
      'Miller',
      'Wilson',
      'Moore',
      'Taylor',
      'Anderson',
      'Thomas',
      'Jackson',
      'White',
      'Harris',
      'Martin',
      'Thompson',
      'Garcia',
      'Martinez',
      'Robinson',
      'Clark',
      'Rodriguez',
      'Lewis',
      'Lee',
      'Walker',
      'Hall',
      'Allen',
      'Young',
      'Hernandez',
      'King',
      'Wright',
      'Lopez',
      'Hill',
      'Scott',
      'Green',
      'Adams',
      'Baker',
      'Gonzalez',
      'Nelson',
      'Carter',
      'Mitchell',
      'Perez',
      'Roberts',
      'Turner',
      'Phillips',
      'Campbell',
      'Parker',
      'Evans',
      'Edwards',
      'Collins',
      'Stewart',
      'Sanchez',
      'Morris',
      'Rogers',
      'Reed',
      'Cook',
      'Morgan',
      'Bell',
      'Murphy',
      'Bailey',
      'Rivera',
      'Cooper',
      'Richardson',
      'Cox',
      'Howard',
      'Ward',
      'Torres',
      'Peterson',
      'Gray',
      'Ramirez',
      'James',
      'Watson',
    ];
    const index = Math.floor(Math.random() * lastNames.length);
    return lastNames[index] || 'Unknown'; // Fallback in case of undefined
  }

  /**
   * Initialize agent record in the database
   */
  async _initializeAgent(): Promise<void> {
    try {
      // Check if agent already exists
      const existingAgent = await Agent.findOne({
        where: {
          id: this.id,
          projectId: GLOBAL_STORE.PROJECT_ID,
        },
      });

      if (!existingAgent) {
        // Generate random names
        const firstName = this._generateRandomFirstName();
        const lastName = this._generateRandomLastName();

        // Create a new agent record
        await Agent.create({
          id: this.id,
          projectId: GLOBAL_STORE.PROJECT_ID,
          model: this.model,
          firstName,
          lastName,
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
        });

        logMessage({
          source: this.id,
          content: `Agent initialized with name: ${firstName} ${lastName}`,
          contentType: ContentType.INFO,
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
  public async call(messages: CoreMessage[]): Promise<void> {
    try {
      // Get client for current model
      const client = getModelClient(this.model);

      // Call LLM
      const { usage: totalUsage } = await generateText({
        model: client,
        messages,
        tools: this.tools,
        maxSteps: 3,
        onStepFinish: ({ usage, stepType, toolCalls, text }) => {
          logMessage({
            source: this.id,
            content: JSON.stringify({ text, stepType, toolCalls }),
            contentType: ContentType.MESSAGE,
          });
          logMessage({
            source: this.id,
            content: JSON.stringify(this.parseUsage(usage)),
            contentType: ContentType.INFO,
          });
        },
      });

      // Calculate and record usage

      // Update agent stats in database
      await this._recordUsage(this.parseUsage(totalUsage));

      // Log usage information
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
      const messages: CoreMessage[] = [
        { role: 'system', content: this.systemMessage },
        ...this.memory.slice(-10), // Keep last 10 messages for context
      ];

      // Get client for current model
      const client = getModelClient(this.model);

      // Initialize tracking variables
      let fullResponse = '';

      // Stream response
      const { textStream: stream, usage } = await streamText({
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
        }
      }

      // Add to memory
      this.memory.push({ role: 'assistant', content: fullResponse });

      // Calculate and record usage

      // Update agent stats in database
      await this._recordUsage(this.parseUsage(await usage));

      // Log usage information
      logMessage({
        source: this.id,
        content: JSON.stringify(this.parseUsage(await usage)),
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

  private parseUsage(usage: Awaited<ReturnType<typeof generateText>>['usage']) {
    const inputTokens = usage?.promptTokens ?? 0;
    const outputTokens = usage?.completionTokens ?? 0;
    const cost = calculateCost(inputTokens, outputTokens, this.model);

    return {
      inputTokens,
      outputTokens,
      cost,
    };
  }

  /**
   * Record usage statistics in the database
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cost - Cost of the API call
   */
  private async _recordUsage({
    inputTokens,
    outputTokens,
    cost,
  }: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void> {
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
