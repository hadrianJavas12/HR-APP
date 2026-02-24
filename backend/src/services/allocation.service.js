import { Allocation } from '../models/Allocation.js';
import { Employee } from '../models/Employee.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { paginate } from '../utils/pagination.js';
import config from '../config/index.js';

/**
 * List allocations with filters.
 * @param {string} tenantId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function listAllocations(tenantId, query) {
  const { page, limit, project_id, employee_id, period_start, period_end } = query;
  const offset = (page - 1) * limit;

  let qb = Allocation.query().where('allocations.tenant_id', tenantId);

  if (project_id) qb = qb.where('project_id', project_id);
  if (employee_id) qb = qb.where('employee_id', employee_id);
  if (period_start) qb = qb.where('period_end', '>=', period_start);
  if (period_end) qb = qb.where('period_start', '<=', period_end);

  const [data, totalResult] = await Promise.all([
    qb.clone()
      .withGraphFetched('[project, employee]')
      .orderBy('period_start', 'asc')
      .limit(limit)
      .offset(offset),
    qb.clone().count('* as count').first(),
  ]);

  return paginate({ page, limit, total: parseInt(totalResult.count, 10), data });
}

/**
 * Get allocation by ID.
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getAllocation(tenantId, id) {
  const alloc = await Allocation.query()
    .where('tenant_id', tenantId)
    .findById(id)
    .withGraphFetched('[project, employee]');

  if (!alloc) throw new NotFoundError('Allocation not found');
  return alloc;
}

/**
 * Create allocation with capacity check.
 * @param {string} tenantId
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<{ allocation: Object, warning: string|null }>}
 */
export async function createAllocation(tenantId, data, performedBy) {
  const employee = await Employee.query()
    .where('tenant_id', tenantId)
    .findById(data.employee_id);

  if (!employee) throw new NotFoundError('Employee not found');

  // Check for overallocation
  const warning = await checkCapacity(tenantId, data.employee_id, data.period_start, data.period_end, data.planned_hours);

  const allocation = await Allocation.query().insert({
    ...data,
    tenant_id: tenantId,
  });

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'allocation',
    entity_id: allocation.id,
    action: 'create',
    new_data: data,
    performed_by: performedBy,
  });

  return { allocation, warning };
}

/**
 * Update allocation.
 * @param {string} tenantId
 * @param {string} id
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function updateAllocation(tenantId, id, data, performedBy) {
  const alloc = await Allocation.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!alloc) throw new NotFoundError('Allocation not found');

  const updated = await Allocation.query().patchAndFetchById(id, data);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'allocation',
    entity_id: id,
    action: 'update',
    old_data: alloc,
    new_data: data,
    performed_by: performedBy,
  });

  return updated;
}

/**
 * Delete allocation.
 * @param {string} tenantId
 * @param {string} id
 * @param {string} performedBy
 */
export async function deleteAllocation(tenantId, id, performedBy) {
  const alloc = await Allocation.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!alloc) throw new NotFoundError('Allocation not found');

  await Allocation.query().deleteById(id);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'allocation',
    entity_id: id,
    action: 'delete',
    old_data: alloc,
    performed_by: performedBy,
  });
}

// ── Capacity Check ────────────────────────────

/**
 * Check if planned hours exceed employee capacity in the period.
 * @param {string} tenantId
 * @param {string} employeeId
 * @param {string} periodStart
 * @param {string} periodEnd
 * @param {number} newPlannedHours
 * @param {string} [excludeId]
 * @returns {Promise<string|null>} Warning message or null
 */
async function checkCapacity(tenantId, employeeId, periodStart, periodEnd, newPlannedHours, excludeId) {
  const employee = await Employee.query().findById(employeeId);
  if (!employee) return null;

  // Calculate total weeks in period
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const weeks = Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));
  const totalCapacity = weeks * employee.capacity_per_week;

  // Get existing allocations in overlapping period
  let qb = Allocation.query()
    .where('tenant_id', tenantId)
    .where('employee_id', employeeId)
    .where('period_end', '>=', periodStart)
    .where('period_start', '<=', periodEnd);

  if (excludeId) qb = qb.whereNot('id', excludeId);

  const result = await qb.sum('planned_hours as total').first();
  const existingHours = parseFloat(result.total || 0);
  const totalPlanned = existingHours + newPlannedHours;
  const utilizationPct = (totalPlanned / totalCapacity) * 100;

  if (utilizationPct > config.defaults.overloadThreshold) {
    return `Warning: Employee will be at ${Math.round(utilizationPct)}% utilization (${totalPlanned}h planned vs ${totalCapacity}h capacity)`;
  }

  return null;
}
