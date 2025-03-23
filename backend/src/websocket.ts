import { Express } from 'express';
import expressWs, { WebsocketRequestHandler } from 'express-ws';
import { UserTopics, ContentType } from './constants.js';
import { handleDelegatorTask, handleConversation } from './agents/index.js';
import { logMessage } from './utils/logger.js';

// Store for connected clients
type WebSocket = Parameters<WebsocketRequestHandler>[0];
const clients: Set<WebSocket> = new Set();

/**
 * Set up WebSocket handler for Express application
 * @param app - Express application
 */
export function setupWebSocketHandler(app: expressWs.Application): void {
  app.ws('/ws', async (ws: WebSocket, req) => {
    // Add client to the pool
    clients.add(ws);
    logMessage({
      source: 'RUNTIME',
      content: 'Connected, welcome!',
      contentType: ContentType.SYSTEM,
    });

    ws.on('message', async (message: string) => {
      try {
        const { topic, id, content } = getMessageParts(message);

        switch (topic) {
          case UserTopics.CONVERSATION:
            await handleConversation(id, content);
          case UserTopics.TASK:
            await handleDelegatorTask(content);
          default:
            throw new Error('unknown topic: ' + topic);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logMessage({
          source: 'RUNTIME',
          content: `Error processing message: ${errorMessage}`,
          contentType: ContentType.ERROR,
        });
      }
    });

    ws.on('close', () => {
      // Remove client from the pool
      clients.delete(ws);
      logMessage({
        source: 'RUNTIME',
        content: 'Disconnected, bye!',
        contentType: ContentType.SYSTEM,
      });
    });
  });
}

/**
 * Broadcast a message to all connected WebSocket clients
 * @param message - Message to broadcast
 */
export async function broadcastMessage(message: string | object): Promise<void> {
  const messageText = typeof message === 'string' ? message : JSON.stringify(message);

  for (const client of clients) {
    try {
      client.send(messageText);
    } catch (error) {
      // If sending fails, the client is likely disconnected
      clients.delete(client);
    }
  }
}

const getMessageParts = (message: string) => {
  // Parse incoming message using format: topic[$]id[$]message
  const parts = message.split('[$]');
  if (parts.length !== 3) {
    throw new Error('Invalid message format');
  }

  const [topic, id, content] = parts;
  if (!id || !topic || !content) throw new Error(`missing part: ${{ topic, id, content }}`);
  return { topic: topic as UserTopics, id, content };
};
