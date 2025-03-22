import { OpenAI } from '@vercel/ai/openai';
import { Anthropic } from '@vercel/ai/anthropic';

// Default model
export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4o-mini';

// Model definitions with pricing
export const SUPPORTED_MODELS = {
  'gpt-4o-mini': {
    provider: 'openai',
    contextWindow: 128000,
    pricing: {
      divisor: 1_000_000,
      input: 0.15,
      output: 0.6
    }
  },
  'gpt-4o': {
    provider: 'openai',
    contextWindow: 128000,
    pricing: {
      divisor: 1_000_000,
      input: 2.25,
      output: 10
    }
  },
  'claude-3-7-sonnet-20250219': {
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      divisor: 1_000_000,
      input: 3,
      output: 15
    }
  },
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      divisor: 1_000_000,
      input: 0.8,
      output: 4
    }
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      divisor: 1_000_000,
      input: 15,
      output: 75
    }
  }
};

// Provider clients
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Get model client for a specific model
 * @param {string} modelName - The model name
 * @returns {Object} The model client
 */
export function getModelClient(modelName) {
  const modelConfig = SUPPORTED_MODELS[modelName];
  if (!modelConfig) {
    throw new Error(`Model ${modelName} is not supported`);
  }

  if (modelConfig.provider === 'openai') {
    return openaiClient;
  } else if (modelConfig.provider === 'anthropic') {
    return anthropicClient;
  } else {
    throw new Error(`Provider ${modelConfig.provider} not implemented`);
  }
}

/**
 * Calculate cost based on token usage
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {string} modelName - The model used
 * @returns {number} The cost in USD
 */
export function calculateCost(inputTokens, outputTokens, modelName) {
  const model = SUPPORTED_MODELS[modelName];
  if (!model) {
    return 0;
  }

  const { divisor, input, output } = model.pricing;
  return ((inputTokens * input) + (outputTokens * output)) / divisor;
}