import { Router } from 'express';
import loginRoutes from './loginRoutes';
import produtoRoutes from './produtoRoutes';
import clienteRoutes from './clienteRoutes';
import vendaRoutes from './vendaRoutes';
import categoriaRoutes from './categoriaRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/login', loginRoutes);
router.use('/produtos', produtoRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/clientes', clienteRoutes);
router.use('/vendas', vendaRoutes);

export default router;
