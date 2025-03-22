import { getModelClient, SUPPORTED_MODELS, DEFAULT_MODEL } from '../utils/models.js';
import { logMessage } from '../utils/logger.js';
import { calculateCost } from '../utils/cost.js';
import { ContentType } from '../constants.js';
import { Agent } from '../models/index.js';
import { sequelize } from '../db/index.js';
import { GLOBAL_STORE } from '../constants.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base Agent class that all specific agents will extend
 */
export class BaseAgent {
  /**
   * Create a new BaseAgent
   * @param {string} agentType - Type of agent (delegator, builder, etc.)
   * @param {string} description - Human-readable description of the agent
   * @param {string} systemMessage - System message for the LLM
   */
  constructor(agentType, description, systemMessage) {
    this.agentType = agentType;
    this.description = description;
    this.systemMessage = systemMessage;
    this.model = DEFAULT_MODEL;
    this.id = `${this.agentType}|${uuidv4().slice(0, 8)}`;
    this.memory = [];
    
    // Initialize agent in the database
    this._initializeAgent();
  }

  /**
   * Initialize agent record in the database
   */
  async _initializeAgent() {
    try {
      // Check if agent already exists
      const existingAgent = await Agent.findOne({
        where: {
          id: this.id,
          projectId: GLOBAL_STORE.PROJECT_ID
        }
      });

      if (!existingAgent) {
        // Create a new agent record
        await Agent.create({
          id: this.id,
          projectId: GLOBAL_STORE.PROJECT_ID,
          model: this.model,
          cost: 0,
          inputTokens: 0,
          outputTokens: 0
        });
      }
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Failed to initialize agent: ${error.message}`,
        contentType: ContentType.ERROR
      });
    }
  }

  /**
   * Update the agent's model
   * @param {string} modelName - New model name
   */
  async updateModel(modelName) {
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
            projectId: GLOBAL_STORE.PROJECT_ID
          }
        }
      );

      // Update local model reference
      this.model = modelName;

      logMessage({
        source: this.id,
        content: `Model updated to ${modelName}`,
        contentType: ContentType.INFO
      });
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Failed to update model: ${error.message}`,
        contentType: ContentType.ERROR
      });
      throw error;
    }
  }

  /**
   * Call the LLM with a structured output format
   * @param {string} prompt - User prompt
   * @param {object} outputSchema - Zod schema for output validation
   * @returns {Promise<object>} Structured response from the LLM
   */
  async call(prompt, outputSchema) {
    logMessage({
      source: this.id,
      content: prompt,
      contentType: ContentType.MESSAGE
    });

    try {
      // Add to memory
      this.memory.push({ role: 'user', content: prompt });

      // Prepare messages for the LLM
      const messages = [
        { role: 'system', content: this.systemMessage },
        ...this.memory.slice(-10) // Keep last 10 messages for context
      ];

      // Get client for current model
      const client = getModelClient(this.model);
      
      // Call LLM
      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        response_format: { type: 'json_object' }
      });

      // Parse response
      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);
      
      // Validate with schema if provided
      const validatedContent = outputSchema 
        ? outputSchema.parse(parsedContent) 
        : parsedContent;

      // Add to memory
      this.memory.push({ role: 'assistant', content });

      // Calculate and record usage
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;
      const cost = calculateCost(inputTokens, outputTokens, this.model);

      // Update agent stats in database
      await this._recordUsage(inputTokens, outputTokens, cost);

      // Log usage information
      logMessage({
        source: this.id,
        content: JSON.stringify({ 
          cost, 
          inputTokens, 
          outputTokens 
        }),
        contentType: ContentType.INFO
      });

      return validatedContent;
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Error calling LLM: ${error.message}`,
        contentType: ContentType.ERROR
      });
      throw error;
    }
  }

  /**
   * Stream LLM response
   * @param {string} prompt - User prompt
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async *stream(prompt) {
    logMessage({
      source: this.id,
      content: prompt,
      contentType: ContentType.MESSAGE
    });

    try {
      // Add to memory
      this.memory.push({ role: 'user', content: prompt });

      // Prepare messages for the LLM
      const messages = [
        { role: 'system', content: this.systemMessage },
        ...this.memory.slice(-10) // Keep last 10 messages for context
      ];

      // Get client for current model
      const client = getModelClient(this.model);
      
      // Initialize tracking variables
      let fullResponse = '';
      let usage = { prompt_tokens: 0, completion_tokens: 0 };

      // Stream response
      const stream = await client.chat.completions.create({
        model: this.model,
        messages,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          
          // Log and yield each chunk
          logMessage({
            source: this.id,
            content,
            contentType: ContentType.MESSAGE_STREAM
          });
          
          yield content;
          
          // Roughly estimate tokens (this is approximate)
          usage.completion_tokens += Math.ceil(content.length / 4);
        }
      }

      // Estimate prompt tokens (this is approximate)
      usage.prompt_tokens = messages.reduce((acc, msg) => 
        acc + Math.ceil(msg.content.length / 4), 0);

      // Add to memory
      this.memory.push({ role: 'assistant', content: fullResponse });

      // Calculate and record usage
      const cost = calculateCost(
        usage.prompt_tokens, 
        usage.completion_tokens, 
        this.model
      );

      // Update agent stats in database
      await this._recordUsage(
        usage.prompt_tokens, 
        usage.completion_tokens, 
        cost
      );

      // Log usage information
      logMessage({
        source: this.id,
        content: JSON.stringify({ 
          cost, 
          inputTokens: usage.prompt_tokens, 
          outputTokens: usage.completion_tokens 
        }),
        contentType: ContentType.INFO
      });

      return fullResponse;
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Error streaming from LLM: ${error.message}`,
        contentType: ContentType.ERROR
      });
      throw error;
    }
  }

  /**
   * Record usage statistics in the database
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {number} cost - Cost of the API call
   */
  async _recordUsage(inputTokens, outputTokens, cost) {
    try {
      await Agent.increment(
        {
          inputTokens,
          outputTokens,
          cost
        },
        {
          where: {
            id: this.id,
            projectId: GLOBAL_STORE.PROJECT_ID
          }
        }
      );
    } catch (error) {
      logMessage({
        source: this.id,
        content: `Failed to record usage: ${error.message}`,
        contentType: ContentType.ERROR
      });
    }
  }

  /**
   * Handle a conversation message (to be implemented by subclasses)
   * @param {string} source - Source of the conversation
   * @param {string} message - The conversation message
   */
  async handleConversation(source, message) {
    // Default implementation just streams the response
    await this.stream(message);
  }
}