# CLAUDE.md - Builder.ai Coding Guidelines

## Build & Run Commands
- Backend: `cd backend && uvicorn app.app:app --reload`
- Frontend: `cd frontend && npm run dev`
- Backend lint: `cd backend && black . && isort . && mypy .`
- Frontend lint: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`
- Docker: `docker-compose up --build`

## Code Style Guidelines

### Python (Backend)
- Use Black (line-length: 88) for auto-formatting
- Use isort with Black profile for import organization
- Strict mypy type checking throughout codebase
- PascalCase for classes, snake_case for functions/variables
- Comprehensive docstrings for public APIs
- Favor Pydantic models for data validation

### TypeScript/React (Frontend)
- Use ESLint for code quality
- Functional components with hooks (no class components)
- PascalCase for components/interfaces, camelCase for functions/variables
- Strong typing with explicit interfaces for props/state
- styled-components for CSS-in-JS styling
- WebSocket for backend communication

### General Guidelines
- Error handling: specific exceptions with helpful messages
- Imports: stdlib → third-party → local modules
- Prefer async/await over callbacks
- Add comprehensive typing
- No console.log in production code