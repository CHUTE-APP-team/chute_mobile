import { Router } from 'express';
import { z } from 'zod';
import { register, login } from '../controllers/authController';
import { validate } from '../middlewares/validateMiddleware';

const router: Router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['player', 'host', 'referee', 'coach', 'scout', 'photographer']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
