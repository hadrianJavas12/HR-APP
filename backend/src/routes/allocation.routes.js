import { Router } from 'express';
import * as allocCtrl from '../controllers/allocation.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import {
  createAllocationSchema,
  updateAllocationSchema,
  allocationQuerySchema,
} from '../validators/allocation.validator.js';

const router = Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/', validate(allocationQuerySchema, 'query'), allocCtrl.list);
router.get('/:id', allocCtrl.getById);
router.post('/', authorize('super_admin', 'hr_admin', 'project_manager'), validate(createAllocationSchema), allocCtrl.create);
router.put('/:id', authorize('super_admin', 'hr_admin', 'project_manager'), validate(updateAllocationSchema), allocCtrl.update);
router.delete('/:id', authorize('super_admin', 'hr_admin', 'project_manager'), allocCtrl.remove);

export default router;
