import bcryptjs from 'bcryptjs';
import { UsuarioModel, Cargo } from '../models/UsuarioModel';
import { pool } from '../config/database';

const usuariosIniciais: { nome: string; email: string; senha: string; cargo: Cargo }[] = [
  { nome: 'Gerente Geral', email: 'gerente@pdv.com', senha: 'gerente123', cargo: 'gerente' },
  { nome: 'Vendedor João', email: 'vendedor@pdv.com', senha: 'vendedor123', cargo: 'vendedor' },
  { nome: 'Caixa Maria', email: 'caixa@pdv.com', senha: 'caixa123', cargo: 'caixa' },
];

async function seed(): Promise<void> {
  try {
    for (const u of usuariosIniciais) {
      const existente = await UsuarioModel.buscarPorEmail(u.email);

      if (existente) {
        console.log(`[Seed] Usuário ${u.email} já existe.`);
        continue;
      }

      const hash = await bcryptjs.hash(u.senha, 10);
      await UsuarioModel.criar(u.nome, u.email, hash, u.cargo);
      console.log(`[Seed] Criado: ${u.email} / senha: ${u.senha} (${u.cargo})`);
    }
  } catch (error) {
    console.error('[Seed] Erro ao executar seed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
