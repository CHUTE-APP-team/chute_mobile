import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createPost, getPosts, toggleLike, deletePost } from '../controllers/postController';

const router = Router();

router.post('/',           authMiddleware, createPost);
router.get('/',            authMiddleware, getPosts);
router.post('/:id/like',   authMiddleware, toggleLike);
router.delete('/:id',      authMiddleware, deletePost);

export default router;
