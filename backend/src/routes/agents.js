import express from 'express';
import { Agent } from '../models/index.js';
import { GLOBAL_STORE } from '../constants.js';
import { SUPPORTED_MODELS } from '../utils/models.js';
import { AgentTypes } from '../constants.js';
import { getAgent } from '../agents/index.js';
import { logMessage } from '../utils/logger.js';
import { ContentType } from '../constants.js';

const router = express.Router();

/**
 * Get agent information
 * GET /agents/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    const agent = await Agent.findOne({
      where: {
        id: agentId,
        projectId: GLOBAL_STORE.PROJECT_ID
      }
    });
    
    if (!agent) {
      return res.status(200).json({ 
        cost: 0, 
        model: 'none', 
        inputTokens: 0, 
        outputTokens: 0 
      });
    }
    
    return res.json({
      cost: agent.cost,
      model: agent.model,
      inputTokens: agent.inputTokens,
      outputTokens: agent.outputTokens
    });
  } catch (error) {
    console.error('Error fetching agent info:', error);
    return res.status(500).json({ error: 'Failed to fetch agent info' });
  }
});

/**
 * Update agent model
 * PUT /agents/:id/model
 */
router.put('/:id/model', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { model: modelName } = req.body;
    
    // Validate model
    if (!SUPPORTED_MODELS[modelName]) {
      return res.status(400).json({ error: `Model ${modelName} not supported` });
    }
    
    // Update in database
    const agent = await Agent.findOne({
      where: {
        id: agentId,
        projectId: GLOBAL_STORE.PROJECT_ID
      }
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
      
      const [agentType, agentKey] = keyParts;
      
      // Find correct agent in runtime and update its model
      const agentInstance = getAgent(agentType);
      if (agentInstance) {
        await agentInstance.updateModel(modelName);
      }
    } catch (error) {
      // Don't fail the request if this fails (agent might not be loaded)
      logMessage({
        source: 'AGENT_ROUTER',
        content: `Error updating agent model: ${error.message}`,
        contentType: ContentType.ERROR
      });
    }
    
    return res.json({ message: `Updated agent model to ${modelName}` });
  } catch (error) {
    console.error('Error updating agent model:', error);
    return res.status(500).json({ error: 'Failed to update agent model' });
  }
});

export default router;