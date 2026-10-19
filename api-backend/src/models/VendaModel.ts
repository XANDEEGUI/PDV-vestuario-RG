import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { pool } from '../config/database';
import { PagamentoModel, Pagamento, FormaPagamento, OpcoesPagamento } from './PagamentoModel';

export type StatusVenda = 'aberta' | 'finalizada' | 'cancelada';

export interface Venda {
  id_venda: number;
  id_usuario: number;
  id_cliente: number | null;
  data_venda: string | Date;
  subtotal: number;
  desconto: number;
  total: number;
  status: StatusVenda;
}

export interface ItemVenda {
  id_item: number;
  id_venda: number;
  id_produto: number;
  id_variacao?: number | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  nome_produto?: string;
  codigo_barras?: string | null;
  cor?: string | null;
  tamanho?: string | null;
}

export interface ItemVendaComLucro extends ItemVenda {
  preco_custo: number;
  custo_total: number;
  lucro_item: number;
  margem_lucro_item: number;
  frase_resumo: string;
}

export interface VendaComDetalhes extends Venda {
  nome_usuario?: string;
  email_usuario?: string;
  cargo_usuario?: string;
  nome_cliente?: string | null;
  cpf_cliente?: string | null;
  telefone_cliente?: string | null;
  itens?: ItemVenda[];
  pagamento?: Pagamento | null;
  forma_pagamento?: FormaPagamento | null;
  opcoes_pagamento?: OpcoesPagamento;
}

export interface VendaComLucroDetalhado extends VendaComDetalhes {
  itens: ItemVendaComLucro[];
  custo_total: number;
  lucro_total: number;
  margem_lucro_total: number;
}

export interface RelatorioLucroGeral {
  resumo: {
    total_faturado: number;
    total_custo: number;
    total_lucro: number;
    margem_geral_porcentagem: number;
    quantidade_vendas: number;
  };
  vendas: VendaComLucroDetalhado[];
}

interface VendaRow extends Venda, RowDataPacket {}
interface ItemVendaRow extends ItemVenda, RowDataPacket {}
interface ItemVendaComCustoRow extends ItemVendaRow {
  preco_custo: number;
}
interface VendaDetalhadaRow extends VendaComDetalhes, RowDataPacket {}

