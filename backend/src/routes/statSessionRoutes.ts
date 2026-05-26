import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware'
import {
  createStatSession, listStatSessions, getStatSession,
  updateStatSession, deleteStatSession, aggregateTeamStats,
} from '../controllers/statSessionController'

const router = Router()
router.use(authMiddleware)
router.get('/', listStatSessions)
router.post('/', createStatSession)
router.get('/team/:teamId/aggregate', aggregateTeamStats)
router.get('/:id', getStatSession)
router.put('/:id', updateStatSession)
router.delete('/:id', deleteStatSession)
export default router
