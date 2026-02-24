import { getDb } from '../config/database.js';
import { Employee } from '../models/Employee.js';
import { Project } from '../models/Project.js';
import { Timesheet } from '../models/Timesheet.js';
import { Allocation } from '../models/Allocation.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * @typedef {Object} UtilizationKPI
 * @property {string} employeeId
 * @property {string} name
 * @property {number} actualHours
 * @property {number} capacityHours
 * @property {number} utilizationPct
 * @property {string} status - 'overloaded' | 'normal' | 'underutilized'
 */

/**
 * Get company-wide dashboard summary.
 * @param {string} tenantId
 * @param {string} [periodStart] - ISO date
 * @param {string} [periodEnd] - ISO date
 * @returns {Promise<Object>}
 */
export async function getCompanyDashboard(tenantId, periodStart, periodEnd) {
  const db = getDb();

  // Default: current month
  if (!periodStart) {
    const now = new Date();
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!periodEnd) {
    const now = new Date();
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  const [
    employeeCount,
    activeProjects,
    totalActualHours,
    pendingApprovals,
    utilization,
    projectSummary,
  ] = await Promise.all([
    Employee.query().where('tenant_id', tenantId).where('status', 'active').count('* as count').first(),
    Project.query().where('tenant_id', tenantId).where('status', 'active').count('* as count').first(),
    db('timesheets')
      .where('tenant_id', tenantId)
      .where('approval_status', 'approved')
      .whereBetween('date', [periodStart, periodEnd])
      .sum('hours as total')
      .first(),
    Timesheet.query().where('tenant_id', tenantId).where('approval_status', 'pending').count('* as count').first(),
    getEmployeeUtilization(tenantId, periodStart, periodEnd),
    getProjectBurnRates(tenantId),
  ]);

  const overloaded = utilization.filter((u) => u.status === 'overloaded');
  const underutilized = utilization.filter((u) => u.status === 'underutilized');

  return {
    period: { start: periodStart, end: periodEnd },
    summary: {
      totalEmployees: parseInt(employeeCount.count, 10),
      activeProjects: parseInt(activeProjects.count, 10),
      totalActualHours: parseFloat(totalActualHours.total || 0),
      pendingApprovals: parseInt(pendingApprovals.count, 10),
      avgUtilization: utilization.length > 0
        ? Math.round(utilization.reduce((sum, u) => sum + u.utilizationPct, 0) / utilization.length)
        : 0,
    },
    alerts: {
      overloadedEmployees: overloaded,
      underutilizedEmployees: underutilized,
    },
    projectBurnRates: projectSummary,
  };
}

/**
 * Calculate Utilization% per employee for the given period.
 * Formula: (ActualHours / CapacityHours) * 100
 *
 * @param {string} tenantId
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {Promise<UtilizationKPI[]>}
 */
export async function getEmployeeUtilization(tenantId, periodStart, periodEnd) {
  const db = getDb();

  // Calculate working days in period (simple: weekdays)
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) workingDays++;
    current.setDate(current.getDate() + 1);
  }

  const employees = await Employee.query()
    .where('tenant_id', tenantId)
    .where('status', 'active');

  const results = [];

  for (const emp of employees) {
    const hoursResult = await db('timesheets')
      .where('tenant_id', tenantId)
      .where('employee_id', emp.id)
      .where('approval_status', 'approved')
      .whereBetween('date', [periodStart, periodEnd])
      .sum('hours as total')
      .first();

    const actualHours = parseFloat(hoursResult.total || 0);
    const dailyCapacity = emp.capacity_per_week / 5;
    const capacityHours = workingDays * dailyCapacity;
    const utilizationPct = capacityHours > 0 ? Math.round((actualHours / capacityHours) * 100) : 0;

    let status = 'normal';
    if (utilizationPct > config.defaults.overloadThreshold) status = 'overloaded';
    else if (utilizationPct < config.defaults.underutilThreshold) status = 'underutilized';

    results.push({
      employeeId: emp.id,
      name: emp.name,
      department: emp.department,
      actualHours,
      capacityHours,
      utilizationPct,
      status,
    });
  }

  return results.sort((a, b) => b.utilizationPct - a.utilizationPct);
}

/**
 * Calculate project burn rates and cost variance.
 * BurnRate = ActualHoursToDate / PlannedHoursTotal
 * CostVariance = PlannedCost - ActualCost
 *
 * @param {string} tenantId
 * @returns {Promise<Array>}
 */
export async function getProjectBurnRates(tenantId) {
  const db = getDb();

  const projects = await Project.query()
    .where('tenant_id', tenantId)
    .whereIn('status', ['active', 'planning']);

  const results = [];

  for (const proj of projects) {
    const hoursResult = await db('timesheets')
      .where('tenant_id', tenantId)
      .where('project_id', proj.id)
      .where('approval_status', 'approved')
      .sum('hours as total')
      .first();

    const costResult = await db('timesheets as t')
      .join('employees as e', 'e.id', 't.employee_id')
      .where('t.tenant_id', tenantId)
      .where('t.project_id', proj.id)
      .where('t.approval_status', 'approved')
      .select(db.raw('COALESCE(SUM(t.hours * e.cost_per_hour), 0) as total_cost'))
      .first();

    const actualHours = parseFloat(hoursResult.total || 0);
    const actualCost = parseFloat(costResult.total_cost || 0);
    const plannedHours = parseFloat(proj.planned_hours || 0);
    const plannedCost = parseFloat(proj.planned_cost || 0);

    const burnRate = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : 0;
    const plannedVariance = plannedHours - actualHours;
    const costVariance = plannedCost - actualCost;

    results.push({
      projectId: proj.id,
      name: proj.name,
      code: proj.code,
      status: proj.status,
      plannedHours,
      actualHours,
      plannedVariance,
      burnRate,
      plannedCost,
      actualCost,
      costVariance,
    });
  }

  return results;
}

