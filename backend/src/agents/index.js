import { Delegator } from './Delegator.js';
import { Builder } from './Builder.js';
import { AgentTypes, UserTopics } from '../constants.js';
import { logMessage } from '../utils/logger.js';
import { ContentType } from '../constants.js';

// Cache for active agents
const agentCache = new Map();

/**
 * Get or create an agent based on type
 * @param {string} agentType - Type of agent to get
 * @returns {Object} The agent instance
 */
function getAgent(agentType) {
  // Check if agent exists in cache
  if (agentCache.has(agentType)) {
    return agentCache.get(agentType);
  }
  
  // Create new agent based on type
  let agent;
  switch (agentType) {
    case AgentTypes.DELEGATOR:
      agent = new Delegator();
      break;
    case AgentTypes.BUILDER:
      agent = new Builder();
      break;
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
  
  // Add to cache
  agentCache.set(agentType, agent);
  
  return agent;
}

/**
 * Handle a conversation with an agent
 * @param {string} agentType - Type of agent to converse with
 * @param {string} source - Source of the conversation
 * @param {string} message - The conversation message
 */
export async function handleConversation(agentType, source, message) {
  try {
    const agent = getAgent(agentType);
    await agent.handleConversation(source, message);
  } catch (error) {
    logMessage({
      source: 'AGENT_MANAGER',
      content: `Error handling conversation: ${error.message}`,
      contentType: ContentType.ERROR
    });
  }
}

/**
 * Handle a delegator task
 * @param {string} message - The task message
 */
export async function handleDelegatorTask(message) {
  try {
    const delegator = getAgent(AgentTypes.DELEGATOR);
    await delegator.handleDelegatorTask(message);
  } catch (error) {
    logMessage({
      source: 'AGENT_MANAGER',
      content: `Error handling delegator task: ${error.message}`,
      contentType: ContentType.ERROR
    });
  }
}