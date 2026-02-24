import * as employeeService from '../services/employee.service.js';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/employees
 */
export const list = asyncHandler(async (req, res) => {
  const result = await employeeService.listEmployees(req.tenantId, req.query);
  res.json({ success: true, ...result });
});

/**
 * GET /api/v1/employees/me — returns employee linked to current user
 */
export const getMyEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.query()
    .where('tenant_id', req.tenantId)
    .where('user_id', req.user.userId)
    .first();
  res.json({ success: true, data: employee || null });
});

/**
 * GET /api/v1/employees/list-simple — lightweight list (id, name, position, department) for dropdowns.
 * Accessible by admin/HR/PM.
 */
export const listSimple = asyncHandler(async (req, res) => {
  const employees = await Employee.query()
    .where('tenant_id', req.tenantId)
    .where('status', 'active')
    .select('id', 'name', 'position', 'department')
    .orderBy('name', 'asc')
    .limit(200);
  res.json({ success: true, data: employees });
});

/**
 * GET /api/v1/employees/:id
 */
export const getById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployee(req.tenantId, req.params.id);
  res.json({ success: true, data: employee });
});

/**
 * POST /api/v1/employees
 */
export const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.tenantId, req.body, req.user.userId);
  res.status(201).json({ success: true, data: employee });
});

/**
 * PUT /api/v1/employees/:id
 */
export const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.tenantId, req.params.id, req.body, req.user.userId);
  res.json({ success: true, data: employee });
});

/**
 * DELETE /api/v1/employees/:id
 */
export const remove = asyncHandler(async (req, res) => {
  await employeeService.deleteEmployee(req.tenantId, req.params.id, req.user.userId);
  res.json({ success: true, message: 'Employee deactivated' });
});

/**
 * GET /api/v1/employees/unlinked-users
 */
export const unlinkedUsers = asyncHandler(async (req, res) => {
  const users = await employeeService.listUnlinkedUsers(req.tenantId);
  res.json({ success: true, data: users });
});

/**
 * GET /api/v1/employees/all-users
 */
export const allUsers = asyncHandler(async (req, res) => {
  const users = await employeeService.listAllUsers(req.tenantId);
  res.json({ success: true, data: users });
});
