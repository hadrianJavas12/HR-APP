import Joi from 'joi';

export const createAllocationSchema = Joi.object({
  project_id: Joi.string().uuid().required(),
  employee_id: Joi.string().uuid().required(),
  period_start: Joi.date().iso().required(),
  period_end: Joi.date().iso().required(),
  planned_hours: Joi.number().min(0).required(),
  billable: Joi.boolean().default(true),
  justification: Joi.string().allow(null, ''),
});

export const updateAllocationSchema = Joi.object({
  period_start: Joi.date().iso(),
  period_end: Joi.date().iso(),
  planned_hours: Joi.number().min(0),
  billable: Joi.boolean(),
  justification: Joi.string().allow(null, ''),
}).min(1);

export const allocationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  project_id: Joi.string().uuid().allow(''),
  employee_id: Joi.string().uuid().allow(''),
  period_start: Joi.date().iso().allow(''),
  period_end: Joi.date().iso().allow(''),
});
