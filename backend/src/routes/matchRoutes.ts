import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createMatch, getMatches, getMatch, joinMatch, generateMatchTeams, getMatchTeams, ratePlayer, finishMatch } from '../controllers/matchController';

const router = Router();

router.post('/',                     authMiddleware, createMatch);
router.get('/',                      authMiddleware, getMatches);
router.get('/:id',                   authMiddleware, getMatch);    // OData-like: $expand, $select
router.post('/:id/join',             authMiddleware, joinMatch);
router.post('/:id/generate-teams',   authMiddleware, generateMatchTeams);
router.get('/:id/teams',             authMiddleware, getMatchTeams);
router.post('/:id/rate',             authMiddleware, ratePlayer);
router.patch('/:id/finish',          authMiddleware, finishMatch);

export default router;
