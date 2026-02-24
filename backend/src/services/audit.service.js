import { AuditLog } from '../models/AuditLog.js';
import { paginate } from '../utils/pagination.js';

/**
 * List audit logs with filters.
 * @param {string} tenantId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function listAuditLogs(tenantId, query) {
  const { page = 1, limit = 50, entity, action, performed_by, date_from, date_to } = query;
  const offset = (page - 1) * limit;

  let qb = AuditLog.query().where('tenant_id', tenantId);

  if (entity) qb = qb.where('entity', entity);
  if (action) qb = qb.where('action', action);
  if (performed_by) qb = qb.where('performed_by', performed_by);
  if (date_from) qb = qb.where('created_at', '>=', date_from);
  if (date_to) qb = qb.where('created_at', '<=', date_to);

  const [data, totalResult] = await Promise.all([
    qb.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
    qb.clone().count('* as count').first(),
  ]);

  return paginate({ page, limit, total: parseInt(totalResult.count, 10), data });
}
