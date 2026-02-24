import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  user_id: Joi.string().uuid().allow(null, ''),
  employee_code: Joi.string().max(50).allow(null, ''),
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required(),
  department: Joi.string().max(100).allow(null, ''),
  position: Joi.string().max(100).allow(null, ''),
  cost_per_hour: Joi.number().min(0).required(),
  capacity_per_week: Joi.number().integer().min(0).default(40),
  seniority_level: Joi.string().valid('junior', 'mid', 'senior', 'lead', 'principal').default('mid'),
  status: Joi.string().valid('active', 'inactive', 'on_leave').default('active'),
  joined_at: Joi.date().iso().allow(null),
});

export const updateEmployeeSchema = Joi.object({
  user_id: Joi.string().uuid().allow(null, ''),
  employee_code: Joi.string().max(50).allow(null, ''),
  name: Joi.string().min(1).max(255),
  email: Joi.string().email(),
  department: Joi.string().max(100).allow(null, ''),
  position: Joi.string().max(100).allow(null, ''),
  cost_per_hour: Joi.number().min(0),
  capacity_per_week: Joi.number().integer().min(0),
  seniority_level: Joi.string().valid('junior', 'mid', 'senior', 'lead', 'principal'),
  status: Joi.string().valid('active', 'inactive', 'on_leave'),
  joined_at: Joi.date().iso().allow(null),
}).min(1);

export const employeeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow(''),
  department: Joi.string().allow(''),
  status: Joi.string().valid('active', 'inactive', 'on_leave').allow(''),
  sortBy: Joi.string().valid('name', 'department', 'cost_per_hour', 'created_at').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});
