import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware'
import { drawTeamsStandalone } from '../controllers/drawTeamsController'
import { rateUserStars } from '../controllers/rateStarsController'

const router = Router()
router.use(authMiddleware)
router.post('/draw-teams', drawTeamsStandalone)
router.post('/users/:id/rate-stars', rateUserStars)
export default router
