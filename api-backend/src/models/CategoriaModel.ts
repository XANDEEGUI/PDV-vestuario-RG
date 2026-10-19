import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';

export interface Categoria {
  id_categoria: number;
  nome: string;
  descricao: string | null;
  ativo: number;
}

export interface CategoriaDados {
  nome: string;
  descricao?: string | null;
}

interface CategoriaRow extends Categoria, RowDataPacket {}

export class CategoriaModel {
  static async listar(): Promise<Categoria[]> {
    const [rows] = await pool.query<CategoriaRow[]>(
      'SELECT id_categoria, nome, descricao, ativo FROM categorias WHERE ativo = 1 ORDER BY nome ASC'
    );
    return rows;
  }

  static async buscarPorId(id: number): Promise<Categoria | null> {
    const [rows] = await pool.query<CategoriaRow[]>(
      'SELECT id_categoria, nome, descricao, ativo FROM categorias WHERE id_categoria = ? AND ativo = 1 LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  }

  static async buscarPorNome(nome: string): Promise<Categoria | null> {
    const [rows] = await pool.query<CategoriaRow[]>(
      'SELECT id_categoria, nome, descricao, ativo FROM categorias WHERE LOWER(nome) = LOWER(?) AND ativo = 1 LIMIT 1',
      [nome.trim()]
    );
    return rows[0] ?? null;
  }

  static async criar(dados: CategoriaDados): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO categorias (nome, descricao, ativo) VALUES (?, ?, 1)',
      [dados.nome.trim(), dados.descricao?.trim() || null]
    );
    return result.insertId;
  }
}

