import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMe } from '../controllers/usersController';

const router = Router();

router.get('/me', authMiddleware, getMe);

export default router;
