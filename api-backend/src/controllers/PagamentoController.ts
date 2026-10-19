import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { VendaModel } from '../models/VendaModel';
import { PagamentoModel, FormaPagamento } from '../models/PagamentoModel';

function idValido(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class PagamentoController {
  /**
   * Exibe as opções de pagamento (Pix, Cartão de Crédito, Cartão de Débito, Boleto)
   * calculadas para a venda especificada.
   */
  static async obterOpcoesPorVenda(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idVenda = idValido(req.params.id);
      if (!idVenda) {
        res.status(400).json({ erro: 'ID da venda inválido.' });
        return;
      }

      const venda = await VendaModel.buscarPorId(idVenda);
      if (!venda) {
        res.status(404).json({ erro: 'Venda não encontrada.' });
        return;
      }

      const itens = await VendaModel.buscarItens(idVenda);
      const opcoesPagamento = PagamentoModel.gerarOpcoesPagamento(
        Number(venda.total),
        venda.id_venda
      );

      const pagamentoExistente = await PagamentoModel.buscarPorVenda(idVenda);

      res.status(200).json({
        venda: {
          id_venda: venda.id_venda,
          subtotal: venda.subtotal,
          desconto: venda.desconto,
          total: venda.total,
          status: venda.status,
          quantidade_itens: itens.length,
        },
        pagamento_registrado: pagamentoExistente,
        opcoes_pagamento: opcoesPagamento,
      });
    } catch (error) {
      console.error('Erro ao consultar opções de pagamento da venda:', error);
      res.status(500).json({ erro: 'Erro interno ao consultar opções de pagamento.' });
    }
  }

  /**
   * Processa e registra o pagamento de uma venda aberta, podendo finalizá-la imediatamente.
   */
  static async processarPagamento(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idVenda = idValido(req.params.id);
      if (!idVenda) {
        res.status(400).json({ erro: 'ID da venda inválido.' });
        return;
      }

      const { forma_pagamento, parcelas, detalhes, finalizar = true } = req.body ?? {};

      const formasValidas: FormaPagamento[] = ['pix', 'cartao_credito', 'cartao_debito', 'boleto'];
      if (!forma_pagamento || !formasValidas.includes(forma_pagamento)) {
        res.status(400).json({
          erro: 'Forma de pagamento inválida. Escolha entre: pix, cartao_credito, cartao_debito ou boleto.',
        });
        return;
      }

      const venda = await VendaModel.buscarPorId(idVenda);
      if (!venda) {
        res.status(404).json({ erro: 'Venda não encontrada.' });
        return;
      }

      if (venda.status !== 'aberta') {
        res.status(400).json({
          erro: `Não é possível processar pagamento para uma venda com status "${venda.status}".`,
        });
        return;
      }

      const itens = await VendaModel.buscarItens(idVenda);
      if (itens.length === 0) {
        res.status(400).json({ erro: 'A venda não possui nenhum produto cadastrado.' });
        return;
      }

      const numParcelas =
        forma_pagamento === 'cartao_credito' ? Math.max(1, Number(parcelas) || 1) : 1;

      if (forma_pagamento === 'cartao_credito' && numParcelas > 12) {
        res.status(400).json({ erro: 'O número máximo de parcelas permitido é 12.' });
        return;
      }

      if (finalizar) {
        // Finaliza a venda, abate o estoque e registra o pagamento atomicamente
        const pagamento = await VendaModel.finalizarVenda(idVenda, {
          forma_pagamento,
          parcelas: numParcelas,
          detalhes,
        });

        const vendaAtualizada = await VendaModel.buscarPorId(idVenda);

        res.status(200).json({
          mensagem: 'Pagamento processado e venda finalizada com sucesso.',
          venda: vendaAtualizada,
          pagamento,
          comprovante: {
            id_venda: idVenda,
            forma_pagamento,
            parcelas: numParcelas,
            valor_pago: venda.total,
            status: 'aprovado',
            data: new Date().toISOString(),
          },
        });
      } else {
        // Apenas registra o pagamento
        const idPagamento = await PagamentoModel.criar(
          idVenda,
          forma_pagamento,
          Number(venda.total),
          numParcelas,
          detalhes || null,
          'aprovado'
        );

        const pagamento = await PagamentoModel.buscarPorVenda(idVenda);

        res.status(201).json({
          mensagem: 'Pagamento registrado com sucesso.',
          pagamento,
        });
      }
    } catch (error: unknown) {
      console.error('Erro ao processar pagamento:', error);
      const mensagem = error instanceof Error ? error.message : 'Erro interno ao processar pagamento.';
      res.status(400).json({ erro: mensagem });
    }
  }
}

