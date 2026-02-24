import { Router } from 'express';
import * as dashCtrl from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';

const router = Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/company', dashCtrl.companyDashboard);
router.get('/utilization', dashCtrl.utilization);
router.get('/projects', dashCtrl.projectBurnRates);
router.get('/projects/:projectId', dashCtrl.projectDashboard);
router.get('/employees/:employeeId', dashCtrl.employeeDashboard);

export default router;
