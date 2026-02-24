import { Timesheet } from '../models/Timesheet.js';
import { Employee } from '../models/Employee.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { paginate } from '../utils/pagination.js';
import logger from '../utils/logger.js';

/**
 * List timesheets with filters.
 * @param {string} tenantId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function listTimesheets(tenantId, query) {
  const { page, limit, employee_id, project_id, date_from, date_to, approval_status, mode, sortBy, sortOrder } = query;
  const offset = (page - 1) * limit;

  let qb = Timesheet.query().where('timesheets.tenant_id', tenantId);

  if (employee_id) qb = qb.where('employee_id', employee_id);
  if (project_id) qb = qb.where('project_id', project_id);
  if (date_from) qb = qb.where('date', '>=', date_from);
  if (date_to) qb = qb.where('date', '<=', date_to);
  if (approval_status) qb = qb.where('approval_status', approval_status);
  if (mode) qb = qb.where('mode', mode);

  const [data, totalResult] = await Promise.all([
    qb.clone()
      .withGraphFetched('[employee, project, task]')
      .orderBy(sortBy || 'date', sortOrder || 'desc')
      .limit(limit)
      .offset(offset),
    qb.clone().count('* as count').first(),
  ]);

  return paginate({ page, limit, total: parseInt(totalResult.count, 10), data });
}

/**
 * Get timesheet by ID.
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getTimesheet(tenantId, id) {
  const ts = await Timesheet.query()
    .where('tenant_id', tenantId)
    .findById(id)
    .withGraphFetched('[employee, project, task]');

  if (!ts) throw new NotFoundError('Timesheet entry not found');
  return ts;
}

/**
 * Create a new timesheet entry.
 * Validates total hours for that day ≤ 24.
 * @param {string} tenantId
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function createTimesheet(tenantId, data, performedBy) {
  if (!data.employee_id) {
    throw new ValidationError('Employee ID is required. Please link your account to an employee record.');
  }

  // Validate daily total
  await validateDailyHours(tenantId, data.employee_id, data.date, data.hours);

  const timesheet = await Timesheet.query().insert({
    ...data,
    tenant_id: tenantId,
    approval_status: 'pending',
  });

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'timesheet',
    entity_id: timesheet.id,
    action: 'create',
    new_data: data,
    performed_by: performedBy,
  });

  logger.info({ timesheetId: timesheet.id, employeeId: data.employee_id }, 'Timesheet created');
  return timesheet;
}

/**
 * Bulk create timesheet entries.
 * @param {string} tenantId
 * @param {Array<Object>} entries
 * @param {string} performedBy
 * @returns {Promise<{ created: number, errors: Array }>}
 */
export async function bulkCreateTimesheets(tenantId, entries, performedBy) {
  const results = { created: 0, errors: [] };

  for (let i = 0; i < entries.length; i++) {
    try {
      await createTimesheet(tenantId, entries[i], performedBy);
      results.created++;
    } catch (err) {
      results.errors.push({ index: i, message: err.message, entry: entries[i] });
    }
  }

  return results;
}

/**
 * Update timesheet entry (only if still pending).
 * @param {string} tenantId
 * @param {string} id
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function updateTimesheet(tenantId, id, data, performedBy) {
  const ts = await Timesheet.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!ts) throw new NotFoundError('Timesheet entry not found');
  if (ts.approval_status !== 'pending') {
    throw new ForbiddenError('Cannot edit an already approved/rejected timesheet');
  }

  if (data.hours) {
    await validateDailyHours(tenantId, ts.employee_id, data.date || ts.date, data.hours, id);
  }

  const updated = await Timesheet.query().patchAndFetchById(id, data);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'timesheet',
    entity_id: id,
    action: 'update',
    old_data: ts,
    new_data: data,
    performed_by: performedBy,
  });

  return updated;
}

/**
 * Approve or reject timesheet entry.
 * @param {string} tenantId
 * @param {string} id
 * @param {'approved' | 'rejected'} status
 * @param {string} approvedBy - User ID of approver
 * @param {string} [rejectionReason]
 * @returns {Promise<Object>}
 */
export async function approveTimesheet(tenantId, id, status, approvedBy, rejectionReason) {
  const ts = await Timesheet.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!ts) throw new NotFoundError('Timesheet entry not found');
  if (ts.approval_status !== 'pending') {
    throw new ForbiddenError('Timesheet already processed');
  }

  const patchData = {
    approval_status: status,
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  };
  if (status === 'rejected' && rejectionReason) {
    patchData.rejection_reason = rejectionReason;
  }

  const updated = await Timesheet.query().patchAndFetchById(id, patchData);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'timesheet',
    entity_id: id,
    action: status === 'approved' ? 'approve' : 'reject',
    old_data: { approval_status: ts.approval_status },
    new_data: patchData,
    performed_by: approvedBy,
  });

  return updated;
}

/**
 * Delete timesheet entry (only pending).
 * @param {string} tenantId
 * @param {string} id
 * @param {string} performedBy
 */
export async function deleteTimesheet(tenantId, id, performedBy) {
  const ts = await Timesheet.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!ts) throw new NotFoundError('Timesheet entry not found');
  if (ts.approval_status !== 'pending') {
    throw new ForbiddenError('Cannot delete an already processed timesheet');
  }

  await Timesheet.query().deleteById(id);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'timesheet',
    entity_id: id,
    action: 'delete',
    old_data: ts,
    performed_by: performedBy,
  });
}

// ── Helpers ───────────────────────────────────

/**
 * Validate that total hours for an employee on a given date do not exceed 24.
 * @param {string} tenantId
 * @param {string} employeeId
 * @param {string} date
 * @param {number} newHours
 * @param {string} [excludeId] - Exclude this timesheet from total (for updates)
 */
async function validateDailyHours(tenantId, employeeId, date, newHours, excludeId) {
  let qb = Timesheet.query()
    .where('tenant_id', tenantId)
    .where('employee_id', employeeId)
    .where('date', date);

  if (excludeId) {
    qb = qb.whereNot('id', excludeId);
  }

  const result = await qb.sum('hours as total').first();
  const existingHours = parseFloat(result.total || 0);

  if (existingHours + newHours > 24) {
    throw new ValidationError(
      `Daily hours exceeded. Existing: ${existingHours}h, New: ${newHours}h, Max: 24h`
    );
  }
}
