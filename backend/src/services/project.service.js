import { Project } from '../models/Project.js';
import { Employee } from '../models/Employee.js';
import { Allocation } from '../models/Allocation.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { paginate } from '../utils/pagination.js';

/**
 * List projects with filters and pagination.
 * For employee role, only show projects assigned via allocations.
 * @param {string} tenantId
 * @param {Object} query
 * @param {Object} [user] - { userId, role }
 * @returns {Promise<Object>}
 */
export async function listProjects(tenantId, query, user) {
  const { page, limit, search, status, priority, sortBy, sortOrder } = query;
  const offset = (page - 1) * limit;

  let qb = Project.query().where('projects.tenant_id', tenantId);

  // If user is a regular employee, only show assigned projects
  if (user && user.role === 'employee') {
    const employee = await Employee.query()
      .where('tenant_id', tenantId)
      .where('user_id', user.userId)
      .first();
    if (employee) {
      const assignedProjectIds = await Allocation.query()
        .where('tenant_id', tenantId)
        .where('employee_id', employee.id)
        .distinct('project_id')
        .select('project_id');
      const ids = assignedProjectIds.map(a => a.project_id);
      if (ids.length === 0) {
        return paginate({ page, limit, total: 0, data: [] });
      }
      qb = qb.whereIn('projects.id', ids);
    } else {
      // Employee record not linked — return empty
      return paginate({ page, limit, total: 0, data: [] });
    }
  } else if (user && user.role === 'project_manager') {
    // PM sees allocated projects + projects they manage
    const employee = await Employee.query()
      .where('tenant_id', tenantId)
      .where('user_id', user.userId)
      .first();
    if (employee) {
      const assignedProjectIds = await Allocation.query()
        .where('tenant_id', tenantId)
        .where('employee_id', employee.id)
        .distinct('project_id')
        .select('project_id');
      const allocIds = assignedProjectIds.map(a => a.project_id);
      qb = qb.where(builder => {
        builder.where('projects.project_manager_id', employee.id);
        if (allocIds.length > 0) {
          builder.orWhereIn('projects.id', allocIds);
        }
      });
    }
  }

  if (search) {
    qb = qb.where((builder) => {
      builder
        .where('name', 'ilike', `%${search}%`)
        .orWhere('code', 'ilike', `%${search}%`)
        .orWhere('client', 'ilike', `%${search}%`);
    });
  }
  if (status) qb = qb.where('status', status);
  if (priority) qb = qb.where('priority', priority);

  const [data, totalResult] = await Promise.all([
    qb.clone()
      .withGraphFetched('manager')
      .orderBy(sortBy || 'created_at', sortOrder || 'desc')
      .limit(limit)
      .offset(offset),
    qb.clone().count('* as count').first(),
  ]);

  return paginate({ page, limit, total: parseInt(totalResult.count, 10), data });
}

/**
 * Get project by ID with related data.
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getProject(tenantId, id) {
  const project = await Project.query()
    .where('tenant_id', tenantId)
    .findById(id)
    .withGraphFetched('[manager, allocations.employee, tasks]');

  if (!project) throw new NotFoundError('Project not found');
  return project;
}

/**
 * Create a project.
 * @param {string} tenantId
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function createProject(tenantId, data, performedBy) {
  if (data.code) {
    const existing = await Project.query()
      .where('tenant_id', tenantId)
      .where('code', data.code)
      .first();
    if (existing) throw new ConflictError('Project code already exists');
  }

  // Normalize empty string dates to null
  if (data.start_date === '') data.start_date = null;
  if (data.end_date === '') data.end_date = null;

  const project = await Project.query().insert({
    ...data,
    tenant_id: tenantId,
  });

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'project',
    entity_id: project.id,
    action: 'create',
    new_data: data,
    performed_by: performedBy,
  });

  return project;
}

/**
 * Update project.
 * @param {string} tenantId
 * @param {string} id
 * @param {Object} data
 * @param {string} performedBy
 * @returns {Promise<Object>}
 */
export async function updateProject(tenantId, id, data, performedBy) {
  const project = await Project.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!project) throw new NotFoundError('Project not found');

  // Normalize empty string dates to null
  if (data.start_date === '') data.start_date = null;
  if (data.end_date === '') data.end_date = null;

  const updated = await Project.query().patchAndFetchById(id, data);

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'project',
    entity_id: id,
    action: 'update',
    old_data: project,
    new_data: data,
    performed_by: performedBy,
  });

  return updated;
}

/**
 * Delete project (soft — set to cancelled).
 * @param {string} tenantId
 * @param {string} id
 * @param {string} performedBy
 */
export async function deleteProject(tenantId, id, performedBy) {
  const project = await Project.query()
    .where('tenant_id', tenantId)
    .findById(id);

  if (!project) throw new NotFoundError('Project not found');

  await Project.query().patchAndFetchById(id, { status: 'cancelled' });

  await AuditLog.query().insert({
    tenant_id: tenantId,
    entity: 'project',
    entity_id: id,
    action: 'delete',
    old_data: project,
    performed_by: performedBy,
  });
}
