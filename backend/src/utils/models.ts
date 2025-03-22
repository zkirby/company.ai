import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';

// Default model
export const DEFAULT_MODEL = process.env['DEFAULT_MODEL'] || 'gpt-4o-mini';

// Types for model pricing
export interface ModelPricing {
  divisor: number;
  input: number;
  output: number;
}

// Type for model configuration
export interface ModelConfig {
  provider: 'openai' | 'anthropic';
  contextWindow: number;
  pricing: ModelPricing;
}

// Type for supported models map
export type SupportedModelsMap = Record<string, ModelConfig>;

// Model definitions with pricing
export const SUPPORTED_MODELS: SupportedModelsMap = {
  'gpt-4o-mini': {
    provider: 'openai',
    contextWindow: 128000,
    pricing: {
      divisor: 1_000_000,
      input: 0.15,
      output: 0.6,
    },
  },
  'gpt-4o': {
    provider: 'openai',
    contextWindow: 128000,
    pricing: {
      divisor: 1_000_000,
      input: 2.25,
      output: 10,
    },
  },
  'claude-3-7-sonnet-20250219': {
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      divisor: 1_000_000,
      input: 3,
      output: 15,
    },
  },
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      divisor: 1_000_000,
      input: 0.8,
      output: 4,
    },
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: {
      divisor: 1_000_000,
      input: 15,
      output: 75,
    },
  },
};

/**
 * Get model client for a specific model
 * @param modelName - The model name
 * @returns The model client
 */
export function getModelClient(modelName: string): LanguageModelV1 {
  const modelConfig = SUPPORTED_MODELS[modelName];
  if (!modelConfig) {
    throw new Error(`Model ${modelName} is not supported`);
  }

  if (modelConfig.provider === 'openai') {
    return openai(modelName);
  } else if (modelConfig.provider === 'anthropic') {
    return anthropic(modelName);
  } else {
    throw new Error(`Provider ${modelConfig.provider} not implemented`);
  }
}

/**
 * Calculate cost based on token usage
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param modelName - The model used
 * @returns The cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName: string
): number {
  const model = SUPPORTED_MODELS[modelName];
  if (!model) {
    return 0;
  }

  const { divisor, input, output } = model.pricing;
  return (inputTokens * input + outputTokens * output) / divisor;
}
