import express from 'express';
import { Project, Agent } from '../models/index.js';
import { GLOBAL_STORE } from '../constants.js';
import { sequelize } from '../db/index.js';

const router = express.Router();

/**
 * Create a new project
 * POST /projects
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const project = await Project.create({ name });
    
    return res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * Get all projects
 * GET /projects
 */
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll();
    return res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * Get active project with stats
 * GET /projects/active
 */
router.get('/active', async (req, res) => {
  try {
    // Get project
    const project = await Project.findByPk(GLOBAL_STORE.PROJECT_ID);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get all agents for this project
    const agents = await Agent.findAll({
      where: { projectId: GLOBAL_STORE.PROJECT_ID }
    });
    
    // Calculate totals
    const totalInputTokens = agents.reduce((sum, agent) => sum + agent.inputTokens, 0);
    const totalOutputTokens = agents.reduce((sum, agent) => sum + agent.outputTokens, 0);
    const totalCost = agents.reduce((sum, agent) => sum + agent.cost, 0);
    
    // Add totals to project response
    const projectWithStats = {
      id: project.id,
      name: project.name,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost
    };
    
    return res.json(projectWithStats);
  } catch (error) {
    console.error('Error fetching active project:', error);
    return res.status(500).json({ error: 'Failed to fetch active project' });
  }
});

/**
 * Activate a project
 * POST /projects/:projectId/activate
 */
router.post('/:projectId/activate', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    
    // Verify project exists
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Set global project ID
    GLOBAL_STORE.PROJECT_ID = projectId;
    
    return res.json({ message: `Activated project ${projectId}` });
  } catch (error) {
    console.error('Error activating project:', error);
    return res.status(500).json({ error: 'Failed to activate project' });
  }
});

export default router;