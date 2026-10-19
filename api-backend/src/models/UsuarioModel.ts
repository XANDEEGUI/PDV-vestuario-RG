import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';

export type Cargo = 'vendedor' | 'caixa' | 'gerente';

export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  senha_hash: string;
  cargo: Cargo;
  ativo: number;
}

interface UsuarioRow extends Usuario, RowDataPacket {}

export class UsuarioModel {
  static async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [rows] = await pool.query<UsuarioRow[]>(
      `SELECT id_usuario, nome, email, senha_hash, cargo, ativo
       FROM usuarios
       WHERE email = ? AND ativo = 1
       LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  }

  static async buscarPorId(id: number): Promise<Usuario | null> {
    const [rows] = await pool.query<UsuarioRow[]>(
      `SELECT id_usuario, nome, email, senha_hash, cargo, ativo
       FROM usuarios
       WHERE id_usuario = ? AND ativo = 1
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  static async criar(
    nome: string,
    email: string,
    senhaHash: string,
    cargo: Cargo
  ): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo) VALUES (?, ?, ?, ?, 1)',
      [nome, email, senhaHash, cargo]
    );
    return result.insertId;
  }

  static async desativar(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE usuarios SET ativo = 0 WHERE id_usuario = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
