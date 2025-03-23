// Agent types
export enum AgentTypes {
  DELEGATOR = 'delegator',
  BUILDER = 'builder',
}

// Message types for content
export enum ContentType {
  MESSAGE = 'MESSAGE',
  MESSAGE_STREAM = 'MESSAGE_STREAM',
  SYSTEM = 'SYSTEM',
  ERROR = 'ERROR',
  INFO = 'INFO',
}

// Topic types for user messages
export enum UserTopics {
  CONVERSATION = 'conversation',
  TASK = 'task',
}

// Global store variables
export const GLOBAL_STORE = {
  PROJECT_ID: 1, // Default project ID
};

// Message types for agent communication
export enum MessageTypes {
  TASK = 'task',
  CONVERSATION = 'conversation',
}
