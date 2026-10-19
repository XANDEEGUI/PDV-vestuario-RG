import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { VendaModel } from '../models/VendaModel';
import { ProdutoModel } from '../models/ProdutoModel';
import { ClienteModel } from '../models/ClienteModel';
import { PagamentoModel, FormaPagamento } from '../models/PagamentoModel';

function idValido(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class VendaController {
  static async abrir(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idUsuario = req.usuario?.id_usuario ?? req.usuario?.id;
      if (!idUsuario) {
        res.status(401).json({ erro: 'Usuário não autenticado.' });
        return;
      }

      let idCliente: number | null = null;
      if (req.body?.id_cliente !== undefined && req.body?.id_cliente !== null) {
        const idConvertido = idValido(req.body.id_cliente);
        if (!idConvertido) {
          res.status(400).json({ erro: 'ID do cliente inválido.' });
          return;
        }
        const clienteExistente = await ClienteModel.buscarPorId(idConvertido);
        if (!clienteExistente) {
          res.status(404).json({ erro: 'Cliente informado não encontrado.' });
          return;
        }
        idCliente = idConvertido;
      }

      const idVenda = await VendaModel.criar(idUsuario, idCliente);
      const venda = await VendaModel.buscarPorId(idVenda);

      res.status(201).json({
        mensagem: 'Venda aberta com sucesso.',
        venda,
      });
    } catch (error) {
      console.error('Erro ao abrir venda:', error);
      res.status(500).json({ erro: 'Erro interno ao abrir venda.' });
    }
  }

  static async atualizarCliente(req: AuthRequest, res: Response): Promise<void> {
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

      if (venda.status !== 'aberta') {
        res.status(400).json({ erro: `Não é possível alterar cliente de uma venda "${venda.status}".` });
        return;
      }

      let idCliente: number | null = null;
      if (req.body?.id_cliente !== undefined && req.body?.id_cliente !== null) {
        const idConvertido = idValido(req.body.id_cliente);
        if (!idConvertido) {
          res.status(400).json({ erro: 'ID do cliente inválido.' });
          return;
        }
        const clienteExistente = await ClienteModel.buscarPorId(idConvertido);
        if (!clienteExistente) {
          res.status(404).json({ erro: 'Cliente informado não encontrado.' });
          return;
        }
        idCliente = idConvertido;
      }

      await VendaModel.atualizarCliente(idVenda, idCliente);
      const vendaAtualizada = await VendaModel.buscarPorId(idVenda);

      res.status(200).json({
        mensagem: 'Cliente da venda atualizado com sucesso.',
        venda: vendaAtualizada,
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente da venda:', error);
      res.status(500).json({ erro: 'Erro interno ao atualizar cliente da venda.' });
    }
  }

  static async adicionarItem(req: AuthRequest, res: Response): Promise<void> {
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

      if (venda.status !== 'aberta') {
        res.status(400).json({ erro: `Não é possível adicionar itens a uma venda com status "${venda.status}".` });
        return;
      }

      const idProduto = idValido(req.body?.id_produto);
      if (!idProduto) {
        res.status(400).json({ erro: 'ID do produto é obrigatório e deve ser válido.' });
        return;
      }

      const idVariacao = req.body?.id_variacao ? idValido(req.body.id_variacao) : null;

      const quantidade = Number(req.body?.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        res.status(400).json({ erro: 'A quantidade deve ser um número inteiro maior que zero.' });
        return;
      }

      const produto = await ProdutoModel.buscarPorId(idProduto);
      if (!produto || produto.ativo !== 1) {
        res.status(404).json({ erro: 'Produto não encontrado ou inativo.' });
        return;
      }

      // Validação de Estoque (pela variação específica ou pelo produto)
      const itemExistente = await VendaModel.buscarItemEspecifico(idVenda, idProduto, idVariacao);
      const quantidadeJaNaVenda = itemExistente ? itemExistente.quantidade : 0;
      const quantidadeTotalSolicitada = quantidadeJaNaVenda + quantidade;

      if (idVariacao) {
        const variacao = (produto.variacoes || []).find((v) => v.id_variacao === idVariacao);
        if (!variacao || variacao.ativo !== 1) {
          res.status(404).json({ erro: 'Variação de produto não encontrada ou inativa.' });
          return;
        }
        if (quantidadeTotalSolicitada > variacao.quantidade_estoque) {
          res.status(400).json({ erro: `Estoque insuficiente para a variação (${variacao.cor} / ${variacao.tamanho}). Disponível: ${variacao.quantidade_estoque}` });
          return;
        }
      } else {
        if (quantidadeTotalSolicitada > produto.quantidade_estoque) {
          res.status(400).json({ erro: 'Estoque insuficiente' });
          return;
        }
      }

      await VendaModel.adicionarOuAtualizarItem(
        idVenda,
        idProduto,
        quantidade,
        Number(produto.preco_unitario),
        idVariacao
      );

      const vendaAtualizada = await VendaModel.buscarPorId(idVenda);
      const itens = await VendaModel.buscarItens(idVenda);

      res.status(200).json({
        mensagem: 'Item adicionado à venda com sucesso.',
        venda: vendaAtualizada,
        itens,
      });
    } catch (error) {
      console.error('Erro ao adicionar item à venda:', error);
      res.status(500).json({ erro: 'Erro interno ao adicionar item à venda.' });
    }
  }

  static async removerItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idVenda = idValido(req.params.id);
      const idProduto = idValido(req.params.idProduto);
      const idVariacao = req.query.id_variacao ? idValido(req.query.id_variacao) : null;

      if (!idVenda || !idProduto) {
        res.status(400).json({ erro: 'IDs de venda e produto devem ser válidos.' });
        return;
      }

      const venda = await VendaModel.buscarPorId(idVenda);
      if (!venda) {
        res.status(404).json({ erro: 'Venda não encontrada.' });
        return;
      }

      if (venda.status !== 'aberta') {
        res.status(400).json({ erro: `Não é possível remover itens de uma venda com status "${venda.status}".` });
        return;
      }

      const removido = await VendaModel.removerItem(idVenda, idProduto, idVariacao);
      if (!removido) {
        res.status(404).json({ erro: 'Item não encontrado nesta venda.' });
        return;
      }

      const vendaAtualizada = await VendaModel.buscarPorId(idVenda);
      const itens = await VendaModel.buscarItens(idVenda);

      res.status(200).json({
        mensagem: 'Item removido da venda com sucesso.',
        venda: vendaAtualizada,
        itens,
      });
    } catch (error) {
      console.error('Erro ao remover item da venda:', error);
      res.status(500).json({ erro: 'Erro interno ao remover item da venda.' });
    }
  }

  static async aplicarDesconto(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idVenda = idValido(req.params.id);
      if (!idVenda) {
        res.status(400).json({ erro: 'ID da venda inválido.' });
        return;
      }

      const desconto = Number(req.body?.desconto);
      if (!Number.isFinite(desconto) || desconto < 0) {
        res.status(400).json({ erro: 'O valor do desconto deve ser um número maior ou igual a zero.' });
        return;
      }

      // Validação de Alçada: Se desconto > 0, verificar cargo do token
      if (desconto > 0) {
        const cargo = req.usuario?.cargo;
        if (cargo !== 'gerente') {
          res.status(403).json({ erro: 'Aplicação de desconto restrita a gerentes' });
          return;
        }
      }

      const venda = await VendaModel.buscarPorId(idVenda);
      if (!venda) {
        res.status(404).json({ erro: 'Venda não encontrada.' });
        return;
      }

      if (venda.status !== 'aberta') {
        res.status(400).json({ erro: `Não é possível aplicar desconto em uma venda "${venda.status}".` });
        return;
      }

      if (desconto > Number(venda.subtotal)) {
        res.status(400).json({ erro: 'O desconto não pode ser maior que o subtotal da venda.' });
        return;
      }

      await VendaModel.aplicarDesconto(idVenda, desconto);
      const vendaAtualizada = await VendaModel.buscarPorId(idVenda);

      res.status(200).json({
        mensagem: 'Desconto aplicado com sucesso.',
        venda: vendaAtualizada,
      });
    } catch (error: unknown) {
      console.error('Erro ao aplicar desconto:', error);
      res.status(500).json({ erro: 'Erro interno ao aplicar desconto.' });
    }
  }

  static async finalizar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idVenda = idValido(req.params.id);
      if (!idVenda) {
        res.status(400).json({ erro: 'ID da venda inválido.' });
        return;
      }

      const { forma_pagamento, parcelas, detalhes } = req.body ?? {};

      let dadosPagamento = undefined;
      if (forma_pagamento) {
        const formasValidas: FormaPagamento[] = ['pix', 'cartao_credito', 'cartao_debito', 'boleto'];
        if (!formasValidas.includes(forma_pagamento)) {
          res.status(400).json({
            erro: 'Forma de pagamento inválida. Escolha entre: pix, cartao_credito, cartao_debito ou boleto.',
          });
          return;
        }
        dadosPagamento = {
          forma_pagamento,
          parcelas: forma_pagamento === 'cartao_credito' ? Math.max(1, Number(parcelas) || 1) : 1,
          detalhes,
        };
      }

      const pagamento = await VendaModel.finalizarVenda(idVenda, dadosPagamento);
      const venda = await VendaModel.buscarPorId(idVenda);
      const itens = await VendaModel.buscarItens(idVenda);

      res.status(200).json({
        mensagem: 'Venda finalizada com sucesso.',
        venda,
        pagamento: pagamento ?? (await PagamentoModel.buscarPorVenda(idVenda)),
        itens,
      });
    } catch (error: unknown) {
      console.error('Erro ao finalizar venda:', error);
      const mensagem = error instanceof Error ? error.message : 'Erro interno ao finalizar venda.';
      res.status(400).json({ erro: mensagem });
    }
  }

  static async cancelar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const idVenda = idValido(req.params.id);
      if (!idVenda) {
        res.status(400).json({ erro: 'ID da venda inválido.' });
        return;
      }

      await VendaModel.cancelarVenda(idVenda);
      const venda = await VendaModel.buscarPorId(idVenda);

      res.status(200).json({
        mensagem: 'Venda cancelada com sucesso.',
        venda,
      });
    } catch (error: unknown) {
      console.error('Erro ao cancelar venda:', error);
      const mensagem = error instanceof Error ? error.message : 'Erro interno ao cancelar venda.';
      res.status(400).json({ erro: mensagem });
    }
  }

  static async listar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vendas = await VendaModel.listarHistorico();
      res.status(200).json(vendas);
    } catch (error) {
      console.error('Erro ao listar histórico de vendas:', error);
      res.status(500).json({ erro: 'Erro interno ao listar histórico de vendas.' });
    }
  }

  static async obter(req: AuthRequest, res: Response): Promise<void> {
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
      const pagamento = await PagamentoModel.buscarPorVenda(idVenda);
      const opcoes_pagamento =
        venda.status === 'aberta'
          ? PagamentoModel.gerarOpcoesPagamento(Number(venda.total), venda.id_venda)
          : undefined;

      res.status(200).json({
        venda,
        itens,
        pagamento,
        ...(opcoes_pagamento ? { opcoes_pagamento } : {}),
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error);
      res.status(500).json({ erro: 'Erro interno ao buscar detalhes da venda.' });
    }
  }

  static async relatorioLucro(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const relatorio = await VendaModel.listarRelatorioLucro();
      res.status(200).json(relatorio);
    } catch (error) {
      console.error('Erro ao gerar relatório de lucro das vendas:', error);
      res.status(500).json({ erro: 'Erro interno ao gerar relatório de lucros.' });
    }
  }

  static async historico(req: AuthRequest, res: Response): Promise<void> {
    return VendaController.relatorioLucro(req, res);
  }
}

