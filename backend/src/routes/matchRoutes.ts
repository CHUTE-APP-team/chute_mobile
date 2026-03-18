import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createMatch, getMatches, getMatch, joinMatch } from '../controllers/matchController';

const router = Router();

router.post('/',          authMiddleware, createMatch);
router.get('/',           authMiddleware, getMatches);
router.get('/:id',        authMiddleware, getMatch);    // OData-like: $expand, $select
router.post('/:id/join',  authMiddleware, joinMatch);

export default router;
