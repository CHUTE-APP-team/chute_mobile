import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMe, getUsers, getLeaderboard } from '../controllers/usersController';

const router = Router();

router.get('/me',           authMiddleware, getMe);
router.get('/leaderboard',  authMiddleware, getLeaderboard);
router.get('/',             authMiddleware, getUsers);  // OData-like: $select, $filter, $top, $skip

export default router;
