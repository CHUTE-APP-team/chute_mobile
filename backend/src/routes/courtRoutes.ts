import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware'
import { createCourt, listCourts, getCourt, updateCourt, deleteCourt } from '../controllers/courtController'

const router = Router()
router.use(authMiddleware)
router.get('/', listCourts)
router.post('/', createCourt)
router.get('/:id', getCourt)
router.put('/:id', updateCourt)
router.delete('/:id', deleteCourt)
export default router
