import { Router } from 'express';
import { CategoriaController } from '../controllers/CategoriaController';
import { autenticar, autorizar } from '../middlewares/auth';

const router = Router();

// Listagem pública para usuários autenticados
router.use(autenticar);
router.get('/', CategoriaController.listar);
router.post('/', autorizar('gerente'), CategoriaController.criar);

export default router;