/**
 * Get project-specific dashboard.
 * @param {string} tenantId
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
export async function getProjectDashboard(tenantId, projectId) {
  const db = getDb();

  const project = await Project.query()
    .where('tenant_id', tenantId)
    .findById(projectId)
    .withGraphFetched('[manager, allocations.employee]');

  if (!project) throw new Error('Project not found');

  // Hours by employee
  const hoursByEmployee = await db('timesheets as t')
    .join('employees as e', 'e.id', 't.employee_id')
    .where('t.tenant_id', tenantId)
    .where('t.project_id', projectId)
    .where('t.approval_status', 'approved')
    .groupBy('e.id', 'e.name')
    .select(
      'e.id as employee_id',
      'e.name',
      db.raw('SUM(t.hours) as actual_hours'),
      db.raw('SUM(t.hours * e.cost_per_hour) as cost'),
    )
    .orderBy('actual_hours', 'desc');

  // Hours by week
  const hoursByWeek = await db('timesheets')
    .where('tenant_id', tenantId)
    .where('project_id', projectId)
    .where('approval_status', 'approved')
    .groupBy(db.raw("DATE_TRUNC('week', date)"))
    .select(
      db.raw("DATE_TRUNC('week', date) as week_start"),
      db.raw('SUM(hours) as total_hours'),
    )
    .orderBy('week_start', 'asc');

  // Planned vs actual per allocation
  const allocVsActual = [];
  for (const alloc of project.allocations || []) {
    const actual = await db('timesheets')
      .where('tenant_id', tenantId)
      .where('project_id', projectId)
      .where('employee_id', alloc.employee_id)
      .where('approval_status', 'approved')
      .whereBetween('date', [alloc.period_start, alloc.period_end])
      .sum('hours as total')
      .first();

    allocVsActual.push({
      employeeName: alloc.employee?.name,
      plannedHours: parseFloat(alloc.planned_hours),
      actualHours: parseFloat(actual.total || 0),
      variance: parseFloat(alloc.planned_hours) - parseFloat(actual.total || 0),
    });
  }

  return {
    project,
    hoursByEmployee,
    hoursByWeek,
    allocVsActual,
  };
}

/**
 * Get employee-specific dashboard.
 * @param {string} tenantId
 * @param {string} employeeId
 * @param {string} [periodStart]
 * @param {string} [periodEnd]
 * @returns {Promise<Object>}
 */
export async function getEmployeeDashboard(tenantId, employeeId, periodStart, periodEnd) {
  const db = getDb();

  if (!periodStart) {
    const now = new Date();
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!periodEnd) {
    const now = new Date();
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  const employee = await Employee.query()
    .where('tenant_id', tenantId)
    .findById(employeeId);

  if (!employee) throw new Error('Employee not found');

  // Hours by project
  const hoursByProject = await db('timesheets as t')
    .join('projects as p', 'p.id', 't.project_id')
    .where('t.tenant_id', tenantId)
    .where('t.employee_id', employeeId)
    .where('t.approval_status', 'approved')
    .whereBetween('t.date', [periodStart, periodEnd])
    .groupBy('p.id', 'p.name', 'p.code')
    .select(
      'p.id as project_id',
      'p.name',
      'p.code',
      db.raw('SUM(t.hours) as total_hours'),
    );

  // Daily hours trend
  const dailyTrend = await db('timesheets')
    .where('tenant_id', tenantId)
    .where('employee_id', employeeId)
    .where('approval_status', 'approved')
    .whereBetween('date', [periodStart, periodEnd])
    .groupBy('date')
    .select('date', db.raw('SUM(hours) as total'))
    .orderBy('date', 'asc');

  // Pending approvals count
  const pendingCount = await Timesheet.query()
    .where('tenant_id', tenantId)
    .where('employee_id', employeeId)
    .where('approval_status', 'pending')
    .count('* as count')
    .first();

  // Utilization
  const utilResult = await getEmployeeUtilization(tenantId, periodStart, periodEnd);
  const myUtil = utilResult.find((u) => u.employeeId === employeeId);

  return {
    employee,
    period: { start: periodStart, end: periodEnd },
    utilization: myUtil || { utilizationPct: 0, actualHours: 0, capacityHours: 0, status: 'underutilized' },
    hoursByProject,
    dailyTrend,
    pendingApprovals: parseInt(pendingCount.count, 10),
  };
}

/**
 * Refresh materialized views.
 * Should be called via a scheduled job (hourly or nightly).
 */
export async function refreshMaterializedViews() {
  const db = getDb();
  try {
    await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_utilization');
    await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_cost');
  } catch (err) {
    // Views may not exist yet if migrations haven't created them
    logger.warn({ err: err.message }, 'Could not refresh materialized views (may not exist yet)');
  }
}
