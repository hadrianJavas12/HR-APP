import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginSchema, registerSchema, refreshTokenSchema, changePasswordSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validate(loginSchema), authCtrl.login);
router.post('/register', validate(registerSchema), authCtrl.register);
router.post('/refresh', validate(refreshTokenSchema), authCtrl.refresh);
router.post('/logout', authenticate, authCtrl.logout);
router.get('/me', authenticate, authCtrl.me);
router.put('/change-password', authenticate, validate(changePasswordSchema), authCtrl.changePassword);

export default router;
