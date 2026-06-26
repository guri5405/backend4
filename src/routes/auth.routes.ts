import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', rateLimiter, validate(registerSchema), authController.register);
router.post('/login', rateLimiter, validate(loginSchema), authController.login);

export default router;
