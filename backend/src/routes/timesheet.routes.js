import { Router } from 'express';
import * as tsCtrl from '../controllers/timesheet.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import {
  createTimesheetSchema,
  updateTimesheetSchema,
  approveTimesheetSchema,
  timesheetQuerySchema,
  bulkTimesheetSchema,
} from '../validators/timesheet.validator.js';

const router = Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/', validate(timesheetQuerySchema, 'query'), tsCtrl.list);
router.get('/:id', tsCtrl.getById);
router.post('/', validate(createTimesheetSchema), tsCtrl.create);
router.post('/bulk', authorize('super_admin', 'hr_admin', 'project_manager'), validate(bulkTimesheetSchema), tsCtrl.bulkCreate);
router.put('/:id', tsCtrl.update);
router.put('/:id/approve', authorize('super_admin', 'hr_admin', 'project_manager'), validate(approveTimesheetSchema), tsCtrl.approve);
router.delete('/:id', tsCtrl.remove);

export default router;
