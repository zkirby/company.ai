import { Delegator } from './Delegator.js';
import { Builder } from './Builder.js';
import { BaseAgent } from './BaseAgent.js';
import { AgentTypes, ContentType } from '../constants.js';
import { logMessage } from '../utils/logger.js';

// Cache for active agents
const agentCache = new Map<string, BaseAgent>();

/**
 * Get or create an agent based on type
 * @param agentType - Type of agent to get
 * @returns The agent instance
 */
export function getAgent(agentType: string): BaseAgent {
  // Check if agent exists in cache
  if (agentCache.has(agentType)) {
    const agent = agentCache.get(agentType);
    if (agent) {
      return agent;
    }
  }

  // Create new agent based on type
  let agent: BaseAgent;
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
 * @param agentType - Type of agent to converse with
 * @param source - Source of the conversation
 * @param message - The conversation message
 */
export async function handleConversation(agentType: string, message: string): Promise<void> {
  try {
    const agent = getAgent(agentType);
    await agent.handleConversation(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage({
      source: 'AGENT_MANAGER',
      content: `Error handling conversation: ${errorMessage}`,
      contentType: ContentType.ERROR,
    });
  }
}

/**
 * Handle a delegator task
 * @param message - The task message
 */
export async function handleDelegatorTask(message: string): Promise<void> {
  try {
    const delegator = getAgent(AgentTypes.DELEGATOR) as Delegator;
    await delegator.handleDelegatorTask(message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage({
      source: 'AGENT_MANAGER',
      content: `Error handling delegator task: ${errorMessage}`,
      contentType: ContentType.ERROR,
    });
  }
}
