import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMe, getUsers, getLeaderboard, getPlayerStats, getRanking } from '../controllers/usersController';

const router = Router();

router.get('/me',           authMiddleware, getMe);
router.get('/leaderboard',  authMiddleware, getLeaderboard);
router.get('/ranking',      authMiddleware, getRanking);
router.get('/:id/stats',    authMiddleware, getPlayerStats);
router.get('/',             authMiddleware, getUsers);  // OData-like: $select, $filter, $top, $skip

export default router;
