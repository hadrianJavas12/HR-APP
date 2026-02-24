import { Router } from 'express';
import * as projCtrl from '../controllers/project.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/', validate(projectQuerySchema, 'query'), projCtrl.list);
router.get('/:id', projCtrl.getById);
router.post('/', authorize('super_admin', 'hr_admin', 'project_manager'), validate(createProjectSchema), projCtrl.create);
router.put('/:id', authorize('super_admin', 'hr_admin', 'project_manager'), validate(updateProjectSchema), projCtrl.update);
router.delete('/:id', authorize('super_admin', 'hr_admin'), projCtrl.remove);

export default router;
