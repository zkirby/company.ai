import { SUPPORTED_MODELS } from './models.js';

/**
 * Calculate the cost of a model API call
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

/**
 * Estimate token count for a text string (very rough estimate)
 * @param {string} text - The text to estimate token count for
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  // This is a very rough estimate, about 4 characters per token
  return Math.ceil(text.length / 4);
}