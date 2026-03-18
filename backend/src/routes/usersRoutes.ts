import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMe, getUsers } from '../controllers/usersController';

const router = Router();

router.get('/me',  authMiddleware, getMe);
router.get('/',    authMiddleware, getUsers);  // OData-like: $select, $filter, $top, $skip

export default router;
