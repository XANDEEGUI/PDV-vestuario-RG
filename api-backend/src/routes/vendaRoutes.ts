import { Router } from 'express';
import { VendaController } from '../controllers/VendaController';
import { PagamentoController } from '../controllers/PagamentoController';
import { autenticar, autorizar } from '../middlewares/auth';

const router = Router();

// Todas as rotas de vendas exigem autenticação
router.use(autenticar);

router.post('/abrir', VendaController.abrir);
router.get('/', VendaController.listar);
router.get('/historico', autorizar('gerente', 'vendedor'), VendaController.historico);
router.get('/relatorio-lucro', autorizar('gerente', 'vendedor'), VendaController.relatorioLucro);
router.get('/:id', VendaController.obter);
router.put('/:id/cliente', VendaController.atualizarCliente);
router.post('/:id/itens', VendaController.adicionarItem);
router.delete('/:id/itens/:idProduto', VendaController.removerItem);
router.post('/:id/desconto', VendaController.aplicarDesconto);

// Rotas do Sistema de Pagamento (Pix, Cartão de Crédito, Cartão de Débito, Boleto)
router.get('/:id/pagamento', PagamentoController.obterOpcoesPorVenda);
router.get('/:id/checkout', PagamentoController.obterOpcoesPorVenda);
router.post('/:id/pagamento', PagamentoController.processarPagamento);

router.post('/:id/finalizar', VendaController.finalizar);
router.post('/:id/cancelar', VendaController.cancelar);

export default router;
