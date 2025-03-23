import express, { Request, Response } from 'express';
import { Agent } from '../models/index.js';
import { GLOBAL_STORE } from '../constants.js';
import { SUPPORTED_MODELS } from '../utils/models.js';
import { getAgent } from '../agents/index.js';
import { logMessage } from '../utils/logger.js';
import { ContentType } from '../constants.js';
import { BaseAgent } from '../agents/BaseAgent.js';

const router = express.Router();

// Type definition for model update request
interface ModelUpdateRequest {
  model: string;
}

/**
 * Get agent information
 * GET /agents/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const agentId = req.params['id'];

    const agent = await Agent.findOne({
      where: {
        id: agentId,
        projectId: GLOBAL_STORE.PROJECT_ID,
      },
    });

    if (!agent) {
      return res.status(200).json({
        cost: 0,
        model: 'none',
        firstName: '',
        lastName: '',
        inputTokens: 0,
        outputTokens: 0,
      });
    }

    return res.json({
      cost: agent.cost,
      model: agent.model,
      firstName: agent.firstName || '',
      lastName: agent.lastName || '',
      inputTokens: agent.inputTokens,
      outputTokens: agent.outputTokens,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching agent info:', errorMessage);
    return res.status(500).json({ error: 'Failed to fetch agent info' });
  }
});

/**
 * Update agent model
 * PUT /agents/:id/model
 */
router.put('/:id/model', async (req: Request, res: Response): Promise<Response> => {
  try {
    const agentId = req.params['id'];
    if (!agentId) return res.status(400).json({ error: 'missing agentId ' });

    const { model: modelName } = req.body as ModelUpdateRequest;

    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Validate model
    if (!SUPPORTED_MODELS[modelName]) {
      return res.status(400).json({ error: `Model ${modelName} not supported` });
    }

    // Update in database
    const agent = await Agent.findOne({
      where: {
        id: agentId,
        projectId: GLOBAL_STORE.PROJECT_ID,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    agent.model = modelName;
    await agent.save();

    // Try to update active agent if it exists
    try {
      // Get the agent type and key from the database ID
      const keyParts = agentId.split('|');
      if (keyParts.length !== 2) {
        return res.status(400).json({ error: 'Invalid agent key format' });
      }

      const agentType = keyParts[0];
      if (!agentType) return res.status(400).json({ error: 'missing agent type ' });

      // Find correct agent in runtime and update its model
      try {
        const agentInstance = getAgent(agentType) as BaseAgent;
        if (agentInstance) {
          await agentInstance.updateModel(modelName);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to update agent model: ${errorMessage}`);
      }
    } catch (error) {
      // Don't fail the request if this fails (agent might not be loaded)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessage({
        source: 'AGENT_ROUTER',
        content: `Error updating agent model: ${errorMessage}`,
        contentType: ContentType.ERROR,
      });
    }

    return res.json({ message: `Updated agent model to ${modelName}` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating agent model:', errorMessage);
    return res.status(500).json({ error: 'Failed to update agent model' });
  }
});

export default router;
