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
      content: 'Client connected',
      contentType: ContentType.SYSTEM,
    });

    ws.on('message', async (message: string) => {
      try {
        // Handle incoming message from client
        logMessage({
          source: 'RUNTIME',
          content: 'start',
          contentType: ContentType.SYSTEM,
        });

        // Parse incoming message using format: topic[$]id[$]message
        const parts = message.split('[$]');
        if (parts.length !== 3) {
          throw new Error('Invalid message format');
        }

        const [topic, id, content] = parts;
        if (!id) throw new Error('no id');

        if (topic === UserTopics.CONVERSATION) {
          // Handle conversation with an agent
          const idParts = id.split('/');
          if (idParts.length !== 2) {
            throw new Error('Invalid conversation ID format');
          }

          const [agent, source] = idParts;
          if (!agent || !source || !content) throw new Error('invalid message');
          await handleConversation(agent, source, content);
        } else if (topic === UserTopics.TASK) {
          // Handle a delegator task
          if (!content) throw new Error('invalid message');
          await handleDelegatorTask(content);
        } else {
          logMessage({
            source: 'RUNTIME',
            content: `Unknown topic: ${topic}`,
            contentType: ContentType.ERROR,
          });
        }

        logMessage({
          source: 'RUNTIME',
          content: 'end',
          contentType: ContentType.SYSTEM,
        });
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
        content: 'Client disconnected',
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
