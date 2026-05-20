import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  createMatch, getMatches, getMatch,
  joinMatch, leaveMatch, inviteToMatch, getMyInvites,
  drawTeams, generateMatchTeams, getMatchTeams,
  ratePlayer, finishMatch,
} from '../controllers/matchController';

const router = Router();

router.post('/',                     authMiddleware, createMatch);
router.get('/',                      authMiddleware, getMatches);
router.get('/my-invites',            authMiddleware, getMyInvites);  // must be before /:id
router.get('/:id',                   authMiddleware, getMatch);      // OData-like: $expand, $select
router.post('/:id/join',             authMiddleware, joinMatch);
router.post('/:id/leave',            authMiddleware, leaveMatch);
router.post('/:id/invite',           authMiddleware, inviteToMatch);
router.post('/:id/draw-teams',        authMiddleware, drawTeams);
router.post('/:id/generate-teams',   authMiddleware, generateMatchTeams);
router.get('/:id/teams',             authMiddleware, getMatchTeams);
router.post('/:id/rate',             authMiddleware, ratePlayer);
router.patch('/:id/finish',          authMiddleware, finishMatch);

export default router;
