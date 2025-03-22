import { broadcastMessage } from '../websocket.js';
import { ContentType } from '../constants.js';

/**
 * Log a message and broadcast it to WebSocket clients
 * @param {Object} params - Log parameters
 * @param {string} params.source - Source of the log (agent ID or system)
 * @param {string} params.content - Content of the log message
 * @param {string} params.contentType - Type of content (MESSAGE, SYSTEM, ERROR, etc.)
 */
export function logMessage({ source, content, contentType = ContentType.MESSAGE }) {
  // Create log entry with timestamp
  const timestamp = new Date().toISOString();
  const logEntry = `${source}[$]${contentType}[$]${content}`;
  
  // Log to console based on content type
  switch (contentType) {
    case ContentType.ERROR:
      console.error(`[${timestamp}] [${source}] ${content}`);
      break;
    case ContentType.SYSTEM:
      console.info(`[${timestamp}] [${source}] ${content}`);
      break;
    default:
      console.log(`[${timestamp}] [${source}] ${contentType}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
  }
  
  // Broadcast to WebSocket clients
  broadcastMessage(logEntry);
  
  return logEntry;
}