# Builder.ai Backend (Node.js)

This is the Node.js backend for Builder.ai, using Vercel's AI SDK for LLM integration.

## Features

- WebSocket-based real-time communication
- Support for multiple AI models (OpenAI, Anthropic)
- Task delegation system with multiple agent types
- Project and agent management
- Token usage and cost tracking

## Prerequisites

- Node.js v18+ 
- PostgreSQL database
- API keys for OpenAI and Anthropic (optional)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables by creating a `.env.development` file:

```
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/builder_ai

# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Default Model
DEFAULT_MODEL=gpt-4o-mini
```

3. Start the server:

```bash
npm run dev
```

## Docker Setup

You can also use Docker Compose to run the backend:

```bash
docker-compose up --build
```

## API Endpoints

### Projects

- `GET /projects` - List all projects
- `POST /projects` - Create a new project
- `GET /projects/active` - Get the active project with stats
- `POST /projects/:projectId/activate` - Set the active project

### Agents

- `GET /agents/:id` - Get agent information
- `PUT /agents/:id/model` - Update an agent's model

### Models

- `GET /models` - List all supported models with pricing information

## WebSocket API

Connect to `ws://localhost:8000/ws` with the following message format:

- Task: `task[$]id[$]message`
- Conversation: `conversation[$]agent/source[$]message`

## Architecture

- `src/agents/` - Agent implementations
- `src/db/` - Database connection and management
- `src/models/` - Sequelize models
- `src/routes/` - API routes
- `src/utils/` - Utility functions
- `src/index.js` - Main application entry point
- `src/websocket.js` - WebSocket handler