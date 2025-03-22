import { MessageTypes, UserTopics } from './constants.js';
import { handleDelegatorTask, handleConversation } from './agents/index.js';
import { logMessage } from './utils/logger.js';

const clients = new Set();

export function setupWebSocketHandler(app) {
  app.ws('/ws', async (ws, req) => {
    // Add client to the pool
    clients.add(ws);
    logMessage({ source: 'RUNTIME', content: 'Client connected', contentType: 'SYSTEM' });

    ws.on('message', async (message) => {
      try {
        // Handle incoming message from client
        logMessage({ source: 'RUNTIME', content: 'start', contentType: 'SYSTEM' });
        
        // Parse incoming message using format: topic[$]id[$]message
        const [topic, id, content] = message.split('[$]');
        
        if (topic === UserTopics.CONVERSATION) {
          // Handle conversation with an agent
          const [agent, source] = id.split('/');
          await handleConversation(agent, source, content);
        } else if (topic === UserTopics.TASK) {
          // Handle a delegator task
          await handleDelegatorTask(content);
        } else {
          logMessage({ 
            source: 'RUNTIME', 
            content: `Unknown topic: ${topic}`, 
            contentType: 'ERROR' 
          });
        }
        
        logMessage({ source: 'RUNTIME', content: 'end', contentType: 'SYSTEM' });
      } catch (error) {
        logMessage({ 
          source: 'RUNTIME', 
          content: `Error processing message: ${error.message}`, 
          contentType: 'ERROR' 
        });
      }
    });

    ws.on('close', () => {
      // Remove client from the pool
      clients.delete(ws);
      logMessage({ source: 'RUNTIME', content: 'Client disconnected', contentType: 'SYSTEM' });
    });
  });
}

// Broadcast log messages to all connected clients
export async function broadcastMessage(message) {
  const messageText = typeof message === 'string' 
    ? message 
    : JSON.stringify(message);
    
  for (const client of clients) {
    try {
      client.send(messageText);
    } catch (error) {
      // If sending fails, the client is likely disconnected
      clients.delete(client);
    }
  }
}