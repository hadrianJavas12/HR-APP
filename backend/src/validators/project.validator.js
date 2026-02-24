import Joi from 'joi';

export const createProjectSchema = Joi.object({
  code: Joi.string().max(50).allow(null, ''),
  name: Joi.string().min(1).max(255).required(),
  client: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  planned_hours: Joi.number().min(0).default(0),
  planned_cost: Joi.number().min(0).default(0),
  project_manager_id: Joi.string().uuid().allow(null),
  start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  status: Joi.string().valid('planning', 'active', 'on_hold', 'completed', 'cancelled').default('planning'),
});

export const updateProjectSchema = Joi.object({
  code: Joi.string().max(50).allow(null, ''),
  name: Joi.string().min(1).max(255),
  client: Joi.string().max(255).allow(null, ''),
  description: Joi.string().allow(null, ''),
  planned_hours: Joi.number().min(0),
  planned_cost: Joi.number().min(0),
  project_manager_id: Joi.string().uuid().allow(null),
  start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().valid('planning', 'active', 'on_hold', 'completed', 'cancelled'),
}).min(1);

export const projectQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow(''),
  status: Joi.string().valid('planning', 'active', 'on_hold', 'completed', 'cancelled').allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').allow(''),
  sortBy: Joi.string().valid('name', 'start_date', 'end_date', 'planned_hours', 'created_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
