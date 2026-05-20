import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createTeam, getMyTeams, getTeam, updateTeam, deleteTeam, addMember } from '../controllers/teamController';

const router = Router();

router.post('/',                  authMiddleware, createTeam);
router.get('/',                   authMiddleware, getMyTeams);
router.get('/:id',                authMiddleware, getTeam);
router.put('/:id',                authMiddleware, updateTeam);
router.delete('/:id',             authMiddleware, deleteTeam);
router.post('/:id/members',       authMiddleware, addMember);

export default router;
