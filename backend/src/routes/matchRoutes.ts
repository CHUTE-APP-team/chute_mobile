import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createMatch, getMatches, getMatch, joinMatch, generateMatchTeams } from '../controllers/matchController';

const router = Router();

router.post('/',          authMiddleware, createMatch);
router.get('/',           authMiddleware, getMatches);
router.get('/:id',        authMiddleware, getMatch);    // OData-like: $expand, $select
router.post('/:id/join',           authMiddleware, joinMatch);
router.post('/:id/generate-teams', authMiddleware, generateMatchTeams);

export default router;
