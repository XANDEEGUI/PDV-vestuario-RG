import { Router } from 'express';
import { LoginController } from '../controllers/LoginController';
import { autenticar } from '../middlewares/auth';

const router = Router();

router.post('/', LoginController.login);
router.get('/me', autenticar, LoginController.me);

export default router;

