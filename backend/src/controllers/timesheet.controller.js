import * as timesheetService from '../services/timesheet.service.js';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/timesheets
 */
export const list = asyncHandler(async (req, res) => {
  const result = await timesheetService.listTimesheets(req.tenantId, req.query, req.user);
  res.json({ success: true, ...result });
});

/**
 * GET /api/v1/timesheets/:id
 */
export const getById = asyncHandler(async (req, res) => {
  const ts = await timesheetService.getTimesheet(req.tenantId, req.params.id);
  res.json({ success: true, data: ts });
});

/**
 * POST /api/v1/timesheets
 * Auto-resolves employee_id from the authenticated user if not provided.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.employee_id) {
    const emp = await Employee.query()
      .where('tenant_id', req.tenantId)
      .where('user_id', req.user.userId)
      .first();
    if (emp) {
      req.body.employee_id = emp.id;
    }
  }
  const ts = await timesheetService.createTimesheet(req.tenantId, req.body, req.user.userId);
  res.status(201).json({ success: true, data: ts });
});

/**
 * POST /api/v1/timesheets/bulk
 */
export const bulkCreate = asyncHandler(async (req, res) => {
  const result = await timesheetService.bulkCreateTimesheets(req.tenantId, req.body.entries, req.user.userId);
  res.status(201).json({ success: true, data: result });
});

/**
 * PUT /api/v1/timesheets/:id
 */
export const update = asyncHandler(async (req, res) => {
  const ts = await timesheetService.updateTimesheet(req.tenantId, req.params.id, req.body, req.user.userId);
  res.json({ success: true, data: ts });
});

/**
 * PUT /api/v1/timesheets/:id/approve
 */
export const approve = asyncHandler(async (req, res) => {
  const { status, rejection_reason } = req.body;
  const ts = await timesheetService.approveTimesheet(
    req.tenantId,
    req.params.id,
    status,
    req.user.userId,
    rejection_reason,
    req.user.role,
  );
  res.json({ success: true, data: ts });
});

/**
 * DELETE /api/v1/timesheets/:id
 */
export const remove = asyncHandler(async (req, res) => {
  await timesheetService.deleteTimesheet(req.tenantId, req.params.id, req.user.userId);
  res.json({ success: true, message: 'Timesheet deleted' });
});
