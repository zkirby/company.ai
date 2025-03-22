import express, { Request, Response } from 'express';
import { SUPPORTED_MODELS } from '../utils/models.js';

const router = express.Router();

/**
 * Get all supported models with pricing information
 * GET /models
 */
router.get('/', (_req: Request, res: Response): Response => {
  try {
    // Return model names and their associated pricing info
    const models = Object.entries(SUPPORTED_MODELS).reduce<
      Record<string, { price: unknown; contextWindow: number }>
    >((acc, [modelName, modelInfo]) => {
      acc[modelName] = {
        price: modelInfo.pricing,
        contextWindow: modelInfo.contextWindow,
      };
      return acc;
    }, {});

    return res.json(models);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching models:', errorMessage);
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
});

export default router;
