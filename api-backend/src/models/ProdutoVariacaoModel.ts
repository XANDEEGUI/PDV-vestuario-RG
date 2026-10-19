import { RowDataPacket, ResultSetHeader, PoolConnection, Pool } from 'mysql2/promise';
import { pool } from '../config/database';

export interface ProdutoVariacao {
  id_variacao: number;
  id_produto: number;
  cor: string;
  tamanho: string;
  codigo_barras: string | null;
  quantidade_estoque: number;
  ativo: number;
}

export interface VariacaoEntrada {
  id_variacao?: number;
  cor: string;
  tamanho: string;
  codigo_barras?: string | null;
  quantidade_estoque: number;
}

interface ProdutoVariacaoRow extends ProdutoVariacao, RowDataPacket {}

export class ProdutoVariacaoModel {
  static async listarPorProduto(id_produto: number, connection?: Pool | PoolConnection): Promise<ProdutoVariacao[]> {
    const conn = connection || pool;
    const [rows] = await conn.query<ProdutoVariacaoRow[]>(
      `SELECT id_variacao, id_produto, cor, tamanho, codigo_barras, quantidade_estoque, ativo
       FROM produto_variacoes
       WHERE id_produto = ? AND ativo = 1
       ORDER BY cor ASC, tamanho ASC`,
      [id_produto]
    );
    return rows;
  }

  static async buscarPorId(id_variacao: number, connection?: Pool | PoolConnection): Promise<ProdutoVariacao | null> {
    const conn = connection || pool;
    const [rows] = await conn.query<ProdutoVariacaoRow[]>(
      `SELECT id_variacao, id_produto, cor, tamanho, codigo_barras, quantidade_estoque, ativo
       FROM produto_variacoes
       WHERE id_variacao = ? AND ativo = 1
       LIMIT 1`,
      [id_variacao]
    );
    return rows[0] ?? null;
  }

  static async buscarPorCodigoBarras(codigo: string, connection?: Pool | PoolConnection): Promise<ProdutoVariacao | null> {
    const conn = connection || pool;
    const [rows] = await conn.query<ProdutoVariacaoRow[]>(
      `SELECT id_variacao, id_produto, cor, tamanho, codigo_barras, quantidade_estoque, ativo
       FROM produto_variacoes
       WHERE codigo_barras = ? AND ativo = 1
       LIMIT 1`,
      [codigo.trim()]
    );
    return rows[0] ?? null;
  }

  static async criar(id_produto: number, dados: VariacaoEntrada, connection?: Pool | PoolConnection): Promise<number> {
    const conn = connection || pool;
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO produto_variacoes (id_produto, cor, tamanho, codigo_barras, quantidade_estoque, ativo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        id_produto,
        dados.cor.trim(),
        dados.tamanho.trim().toUpperCase(),
        dados.codigo_barras?.trim() || null,
        Math.max(0, Number(dados.quantidade_estoque) || 0),
      ]
    );
    return result.insertId;
  }

  static async decrementarEstoque(
    id_variacao: number,
    quantidade: number,
    connection?: Pool | PoolConnection
  ): Promise<boolean> {
    const conn = connection || pool;
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE produto_variacoes
       SET quantidade_estoque = quantidade_estoque - ?
       WHERE id_variacao = ? AND quantidade_estoque >= ?`,
      [quantidade, id_variacao, quantidade]
    );
    return result.affectedRows > 0;
  }

  static async incrementarEstoque(
    id_variacao: number,
    quantidade: number,
    connection?: Pool | PoolConnection
  ): Promise<boolean> {
    const conn = connection || pool;
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE produto_variacoes
       SET quantidade_estoque = quantidade_estoque + ?
       WHERE id_variacao = ?`,
      [quantidade, id_variacao]
    );
    return result.affectedRows > 0;
  }
}
