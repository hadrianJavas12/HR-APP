import * as projectService from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/projects
 */
export const list = asyncHandler(async (req, res) => {
  const result = await projectService.listProjects(req.tenantId, req.query);
  res.json({ success: true, ...result });
});

/**
 * GET /api/v1/projects/:id
 */
export const getById = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.tenantId, req.params.id);
  res.json({ success: true, data: project });
});

/**
 * POST /api/v1/projects
 */
export const create = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.tenantId, req.body, req.user.userId);
  res.status(201).json({ success: true, data: project });
});

/**
 * PUT /api/v1/projects/:id
 */
export const update = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.tenantId, req.params.id, req.body, req.user.userId);
  res.json({ success: true, data: project });
});

/**
 * DELETE /api/v1/projects/:id
 */
export const remove = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.tenantId, req.params.id, req.user.userId);
  res.json({ success: true, message: 'Project cancelled' });
});
