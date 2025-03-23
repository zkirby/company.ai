import { BaseAgent } from './BaseAgent.js';
import { ContentType } from '../constants.js';
import { logMessage } from '../utils/logger.js';
import { Agent } from '../models/index.js';
import { ProductManager } from './ProductManager.js';

// Cache for active agents
const agentCache = new Map<string, BaseAgent>();

/**
 * Get or create an agent based on type
 * @param agentType - Type of agent to get
 * @returns The agent instance
 */
export async function getAgent(id: string): Promise<BaseAgent> {
  // Check if agent exists in cache
  if (agentCache.has(id)) {
    const agent = agentCache.get(id);
    if (agent) {
      return agent;
    }
  }

  const params = await Agent.findOne({
    where: {
      id,
    },
  });
  if (!params) throw new Error("couldn't find agent for id");

  let agent!: BaseAgent;
  switch (params.agentType) {
    case ProductManager.Type:
      agent = new ProductManager(params);
      break;
  }

  // Add to cache
  agentCache.set(id, agent);

  return agent;
}

/**
 * Handle a conversation with an agent
 * @param agentType - Type of agent to converse with
 * @param source - Source of the conversation
 * @param message - The conversation message
 */
export async function handleConversation(id: string, prompt: string): Promise<void> {
  try {
    const agent = await getAgent(id);
    await agent.call([{ role: 'user', content: prompt }]);
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
  // try {
  //   const delegator = getAgent() as Delegator;
  //   await delegator.handleDelegatorTask(message);
  // } catch (error) {
  //   const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  //   logMessage({
  //     source: 'AGENT_MANAGER',
  //     content: `Error handling delegator task: ${errorMessage}`,
  //     contentType: ContentType.ERROR,
  //   });
  // }
}
