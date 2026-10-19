import { RowDataPacket, ResultSetHeader, PoolConnection, Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { ProdutoVariacao, ProdutoVariacaoModel, VariacaoEntrada } from './ProdutoVariacaoModel';

export interface Produto {
  id_produto: number;
  id_categoria?: number | null;
  nome_categoria?: string | null;
  codigo_barras?: string | null;
  nome: string;
  tamanho?: string | null;
  cor?: string | null;
  preco_custo: number;
  preco_unitario: number;
  quantidade_estoque: number;
  estoque_minimo: number;
  ativo: number;
  margem_lucro?: number;
  variacoes?: ProdutoVariacao[];
  variacao_selecionada?: ProdutoVariacao;
  opcoes_pagamento?: import('./PagamentoModel').OpcoesPagamento;
}

export interface ProdutoDados {
  nome: string;
  id_categoria?: number | null;
  codigo_barras?: string | null;
  tamanho?: string | null;
  cor?: string | null;
  preco_custo: number;
  preco_unitario: number;
  quantidade_estoque?: number;
  estoque_minimo?: number;
}

interface ProdutoRow extends Produto, RowDataPacket {}

const COLUNAS_PRODUTO =
  'p.id_produto, p.id_categoria, c.nome AS nome_categoria, p.codigo_barras, p.nome, p.tamanho, p.cor, p.preco_custo, p.preco_unitario, p.quantidade_estoque, p.estoque_minimo, p.ativo';

export class ProdutoModel {
  static async listar(busca?: string, id_categoria?: number): Promise<Produto[]> {
    let sql = `
      SELECT ${COLUNAS_PRODUTO}
      FROM produtos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      WHERE p.ativo = 1
    `;
    const params: any[] = [];

    if (id_categoria && Number.isInteger(Number(id_categoria))) {
      sql += ' AND p.id_categoria = ?';
      params.push(Number(id_categoria));
    }

    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      sql += ` AND (
        p.codigo_barras = ? OR p.nome LIKE ? OR p.cor LIKE ? OR
        p.id_produto IN (
          SELECT pv.id_produto FROM produto_variacoes pv 
          WHERE pv.codigo_barras = ? OR pv.cor LIKE ? OR pv.tamanho LIKE ?
        )
      )`;
      params.push(busca.trim(), termo, termo, busca.trim(), termo, termo);
    }

    sql += ' ORDER BY p.nome ASC';

    const [rows] = await pool.query<ProdutoRow[]>(sql, params);

    // Carrega variações para cada produto listado
    for (const prod of rows) {
      prod.variacoes = await ProdutoVariacaoModel.listarPorProduto(prod.id_produto);
      // O estoque total exibido reflete a soma real das variações se houver
      if (prod.variacoes.length > 0) {
        prod.quantidade_estoque = prod.variacoes.reduce((acc, v) => acc + Number(v.quantidade_estoque), 0);
      }
    }

    return rows;
  }

  static async buscarPorId(id: number, connection?: Pool | PoolConnection): Promise<Produto | null> {
    const conn = connection || pool;
    const [rows] = await conn.query<ProdutoRow[]>(
      `SELECT ${COLUNAS_PRODUTO}
       FROM produtos p
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_produto = ? AND p.ativo = 1
       LIMIT 1`,
      [id]
    );

    const produto = rows[0] ?? null;
    if (produto) {
      produto.variacoes = await ProdutoVariacaoModel.listarPorProduto(produto.id_produto, conn);
      if (produto.variacoes.length > 0) {
        produto.quantidade_estoque = produto.variacoes.reduce((acc, v) => acc + Number(v.quantidade_estoque), 0);
      }
    }

    return produto;
  }

  static async buscarPorCodigoBarras(codigo: string, connection?: Pool | PoolConnection): Promise<Produto | null> {
    const conn = connection || pool;
    const codLimpo = codigo.trim();

    // 1. Verifica se é o código de barras de uma variação
    const variacao = await ProdutoVariacaoModel.buscarPorCodigoBarras(codLimpo, conn);
    if (variacao) {
      const produto = await this.buscarPorId(variacao.id_produto, conn);
      if (produto) {
        produto.variacao_selecionada = variacao;
        return produto;
      }
    }

    // 2. Verifica se é o código de barras do produto pai
    const [rows] = await conn.query<ProdutoRow[]>(
      `SELECT ${COLUNAS_PRODUTO}
       FROM produtos p
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.codigo_barras = ? AND p.ativo = 1
       LIMIT 1`,
      [codLimpo]
    );

    const produto = rows[0] ?? null;
    if (produto) {
      produto.variacoes = await ProdutoVariacaoModel.listarPorProduto(produto.id_produto, conn);
      if (produto.variacoes.length > 0) {
        produto.quantidade_estoque = produto.variacoes.reduce((acc, v) => acc + Number(v.quantidade_estoque), 0);
      }
    }

    return produto;
  }

  static async buscarAlertaEstoque(): Promise<Produto[]> {
    const produtos = await this.listar();
    return produtos.filter((p) => p.quantidade_estoque <= p.estoque_minimo);
  }

  /**
   * Criação com Grade: Produto Pai + Variações de Cores e Tamanhos em Transação
   */
  static async criarComVariacoes(
    dados: ProdutoDados,
    variacoes: VariacaoEntrada[]
  ): Promise<number> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Calcula estoque total das variações
      const estoqueTotal = variacoes.length > 0
        ? variacoes.reduce((acc, v) => acc + Math.max(0, Number(v.quantidade_estoque) || 0), 0)
        : Math.max(0, Number(dados.quantidade_estoque) || 0);

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO produtos (
          id_categoria, codigo_barras, nome, tamanho, cor, preco_custo, preco_unitario, quantidade_estoque, estoque_minimo, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          dados.id_categoria || null,
          dados.codigo_barras || null,
          dados.nome.trim(),
          dados.tamanho || null,
          dados.cor || null,
          dados.preco_custo,
          dados.preco_unitario,
          estoqueTotal,
          dados.estoque_minimo ?? 5,
        ]
      );

      const idProduto = result.insertId;

      // Insere as variações de cor e tamanho
      for (const v of variacoes) {
        await ProdutoVariacaoModel.criar(idProduto, v, connection);
      }

      await connection.commit();
      return idProduto;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async atualizarComVariacoes(
    id: number,
    dados: Partial<ProdutoDados>,
    variacoes?: VariacaoEntrada[]
  ): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query<ResultSetHeader>(
        `UPDATE produtos
         SET id_categoria = COALESCE(?, id_categoria),
             nome = COALESCE(?, nome),
             preco_custo = COALESCE(?, preco_custo),
             preco_unitario = COALESCE(?, preco_unitario),
             estoque_minimo = COALESCE(?, estoque_minimo)
         WHERE id_produto = ? AND ativo = 1`,
        [
          dados.id_categoria !== undefined ? dados.id_categoria : null,
          dados.nome ? dados.nome.trim() : null,
          dados.preco_custo,
          dados.preco_unitario,
          dados.estoque_minimo,
          id,
        ]
      );

      // Se enviadas variações para substituição/atualização
      if (variacoes && Array.isArray(variacoes)) {
        await connection.query('DELETE FROM produto_variacoes WHERE id_produto = ?', [id]);
        for (const v of variacoes) {
          await ProdutoVariacaoModel.criar(id, v, connection);
        }

        const estoqueTotal = variacoes.reduce(
          (acc, v) => acc + Math.max(0, Number(v.quantidade_estoque) || 0),
          0
        );
        await connection.query(
          'UPDATE produtos SET quantidade_estoque = ? WHERE id_produto = ?',
          [estoqueTotal, id]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async desativar(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE produtos SET ativo = 0 WHERE id_produto = ? AND ativo = 1',
      [id]
    );
    return result.affectedRows > 0;
  }
}
