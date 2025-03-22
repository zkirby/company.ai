import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupWebSocketHandler } from './websocket.js';
import projectRoutes from './routes/projects.js';
import agentRoutes from './routes/agents.js';
import modelRoutes from './routes/models.js';
import { initDB } from './db/index.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.development') });

// Initialize Express with WebSocket support
const app: express.Application = express();
expressWs(app);

// Middleware
app.use(cors());
app.use(express.json());

// Setup WebSocket handler
setupWebSocketHandler(app as expressWs.Application);

// Routes
app.use('/projects', projectRoutes);
app.use('/agents', agentRoutes);
app.use('/models', modelRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize database
void initDB()
  .then(() => {
    // Start server
    const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 8000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to initialize database:', errorMessage);
    process.exit(1);
  });

export default app;
