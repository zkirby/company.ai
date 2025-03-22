import { broadcastMessage } from '../websocket.js';
import { ContentType } from '../constants.js';

/**
 * Log message parameters
 */
export interface LogMessageParams {
  source: string;
  content: string;
  contentType?: ContentType;
}

/**
 * Log a message and broadcast it to WebSocket clients
 * @param params - Log parameters
 * @returns The formatted log entry
 */
export function logMessage(params: LogMessageParams): string {
  const { source, content, contentType = ContentType.MESSAGE } = params;

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
      console.log(
        `[${timestamp}] [${source}] ${contentType}: ${content.substring(0, 100)}${
          content.length > 100 ? '...' : ''
        }`
      );
  }

  // Broadcast to WebSocket clients
  void broadcastMessage(logEntry);

  return logEntry;
}
