import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definido no arquivo .env');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento final de erros (ex.: JSON inválido no corpo da requisição)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err === 'object' && err !== null ? (err as { status?: number }).status : undefined;

  if (status === 400) {
    res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
    return;
  }

  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
