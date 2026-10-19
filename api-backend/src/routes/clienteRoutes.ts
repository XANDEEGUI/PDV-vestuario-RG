import { Router } from 'express';
import { ClienteController } from '../controllers/ClienteController';
import { autenticar, autorizar } from '../middlewares/auth';

const router = Router();

// Todas as rotas de clientes exigem autenticação
router.use(autenticar);

router.get('/', ClienteController.listar);
router.get('/:id', ClienteController.obter);
router.post('/', ClienteController.criar);
router.put('/:id', ClienteController.atualizar);
router.delete('/:id', autorizar('gerente'), ClienteController.excluir);

export default router;