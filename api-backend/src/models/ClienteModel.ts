import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';

export interface Cliente {
  id_cliente: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
}

export interface ClienteDados {
  nome: string;
  cpf: string | null;
  telefone: string | null;
}

interface ClienteRow extends Cliente, RowDataPacket {}

const COLUNAS = 'id_cliente, nome, cpf, telefone';

export class ClienteModel {
  static async listar(busca?: string): Promise<Cliente[]> {
    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      const [rows] = await pool.query<ClienteRow[]>(
        `SELECT ${COLUNAS} FROM clientes
         WHERE nome LIKE ? OR cpf LIKE ? OR telefone LIKE ?
         ORDER BY nome`,
        [termo, termo, termo]
      );
      return rows;
    }

    const [rows] = await pool.query<ClienteRow[]>(
      `SELECT ${COLUNAS} FROM clientes ORDER BY nome`
    );
    return rows;
  }

  static async buscarPorId(id: number): Promise<Cliente | null> {
    const [rows] = await pool.query<ClienteRow[]>(
      `SELECT ${COLUNAS} FROM clientes WHERE id_cliente = ? LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  static async buscarPorCpf(cpf: string): Promise<Cliente | null> {
    const [rows] = await pool.query<ClienteRow[]>(
      `SELECT ${COLUNAS} FROM clientes WHERE cpf = ? LIMIT 1`,
      [cpf]
    );
    return rows[0] ?? null;
  }

  static async criar(dados: ClienteDados): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO clientes (nome, cpf, telefone) VALUES (?, ?, ?)',
      [dados.nome, dados.cpf, dados.telefone]
    );
    return result.insertId;
  }

  static async atualizar(id: number, dados: ClienteDados): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE clientes SET nome = ?, cpf = ?, telefone = ? WHERE id_cliente = ?',
      [dados.nome, dados.cpf, dados.telefone, id]
    );
    return result.affectedRows > 0;
  }

  static async excluir(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM clientes WHERE id_cliente = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}