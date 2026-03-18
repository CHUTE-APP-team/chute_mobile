import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createMatch, getMatches, joinMatch } from '../controllers/matchController';

const router = Router();

router.post('/', authMiddleware, createMatch);
router.get('/', authMiddleware, getMatches);
router.post('/:id/join', authMiddleware, joinMatch);

export default router;
