import { Employee } from '../models/Employee.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { paginate } from '../utils/pagination.js';

/**
 * List employees with filters, search, and pagination.
 * @param {string} tenantId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function listEmployees(tenantId, query) {
  const { page, limit, search, department, status, sortBy, sortOrder } = query;
  const offset = (page - 1) * limit;

  let qb = Employee.query().where('tenant_id', tenantId);

  if (search) {
    qb = qb.where((builder) => {
      builder
        .where('name', 'ilike', `%${search}%`)
        .orWhere('email', 'ilike', `%${search}%`)
        .orWhere('employee_code', 'ilike', `%${search}%`);
    });
  }
  if (department) qb = qb.where('department', department);
  if (status) qb = qb.where('status', status);

  const [data, totalResult] = await Promise.all([
    qb.clone().orderBy(sortBy || 'name', sortOrder || 'asc').limit(limit).offset(offset),
    qb.clone().count('* as count').first(),
  ]);

  return paginate({ page, limit, total: parseInt(totalResult.count, 10), data });
}

/**
 * Get employee by ID.
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getEmployee(tenantId, id) {
  const employee = await Employee.query()
    .where('tenant_id', tenantId)
    .findById(id)
    .withGraphFetched('[allocations, timesheets]');

  if (!employee) throw new NotFoundError('Employee not found');
  return employee;
}

/**
 * Create a new employee.
 * @param {string} tenantId
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function createEmployee(tenantId, data, performedBy) {
  // Check for duplicate email within tenant
  const existing = await Employee.query()
    .where('tenant_id', tenantId)
    .where('email', data.email)
    .first();

  if (existing) throw new ConflictError('Employee with this email already exists');

  const employee = await Employee.query().insert({
    ...data,
    tenant_id: tenantId,
  });

  // Audit
  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'employee',
    entity_id: employee.id,
    action: 'create',
    new_data: data,
    performed_by: performedBy,
  });

  return employee;
}

/**
 * Update employee.
 * @param {string} tenantId
 * @param {string} id
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function updateEmployee(tenantId, id, data, performedBy) {
  const employee = await Employee.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!employee) throw new NotFoundError('Employee not found');

  // Check email uniqueness if changed
  if (data.email && data.email !== employee.email) {
    const existing = await Employee.query()
      .where('tenant_id', tenantId)
      .where('email', data.email)
      .whereNot('id', id)
      .first();
    if (existing) throw new ConflictError('Email already in use by another employee');
  }

  const updated = await Employee.query()
    .patchAndFetchById(id, data);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'employee',
    entity_id: id,
    action: 'update',
    old_data: employee,
    new_data: data,
    performed_by: performedBy,
  });

  return updated;
}

/**
 * Delete (soft deactivate) employee.
 * @param {string} tenantId
 * @param {string} id
 * @param {string} performedBy
 */
export async function deleteEmployee(tenantId, id, performedBy) {
  const employee = await Employee.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!employee) throw new NotFoundError('Employee not found');

  await Employee.query().patchAndFetchById(id, { status: 'inactive' });

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'employee',
    entity_id: id,
    action: 'delete',
    old_data: employee,
    performed_by: performedBy,
  });
}
