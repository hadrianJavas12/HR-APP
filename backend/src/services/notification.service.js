import { Notification } from '../models/Notification.js';
import { paginate } from '../utils/pagination.js';

/**
 * Create a notification for a user.
 * @param {Object} data
 * @param {string} data.tenantId
 * @param {string} data.userId
 * @param {string} data.type
 * @param {string} data.title
 * @param {string} [data.message]
 * @param {Object} [data.data]
 * @returns {Promise<Object>}
 */
export async function createNotification({ tenantId, userId, type, title, message, data }) {
  return Notification.query().insert({
    tenant_id: tenantId,
    user_id: userId,
    type,
    title,
    message: message || '',
    data: data || {},
  });
}

/**
 * Get notifications for a user.
 * @param {string} tenantId
 * @param {string} userId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export async function listNotifications(tenantId, userId, query) {
  const { page = 1, limit = 20, unreadOnly } = query;
  const offset = (page - 1) * limit;

  let qb = Notification.query()
    .where('tenant_id', tenantId)
    .where('user_id', userId);

  if (unreadOnly === 'true') {
    qb = qb.where('is_read', false);
  }

  const [data, totalResult] = await Promise.all([
    qb.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
    qb.clone().count('* as count').first(),
  ]);

  return paginate({ page, limit, total: parseInt(totalResult.count, 10), data });
}

/**
 * Mark notification as read.
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function markAsRead(id, userId) {
  return Notification.query()
    .where('user_id', userId)
    .findById(id)
    .patch({ is_read: true });
}

/**
 * Mark all notifications as read.
 * @param {string} tenantId
 * @param {string} userId
 */
export async function markAllAsRead(tenantId, userId) {
  return Notification.query()
    .where('tenant_id', tenantId)
    .where('user_id', userId)
    .where('is_read', false)
    .patch({ is_read: true });
}
