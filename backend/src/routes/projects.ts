import express, { Request, Response } from 'express';
import { Project, Agent } from '../models/index.js';
import { GLOBAL_STORE } from '../constants.js';

const router = express.Router();

/**
 * Create a new project
 * POST /projects
 */
router.post('/', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name } = req.body as { name?: string };

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await Project.create({ name });

    return res.status(201).json(project.toJSON());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating project:', errorMessage);
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * Get all projects
 * GET /projects
 */
router.get('/', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const projects = await Project.findAll();
    return res.json(projects.map((project) => project.toJSON()));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching projects:', errorMessage);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * Get active project with stats
 * GET /projects/active
 */
router.get('/active', async (_req: Request, res: Response): Promise<Response> => {
  try {
    // Get project
    const project = await Project.findByPk(GLOBAL_STORE.PROJECT_ID);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all agents for this project
    const agents = await Agent.findAll({
      where: { projectId: GLOBAL_STORE.PROJECT_ID },
    });

    // Calculate totals
    const totalInputTokens = agents.reduce((sum, agent) => sum + (agent.inputTokens ?? 0), 0);
    const totalOutputTokens = agents.reduce((sum, agent) => sum + (agent.outputTokens ?? 0), 0);
    const totalCost = agents.reduce((sum, agent) => sum + (agent.cost ?? 0), 0);

    // Add totals to project response
    const projectWithStats = {
      id: project.id,
      name: project.name,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      agents: agents.map((a) => ({
        id: a.id,
        cost: a.cost,
        model: a.model,
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        inputTokens: a.inputTokens,
        outputTokens: a.outputTokens,
      })),
    };

    return res.json(projectWithStats);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching active project:', errorMessage);
    return res.status(500).json({ error: 'Failed to fetch active project' });
  }
});

/**
 * Activate a project
 * POST /projects/:projectId/activate
 */
router.post('/:projectId/activate', async (req: Request, res: Response): Promise<Response> => {
  try {
    const projectId = parseInt(req.params['projectId'] ?? '0', 10);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Verify project exists
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Set global project ID
    GLOBAL_STORE.PROJECT_ID = projectId;

    return res.json({ message: `Activated project ${projectId}` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error activating project:', errorMessage);
    return res.status(500).json({ error: 'Failed to activate project' });
  }
});

export default router;
