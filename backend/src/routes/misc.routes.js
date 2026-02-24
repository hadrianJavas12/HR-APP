import { Router } from 'express';
import * as miscCtrl from '../controllers/misc.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';

const router = Router();

router.use(authenticate, resolveTenant, requireTenant);

// Audit logs (admin only)
router.get('/audit-logs', authorize('super_admin', 'hr_admin'), miscCtrl.listAuditLogs);

// Notifications
router.get('/notifications', miscCtrl.listNotifications);
router.put('/notifications/:id/read', miscCtrl.markNotificationRead);
router.put('/notifications/read-all', miscCtrl.markAllRead);

export default router;
