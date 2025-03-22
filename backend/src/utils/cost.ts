import { SUPPORTED_MODELS } from './models.js';

/**
 * Calculate the cost of a model API call
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

/**
 * Estimate token count for a text string (very rough estimate)
 * @param text - The text to estimate token count for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // This is a very rough estimate, about 4 characters per token
  return Math.ceil(text.length / 4);
}
