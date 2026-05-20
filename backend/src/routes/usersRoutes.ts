import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMe, updateMe, deleteMe, getUsers, getLeaderboard, getPlayerStats, getRanking } from '../controllers/usersController';

const router = Router();

router.get('/me',           authMiddleware, getMe);
router.put('/me',           authMiddleware, updateMe);
router.delete('/me',        authMiddleware, deleteMe);
router.get('/leaderboard',  authMiddleware, getLeaderboard);
router.get('/ranking',      authMiddleware, getRanking);
router.get('/:id/stats',    authMiddleware, getPlayerStats);
router.get('/',             authMiddleware, getUsers);  // OData-like: $select, $filter, $top, $skip

export default router;