export class VendaModel {
  static async criar(id_usuario: number, id_cliente: number | null = null): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vendas (id_usuario, id_cliente, status, subtotal, desconto, total)
       VALUES (?, ?, 'aberta', 0.00, 0.00, 0.00)`,
      [id_usuario, id_cliente]
    );
    return result.insertId;
  }

  static async buscarPorId(id_venda: number, connection?: PoolConnection): Promise<Venda | null> {
    const conn = connection || pool;
    const [rows] = await conn.query<VendaRow[]>(
      'SELECT * FROM vendas WHERE id_venda = ? LIMIT 1',
      [id_venda]
    );
    return rows[0] ?? null;
  }

  static async buscarItens(id_venda: number, connection?: PoolConnection): Promise<ItemVenda[]> {
    const conn = connection || pool;
    const [rows] = await conn.query<ItemVendaRow[]>(
      `SELECT iv.id_item, iv.id_venda, iv.id_produto, iv.id_variacao, iv.quantidade, iv.preco_unitario, iv.subtotal,
              p.nome AS nome_produto,
              COALESCE(pv.codigo_barras, p.codigo_barras) AS codigo_barras,
              COALESCE(pv.cor, p.cor) AS cor,
              COALESCE(pv.tamanho, p.tamanho) AS tamanho
       FROM itens_venda iv
       JOIN produtos p ON p.id_produto = iv.id_produto
       LEFT JOIN produto_variacoes pv ON pv.id_variacao = iv.id_variacao
       WHERE iv.id_venda = ?
       ORDER BY iv.id_item ASC`,
      [id_venda]
    );
    return rows;
  }

  static async buscarItemEspecifico(
    id_venda: number,
    id_produto: number,
    id_variacao?: number | null,
    connection?: PoolConnection
  ): Promise<ItemVenda | null> {
    const conn = connection || pool;
    let sql = 'SELECT id_item, id_venda, id_produto, id_variacao, quantidade, preco_unitario, subtotal FROM itens_venda WHERE id_venda = ? AND id_produto = ?';
    const params: any[] = [id_venda, id_produto];

    if (id_variacao) {
      sql += ' AND id_variacao = ?';
      params.push(id_variacao);
    } else {
      sql += ' AND id_variacao IS NULL';
    }

    sql += ' LIMIT 1';
    const [rows] = await conn.query<ItemVendaRow[]>(sql, params);
    return rows[0] ?? null;
  }

  static async atualizarCliente(id_venda: number, id_cliente: number | null): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE vendas SET id_cliente = ? WHERE id_venda = ? AND status = 'aberta'`,
      [id_cliente, id_venda]
    );
    return result.affectedRows > 0;
  }

  static async adicionarOuAtualizarItem(
    id_venda: number,
    id_produto: number,
    quantidadeAdicionar: number,
    preco_unitario: number,
    id_variacao?: number | null
  ): Promise<void> {
    const subtotalInicial = Number((quantidadeAdicionar * preco_unitario).toFixed(2));
    const variacaoId = id_variacao ? Number(id_variacao) : null;

    // Verifica se já existe o item na venda com a mesma variação
    const existente = await this.buscarItemEspecifico(id_venda, id_produto, variacaoId);

    if (existente) {
      const novaQtd = existente.quantidade + quantidadeAdicionar;
      const novoSubtotal = Number((novaQtd * preco_unitario).toFixed(2));
      await pool.query(
        'UPDATE itens_venda SET quantidade = ?, preco_unitario = ?, subtotal = ? WHERE id_item = ?',
        [novaQtd, preco_unitario, novoSubtotal, existente.id_item]
      );
    } else {
      await pool.query(
        `INSERT INTO itens_venda (id_venda, id_produto, id_variacao, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_venda, id_produto, variacaoId, quantidadeAdicionar, preco_unitario, subtotalInicial]
      );
    }

    await this.recalcularTotais(id_venda);
  }

  static async removerItem(id_venda: number, id_produto: number, id_variacao?: number | null): Promise<boolean> {
    let sql = 'DELETE FROM itens_venda WHERE id_venda = ? AND id_produto = ?';
    const params: any[] = [id_venda, id_produto];

    if (id_variacao) {
      sql += ' AND id_variacao = ?';
      params.push(id_variacao);
    }

    const [result] = await pool.query<ResultSetHeader>(sql, params);

    if (result.affectedRows > 0) {
      await this.recalcularTotais(id_venda);
      return true;
    }
    return false;
  }

  static async recalcularTotais(id_venda: number, connection?: PoolConnection): Promise<void> {
    const conn = connection || pool;

    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(subtotal), 0) AS novo_subtotal FROM itens_venda WHERE id_venda = ?',
      [id_venda]
    );
    const novoSubtotal = Number(rows[0]?.novo_subtotal ?? 0);

    const [vendaRows] = await conn.query<VendaRow[]>(
      'SELECT desconto FROM vendas WHERE id_venda = ?',
      [id_venda]
    );
    const descontoAtual = Number(vendaRows[0]?.desconto ?? 0);

    // Ajusta o desconto se for maior que o novo subtotal
    const descontoFinal = Math.min(descontoAtual, novoSubtotal);
    const novoTotal = Number((novoSubtotal - descontoFinal).toFixed(2));

    await conn.query(
      'UPDATE vendas SET subtotal = ?, desconto = ?, total = ? WHERE id_venda = ?',
      [novoSubtotal, descontoFinal, novoTotal, id_venda]
    );
  }

  static async aplicarDesconto(id_venda: number, desconto: number): Promise<boolean> {
    const venda = await this.buscarPorId(id_venda);
    if (!venda || venda.status !== 'aberta') {
      return false;
    }

    const subtotal = Number(venda.subtotal);
    if (desconto < 0 || desconto > subtotal) {
      throw new Error('Desconto inválido. Deve ser entre 0 e o subtotal da venda.');
    }

    const total = Number((subtotal - desconto).toFixed(2));

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE vendas SET desconto = ?, total = ? WHERE id_venda = ? AND status = "aberta"',
      [desconto, total, id_venda]
    );
    return result.affectedRows > 0;
  }

  static async finalizarVenda(
    id_venda: number,
    dadosPagamento?: {
      forma_pagamento: FormaPagamento;
      parcelas?: number;
      detalhes?: Record<string, unknown>;
    }
  ): Promise<Pagamento | null> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Bloquear registro da venda para evitar concorrência
      const [vendas] = await conn.query<VendaRow[]>(
        'SELECT * FROM vendas WHERE id_venda = ? FOR UPDATE',
        [id_venda]
      );
      const venda = vendas[0];
      if (!venda) {
        throw new Error('Venda não encontrada.');
      }
      if (venda.status !== 'aberta') {
        throw new Error(`Não é possível finalizar uma venda com status "${venda.status}".`);
      }

      const itens = await this.buscarItens(id_venda, conn);
      if (itens.length === 0) {
        throw new Error('A venda não possui nenhum item para ser finalizada.');
      }

      // 1. Abate estoque do produto pai
      await conn.query(
        `UPDATE produtos p
         JOIN itens_venda iv ON iv.id_produto = p.id_produto
         SET p.quantidade_estoque = p.quantidade_estoque - iv.quantidade
         WHERE iv.id_venda = ?`,
        [id_venda]
      );

      // 2. Abate estoque da variação específica vinculada (se houver)
      await conn.query(
        `UPDATE produto_variacoes pv
         JOIN itens_venda iv ON iv.id_variacao = pv.id_variacao
         SET pv.quantidade_estoque = pv.quantidade_estoque - iv.quantidade
         WHERE iv.id_venda = ? AND iv.id_variacao IS NOT NULL`,
        [id_venda]
      );

      let pagamentoRegistrado: Pagamento | null = null;

      if (dadosPagamento) {
        const formasValidas: FormaPagamento[] = ['pix', 'cartao_credito', 'cartao_debito', 'boleto'];
        if (!formasValidas.includes(dadosPagamento.forma_pagamento)) {
          throw new Error('Forma de pagamento inválida. Escolha entre: pix, cartao_credito, cartao_debito ou boleto.');
        }

        const parcelas = dadosPagamento.forma_pagamento === 'cartao_credito'
          ? Math.max(1, Number(dadosPagamento.parcelas) || 1)
          : 1;

        const idPagamento = await PagamentoModel.criar(
          id_venda,
          dadosPagamento.forma_pagamento,
          Number(venda.total),
          parcelas,
          dadosPagamento.detalhes,
          'aprovado',
          conn
        );

        pagamentoRegistrado = await PagamentoModel.buscarPorVenda(id_venda, conn);
      }

      await conn.query(
        'UPDATE vendas SET status = "finalizada" WHERE id_venda = ?',
        [id_venda]
      );

      await conn.commit();
      return pagamentoRegistrado;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async cancelarVenda(id_venda: number): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [vendas] = await conn.query<VendaRow[]>(
        'SELECT * FROM vendas WHERE id_venda = ? FOR UPDATE',
        [id_venda]
      );
      const venda = vendas[0];
      if (!venda) {
        throw new Error('Venda não encontrada.');
      }
      if (venda.status === 'cancelada') {
        throw new Error('Esta venda já está cancelada.');
      }

      // Se a venda já estava finalizada, devolver os produtos ao estoque
      if (venda.status === 'finalizada') {
        await conn.query(
          `UPDATE produtos p
           JOIN itens_venda iv ON iv.id_produto = p.id_produto
           SET p.quantidade_estoque = p.quantidade_estoque + iv.quantidade
           WHERE iv.id_venda = ?`,
          [id_venda]
        );

        await conn.query(
          `UPDATE produto_variacoes pv
           JOIN itens_venda iv ON iv.id_variacao = pv.id_variacao
           SET pv.quantidade_estoque = pv.quantidade_estoque + iv.quantidade
           WHERE iv.id_venda = ? AND iv.id_variacao IS NOT NULL`,
          [id_venda]
        );

        await PagamentoModel.cancelarPorVenda(id_venda, conn);
      }

      await conn.query(
        'UPDATE vendas SET status = "cancelada" WHERE id_venda = ?',
        [id_venda]
      );

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async listarHistorico(): Promise<VendaComDetalhes[]> {
    const [rows] = await pool.query<VendaDetalhadaRow[]>(
      `SELECT v.id_venda, v.id_usuario, v.id_cliente, v.data_venda, v.subtotal, v.desconto, v.total, v.status,
              u.nome AS nome_usuario, u.email AS email_usuario, u.cargo AS cargo_usuario,
              c.nome AS nome_cliente, c.cpf AS cpf_cliente, c.telefone AS telefone_cliente,
              pg.forma_pagamento, pg.status AS status_pagamento
       FROM vendas v
       JOIN usuarios u ON u.id_usuario = v.id_usuario
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       LEFT JOIN pagamentos pg ON pg.id_venda = v.id_venda
       ORDER BY v.data_venda DESC`
    );
    return rows;
  }

  /**
   * Relatório de Histórico e Lucratividade
   * - Custo Total = Soma(quantidade * preco_custo) dos itens
   * - Lucro em Valor (R$) = Total da Venda - Custo Total
   * - Margem de Lucro (%) = (Lucro em Valor / Custo Total) * 100
   * - Retorna nome do cliente (ou "Cliente Não Identificado / Avulso") e detalhes com lucro por peça.
   */
  static async listarRelatorioLucro(): Promise<RelatorioLucroGeral> {
    const vendasBase = await this.listarHistorico();

    let acumuladoFaturado = 0;
    let acumuladoCusto = 0;
    let acumuladoLucro = 0;

    const vendasCompletas: VendaComLucroDetalhado[] = [];

    for (const venda of vendasBase) {
      // Busca itens com detalhes de produto, variação (cor/tamanho) e preco_custo
      const [itensRows] = await pool.query<ItemVendaComCustoRow[]>(
        `SELECT iv.id_item, iv.id_venda, iv.id_produto, iv.id_variacao, iv.quantidade, iv.preco_unitario, iv.subtotal,
                p.nome AS nome_produto,
                COALESCE(pv.codigo_barras, p.codigo_barras) AS codigo_barras,
                COALESCE(pv.cor, p.cor) AS cor,
                COALESCE(pv.tamanho, p.tamanho) AS tamanho,
                p.preco_custo
         FROM itens_venda iv
         JOIN produtos p ON p.id_produto = iv.id_produto
         LEFT JOIN produto_variacoes pv ON pv.id_variacao = iv.id_variacao
         WHERE iv.id_venda = ?
         ORDER BY iv.id_item ASC`,
        [venda.id_venda]
      );

      let custoTotalVenda = 0;

      const itensComLucro: ItemVendaComLucro[] = itensRows.map((it) => {
        const qtd = Number(it.quantidade);
        const precoVenda = Number(it.preco_unitario);
        const precoCusto = Number(it.preco_custo);

        const custoItem = Number((precoCusto * qtd).toFixed(2));
        const receitaItem = Number((precoVenda * qtd).toFixed(2));
        const lucroItem = Number((receitaItem - custoItem).toFixed(2));
        const margemItem = custoItem > 0
          ? Number(((lucroItem / custoItem) * 100).toFixed(2))
          : 0;

        custoTotalVenda += custoItem;

        const corStr = it.cor ? ` | Cor: ${it.cor}` : '';
        const tamStr = it.tamanho ? ` | Tam: ${it.tamanho}` : '';
        const fraseResumo = `${qtd}x ${it.nome_produto || 'Peça'}${corStr}${tamStr} — Lucro: R$ ${lucroItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (+${margemItem.toFixed(2)}%)`;

        return {
          ...it,
          preco_custo: precoCusto,
          custo_total: custoItem,
          lucro_item: lucroItem,
          lucro_reais: lucroItem,
          margem_lucro_item: margemItem,
          margem_lucro_percentual: margemItem,
          frase_resumo: fraseResumo,
        };
      });

      const totalVenda = Number(venda.total || 0);
      const custoTotalFormatado = Number(custoTotalVenda.toFixed(2));
      const lucroTotalVenda = Number((totalVenda - custoTotalFormatado).toFixed(2));
      const margemTotalVenda = custoTotalFormatado > 0
        ? Number(((lucroTotalVenda / custoTotalFormatado) * 100).toFixed(2))
        : 0;

      if (venda.status === 'finalizada') {
        acumuladoFaturado += totalVenda;
        acumuladoCusto += custoTotalFormatado;
        acumuladoLucro += lucroTotalVenda;
      }

      // Cliente: se for NULL, "Cliente Não Identificado / Avulso"
      const nomeClienteFormatado = venda.nome_cliente
        ? venda.nome_cliente
        : 'Cliente Não Identificado / Avulso';

      vendasCompletas.push({
        ...venda,
        total_venda: totalVenda,
        nome_cliente: nomeClienteFormatado,
        itens: itensComLucro,
        custo_total: custoTotalFormatado,
        lucro_total: lucroTotalVenda,
        lucro_reais: lucroTotalVenda,
        margem_lucro_total: margemTotalVenda,
        margem_lucro_percentual: margemTotalVenda,
      });
    }

    const margemGeral = acumuladoCusto > 0
      ? Number(((acumuladoLucro / acumuladoCusto) * 100).toFixed(2))
      : 0;

    return {
      resumo: {
        total_faturado: Number(acumuladoFaturado.toFixed(2)),
        total_custo: Number(acumuladoCusto.toFixed(2)),
        total_lucro: Number(acumuladoLucro.toFixed(2)),
        margem_geral_porcentagem: margemGeral,
        quantidade_vendas: vendasCompletas.filter((v) => v.status === 'finalizada').length,
      },
      vendas: vendasCompletas,
    };
  }
}
