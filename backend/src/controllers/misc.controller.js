import * as auditService from '../services/audit.service.js';
import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/audit-logs
 */
export const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.listAuditLogs(req.tenantId, req.query);
  res.json({ success: true, ...result });
});

/**
 * GET /api/v1/notifications
 */
export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.tenantId, req.user.userId, req.query);
  res.json({ success: true, ...result });
});

/**
 * PUT /api/v1/notifications/:id/read
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.userId);
  res.json({ success: true, message: 'Notification marked as read' });
});

/**
 * PUT /api/v1/notifications/read-all
 */
export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.tenantId, req.user.userId);
  res.json({ success: true, message: 'All notifications marked as read' });
});
