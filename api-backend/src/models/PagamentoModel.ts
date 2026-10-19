import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { pool } from '../config/database';

export type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto';
export type StatusPagamento = 'pendente' | 'aprovado' | 'recusado' | 'cancelado';

export interface Pagamento {
  id_pagamento: number;
  id_venda: number;
  forma_pagamento: FormaPagamento;
  valor: number;
  status: StatusPagamento;
  parcelas: number;
  detalhes: string | null;
  data_pagamento: string | Date;
}

export interface ParcelaInfo {
  parcela: number;
  valor_parcela: number;
  total: number;
  descricao: string;
}

export interface OpcoesPagamento {
  valor_total: number;
  pix: {
    forma: 'pix';
    titulo: string;
    valor: number;
    chave_pix: string;
    qrcode_copia_cola: string;
    expiracao: string;
    instrucoes: string;
  };
  cartao_credito: {
    forma: 'cartao_credito';
    titulo: string;
    valor: number;
    max_parcelas: number;
    parcelas: ParcelaInfo[];
    bandeiras_aceitas: string[];
    instrucoes: string;
  };
  cartao_debito: {
    forma: 'cartao_debito';
    titulo: string;
    valor: number;
    bandeiras_aceitas: string[];
    instrucoes: string;
  };
  boleto: {
    forma: 'boleto';
    titulo: string;
    valor: number;
    data_vencimento: string;
    linha_digitavel: string;
    codigo_barras: string;
    instrucoes: string;
  };
}

interface PagamentoRow extends Pagamento, RowDataPacket {}

export class PagamentoModel {
  /**
   * Gera todas as opções e detalhes de pagamento (Pix, Cartão de Crédito, Cartão de Débito, Boleto)
   * calculadas para um determinado valor.
   */
  static gerarOpcoesPagamento(valorTotal: number, idReferencia: number = 1): OpcoesPagamento {
    const valor = Math.round(Number(valorTotal) * 100) / 100;
    const valorCentavos = Math.round(valor * 100);

    // 1. PIX
    const chavePix = 'pdv.pagamentos@vestuario.com.br';
    const refPad = String(idReferencia).padStart(6, '0');
    // Payload simulado no padrão Pix BR Code
    const qrcodePix = `00020126580014br.gov.bcb.pix0131${chavePix}520400005303986540${valor.toFixed(2)}5802BR5913PDV VESTUARIO6009SAO PAULO62140510REF${refPad}6304`;

    // 2. Cartão de Crédito (tabela de 1x a 12x)
    const maxParcelas = valor >= 120 ? 12 : valor >= 60 ? 6 : valor >= 20 ? 3 : 1;
    const parcelas: ParcelaInfo[] = [];

    for (let i = 1; i <= maxParcelas; i++) {
      const valorParcela = Number((valor / i).toFixed(2));
      parcelas.push({
        parcela: i,
        valor_parcela: valorParcela,
        total: valor,
        descricao: `${i}x de R$ ${valorParcela.toFixed(2).replace('.', ',')} sem juros`,
      });
    }

    // 3. Boleto Bancário
    const hoje = new Date();
    const dataVenc = new Date(hoje);
    dataVenc.setDate(hoje.getDate() + 3); // 3 dias corridos
    const vencimentoFormatado = dataVenc.toISOString().split('T')[0];

    // Linha digitável e código de barras simulados (Banco do Brasil 001)
    const valorStr = String(valorCentavos).padStart(10, '0');
    const linhaDigitavel = `00190.00009 01234.567890 ${refPad.padEnd(10, '1')}.2 1 9500${valorStr}`;
    const codigoBarras = `001919500${valorStr}0000001234567890${refPad.padEnd(10, '0')}`;

    return {
      valor_total: valor,
      pix: {
        forma: 'pix',
        titulo: 'PIX - Pagamento Instantâneo',
        valor,
        chave_pix: chavePix,
        qrcode_copia_cola: qrcodePix,
        expiracao: '30 minutos',
        instrucoes:
          'Abra o app do seu banco, escolha Pagar via Pix e use a opção Copia e Cola ou escaneie o QR Code.',
      },
      cartao_credito: {
        forma: 'cartao_credito',
        titulo: 'Cartão de Crédito',
        valor,
        max_parcelas: maxParcelas,
        parcelas,
        bandeiras_aceitas: ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'American Express'],
        instrucoes:
          'Pagamento parcelado em até 12x sem juros. Aproxime ou insira o cartão na maquininha.',
      },
      cartao_debito: {
        forma: 'cartao_debito',
        titulo: 'Cartão de Débito',
        valor,
        bandeiras_aceitas: ['Visa Débito', 'Mastercard Maestro', 'Elo Débito'],
        instrucoes:
          'Pagamento à vista com desconto imediato da conta bancária. Insira o cartão e digite sua senha.',
      },
      boleto: {
        forma: 'boleto',
        titulo: 'Boleto Bancário',
        valor,
        data_vencimento: vencimentoFormatado,
        linha_digitavel: linhaDigitavel,
        codigo_barras: codigoBarras,
        instrucoes:
          'Pague em qualquer banco, lotérica ou aplicativo de internet banking até a data de vencimento.',
      },
    };
  }

  static async criar(
    id_venda: number,
    forma_pagamento: FormaPagamento,
    valor: number,
    parcelas: number = 1,
    detalhes?: Record<string, unknown> | null,
    status: StatusPagamento = 'aprovado',
    connection?: PoolConnection
  ): Promise<number> {
    const conn = connection || pool;
    const detalhesJson = detalhes ? JSON.stringify(detalhes) : null;

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO pagamentos (id_venda, forma_pagamento, valor, status, parcelas, detalhes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_venda, forma_pagamento, valor, status, parcelas, detalhesJson]
    );

    return result.insertId;
  }

  static async buscarPorVenda(
    id_venda: number,
    connection?: PoolConnection
  ): Promise<Pagamento | null> {
    const conn = connection || pool;
    const [rows] = await conn.query<PagamentoRow[]>(
      `SELECT id_pagamento, id_venda, forma_pagamento, valor, status, parcelas, detalhes, data_pagamento
       FROM pagamentos
       WHERE id_venda = ?
       ORDER BY id_pagamento DESC
       LIMIT 1`,
      [id_venda]
    );

    return rows[0] ?? null;
  }

  static async cancelarPorVenda(
    id_venda: number,
    connection?: PoolConnection
  ): Promise<boolean> {
    const conn = connection || pool;
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE pagamentos SET status = 'cancelado' WHERE id_venda = ? AND status != 'cancelado'`,
      [id_venda]
    );
    return result.affectedRows > 0;
  }
}

