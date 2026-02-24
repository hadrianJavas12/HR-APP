import { Router } from 'express';
import * as empCtrl from '../controllers/employee.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
} from '../validators/employee.validator.js';

const router = Router();

// All routes require auth + tenant
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', authorize('super_admin', 'hr_admin'), validate(employeeQuerySchema, 'query'), empCtrl.list);
router.get('/me', empCtrl.getMyEmployee);
router.get('/list-simple', authorize('super_admin', 'hr_admin', 'project_manager'), empCtrl.listSimple);
router.get('/unlinked-users', authorize('super_admin', 'hr_admin'), empCtrl.unlinkedUsers);
router.get('/all-users', empCtrl.allUsers);
router.get('/:id', authorize('super_admin', 'hr_admin'), empCtrl.getById);
router.post('/', authorize('super_admin', 'hr_admin'), validate(createEmployeeSchema), empCtrl.create);
router.put('/:id', authorize('super_admin', 'hr_admin'), validate(updateEmployeeSchema), empCtrl.update);
router.delete('/:id', authorize('super_admin', 'hr_admin'), empCtrl.remove);

export default router;
