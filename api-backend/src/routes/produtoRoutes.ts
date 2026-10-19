import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';
import { autenticar, autorizar } from '../middlewares/auth';

const router = Router();

// Todas as rotas de produtos exigem usuário autenticado
router.use(autenticar);

router.get('/alerta-estoque', ProdutoController.alertaEstoque);
router.get('/:id/pagamento', ProdutoController.obterOpcoesPagamento);
router.get('/', ProdutoController.listar);
router.get('/:id', ProdutoController.obter);
router.post('/', ProdutoController.criar);
router.put('/:id', ProdutoController.atualizar);
router.delete('/:id', autorizar('gerente'), ProdutoController.excluir);

export default router;
