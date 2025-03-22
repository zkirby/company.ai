import express from 'express';
import { SUPPORTED_MODELS } from '../utils/models.js';

const router = express.Router();

/**
 * Get all supported models with pricing information
 * GET /models
 */
router.get('/', (req, res) => {
  try {
    // Return model names and their associated pricing info
    const models = Object.entries(SUPPORTED_MODELS).reduce((acc, [modelName, modelInfo]) => {
      acc[modelName] = {
        price: modelInfo.pricing,
        contextWindow: modelInfo.contextWindow
      };
      return acc;
    }, {});
    
    return res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
});

export default router;