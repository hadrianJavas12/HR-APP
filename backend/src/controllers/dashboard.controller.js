import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/dashboard/company
 */
export const companyDashboard = asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.query;
  const data = await dashboardService.getCompanyDashboard(req.tenantId, period_start, period_end);
  res.json({ success: true, data });
});

/**
 * GET /api/v1/dashboard/utilization
 */
export const utilization = asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.query;
  const now = new Date();
  const start = period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const data = await dashboardService.getEmployeeUtilization(req.tenantId, start, end);
  res.json({ success: true, data });
});

/**
 * GET /api/v1/dashboard/projects
 */
export const projectBurnRates = asyncHandler(async (req, res) => {
  const data = await dashboardService.getProjectBurnRates(req.tenantId);
  res.json({ success: true, data });
});

/**
 * GET /api/v1/dashboard/projects/:projectId
 */
export const projectDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getProjectDashboard(req.tenantId, req.params.projectId);
  res.json({ success: true, data });
});

/**
 * GET /api/v1/dashboard/employees/:employeeId
 */
export const employeeDashboard = asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.query;
  const data = await dashboardService.getEmployeeDashboard(
    req.tenantId, req.params.employeeId, period_start, period_end,
  );
  res.json({ success: true, data });
});
