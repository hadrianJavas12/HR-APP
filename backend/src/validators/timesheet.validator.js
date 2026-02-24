import Joi from 'joi';

export const createTimesheetSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  project_id: Joi.string().uuid().required(),
  task_id: Joi.string().uuid().allow(null),
  date: Joi.date().iso().required(),
  hours: Joi.number().min(0.25).max(24).required(),
  mode: Joi.string().valid('normal', 'overtime', 'holiday').default('normal'),
  notes: Joi.string().allow(null, ''),
});

export const updateTimesheetSchema = Joi.object({
  project_id: Joi.string().uuid(),
  task_id: Joi.string().uuid().allow(null),
  date: Joi.date().iso(),
  hours: Joi.number().min(0.25).max(24),
  mode: Joi.string().valid('normal', 'overtime', 'holiday'),
  notes: Joi.string().allow(null, ''),
}).min(1);

export const approveTimesheetSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  rejection_reason: Joi.string().when('status', {
    is: 'rejected',
    then: Joi.required(),
    otherwise: Joi.allow(null, ''),
  }),
});

export const timesheetQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  employee_id: Joi.string().uuid().allow(''),
  project_id: Joi.string().uuid().allow(''),
  date_from: Joi.date().iso().allow(''),
  date_to: Joi.date().iso().allow(''),
  approval_status: Joi.string().valid('pending', 'approved', 'rejected').allow(''),
  mode: Joi.string().valid('normal', 'overtime', 'holiday').allow(''),
  sortBy: Joi.string().valid('date', 'hours', 'created_at').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const bulkTimesheetSchema = Joi.object({
  entries: Joi.array().items(
    Joi.object({
      employee_id: Joi.string().uuid().required(),
      project_id: Joi.string().uuid().required(),
      task_id: Joi.string().uuid().allow(null),
      date: Joi.date().iso().required(),
      hours: Joi.number().min(0.25).max(24).required(),
      mode: Joi.string().valid('normal', 'overtime', 'holiday').default('normal'),
      notes: Joi.string().allow(null, ''),
    })
  ).min(1).max(500).required(),
});
