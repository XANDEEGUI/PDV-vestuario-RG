import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ProdutoModel, Produto, ProdutoDados } from '../models/ProdutoModel';
import { VariacaoEntrada, ProdutoVariacaoModel } from '../models/ProdutoVariacaoModel';
import { PagamentoModel } from '../models/PagamentoModel';
import { CategoriaModel } from '../models/CategoriaModel';

const PRECO_MAXIMO = 99999999.99;
const ESTOQUE_MAXIMO = 2147483647;

interface EntradaProduto {
  nome?: unknown;
  id_categoria?: unknown;
  codigo_barras?: unknown;
  tamanho?: unknown;
  cor?: unknown;
  preco_custo?: unknown;
  preco_unitario?: unknown;
  quantidade_estoque?: unknown;
  estoque_minimo?: unknown;
  variacoes?: unknown;
}

interface ResultadoValidacao {
  erro?: string;
  dados?: ProdutoDados;
  variacoes?: VariacaoEntrada[];
}

function textoOuNulo(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

function vazio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '';
}

function idValido(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function calcularMargemLucro(precoUnitario: number, precoCusto: number): number {
  if (precoUnitario <= 0) return 0;
  const margem = ((precoUnitario - precoCusto) / precoUnitario) * 100;
  return Number(margem.toFixed(2));
}

function anexarMargemLucro(produto: Produto): Produto {
  return {
    ...produto,
    margem_lucro: calcularMargemLucro(Number(produto.preco_unitario), Number(produto.preco_custo)),
  };
}

async function validarEntrada(entrada: EntradaProduto, produtoExistente?: Produto): Promise<ResultadoValidacao> {
  const nome = entrada.nome !== undefined ? textoOuNulo(entrada.nome) : produtoExistente?.nome;
  if (!nome) {
    return { erro: 'O nome do produto é obrigatório.' };
  }
  if (nome.length > 100) {
    return { erro: 'O nome deve ter no máximo 100 caracteres.' };
  }

  // Categoria
  let id_categoria: number | null = null;
  if (entrada.id_categoria !== undefined && entrada.id_categoria !== null) {
    const idCat = idValido(entrada.id_categoria);
    if (!idCat) {
      return { erro: 'ID da categoria inválido.' };
    }
    const catExiste = await CategoriaModel.buscarPorId(idCat);
    if (!catExiste) {
      return { erro: 'Categoria informada não encontrada.' };
    }
    id_categoria = idCat;
  } else if (produtoExistente) {
    id_categoria = produtoExistente.id_categoria ?? null;
  }

  // Preço de Custo
  const precoCustoEntrada =
    entrada.preco_custo !== undefined
      ? (vazio(entrada.preco_custo) ? 0 : Number(entrada.preco_custo))
      : (produtoExistente?.preco_custo ?? 0);

  const preco_custo = Math.round(precoCustoEntrada * 100) / 100;
  if (!Number.isFinite(preco_custo) || preco_custo < 0 || preco_custo > PRECO_MAXIMO) {
    return { erro: 'O preço de custo deve ser um número maior ou igual a zero.' };
  }

  // Preço Unitário
  if (entrada.preco_unitario === undefined && !produtoExistente) {
    return { erro: 'O preço unitário é obrigatório.' };
  }
  const precoUnitarioEntrada =
    entrada.preco_unitario !== undefined
      ? Number(entrada.preco_unitario)
      : Number(produtoExistente?.preco_unitario);

  const preco_unitario = Math.round(precoUnitarioEntrada * 100) / 100;
  if (!Number.isFinite(preco_unitario) || preco_unitario <= 0 || preco_unitario > PRECO_MAXIMO) {
    return { erro: 'O preço unitário deve ser um número maior que zero.' };
  }

  if (preco_unitario <= preco_custo) {
    return { erro: 'O preço unitário deve ser estritamente maior que o preço de custo.' };
  }

  // Estoque Mínimo
  const estoqueMinEntrada =
    entrada.estoque_minimo !== undefined
      ? (vazio(entrada.estoque_minimo) ? 5 : Number(entrada.estoque_minimo))
      : (produtoExistente?.estoque_minimo ?? 5);

  const estoque_minimo = Number(estoqueMinEntrada);
  if (!Number.isInteger(estoque_minimo) || estoque_minimo < 0 || estoque_minimo > ESTOQUE_MAXIMO) {
    return { erro: 'O estoque mínimo deve ser um número inteiro maior ou igual a zero.' };
  }

  // Validação das Variações de Grade (Cor e Tamanho)
  const variacoesValidadas: VariacaoEntrada[] = [];
  const codigosVistos = new Set<string>();
  const combinacoesVistas = new Set<string>();

  if (Array.isArray(entrada.variacoes) && entrada.variacoes.length > 0) {
    for (const v of entrada.variacoes) {
      if (typeof v !== 'object' || v === null) {
        return { erro: 'Cada variação deve ser um objeto válido.' };
      }

      const cor = textoOuNulo((v as any).cor);
      if (!cor) return { erro: 'A cor de cada variação é obrigatória.' };

      const tamanho = textoOuNulo((v as any).tamanho)?.toUpperCase();
      if (!tamanho) return { erro: 'O tamanho de cada variação é obrigatório.' };

      const chaveComb = `${cor.toLowerCase()}___${tamanho.toLowerCase()}`;
      if (combinacoesVistas.has(chaveComb)) {
        return { erro: `Variação duplicada com Cor "${cor}" e Tamanho "${tamanho}".` };
      }
      combinacoesVistas.add(chaveComb);

      const codigo_barras = textoOuNulo((v as any).codigo_barras);
      if (codigo_barras) {
        if (codigosVistos.has(codigo_barras)) {
          return { erro: `Código de barras duplicado na lista de variações: "${codigo_barras}".` };
        }
        codigosVistos.add(codigo_barras);

        // Verifica se o código de barras já está em uso no banco
        const existeVariacao = await ProdutoVariacaoModel.buscarPorCodigoBarras(codigo_barras);
        if (existeVariacao && (!produtoExistente || existeVariacao.id_produto !== produtoExistente.id_produto)) {
          return { erro: `Já existe um produto com o código de barras "${codigo_barras}".` };
        }
      }

      const qtd = Number((v as any).quantidade_estoque);
      const quantidade_estoque = Number.isInteger(qtd) && qtd >= 0 ? qtd : 0;

      variacoesValidadas.push({
        cor,
        tamanho,
        codigo_barras,
        quantidade_estoque,
      });
    }
  }

  const codigo_barras =
    entrada.codigo_barras !== undefined
      ? textoOuNulo(entrada.codigo_barras)
      : (produtoExistente?.codigo_barras ?? null);

  const dados: ProdutoDados = {
    nome,
    id_categoria,
    codigo_barras,
    tamanho: textoOuNulo(entrada.tamanho) || produtoExistente?.tamanho || null,
    cor: textoOuNulo(entrada.cor) || produtoExistente?.cor || null,
    preco_custo,
    preco_unitario,
    estoque_minimo,
    quantidade_estoque:
      variacoesValidadas.length > 0
        ? variacoesValidadas.reduce((acc, it) => acc + it.quantidade_estoque, 0)
        : Number(entrada.quantidade_estoque || produtoExistente?.quantidade_estoque || 0),
  };

  return {
    dados,
    variacoes: variacoesValidadas,
  };
}

export class ProdutoController {
  static async listar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : undefined;
      const idCategoria = req.query.id_categoria ? Number(req.query.id_categoria) : undefined;

      const produtos = await ProdutoModel.listar(busca, idCategoria);
      const produtosComMargem = produtos.map(anexarMargemLucro);
      res.status(200).json(produtosComMargem);
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({ erro: 'Erro interno ao listar produtos.' });
    }
  }

  static async obter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID inválido.' });
        return;
      }

      const produto = await ProdutoModel.buscarPorId(id);
      if (!produto) {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }

      const produtoComMargem = anexarMargemLucro(produto);
      const opcoesPagamento = PagamentoModel.gerarOpcoesPagamento(
        Number(produto.preco_unitario),
        produto.id_produto
      );

      res.status(200).json({
        ...produtoComMargem,
        opcoes_pagamento: opcoesPagamento,
      });
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({ erro: 'Erro interno ao buscar produto.' });
    }
  }

  static async alertaEstoque(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const produtos = await ProdutoModel.buscarAlertaEstoque();
      const produtosComMargem = produtos.map(anexarMargemLucro);
      res.status(200).json(produtosComMargem);
    } catch (error) {
      console.error('Erro ao consultar alerta de estoque:', error);
      res.status(500).json({ erro: 'Erro interno ao consultar alerta de estoque.' });
    }
  }

  static async criar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const resultado = await validarEntrada(req.body ?? {});
      if (resultado.erro || !resultado.dados) {
        res.status(400).json({ erro: resultado.erro });
        return;
      }

      const id = await ProdutoModel.criarComVariacoes(
        resultado.dados,
        resultado.variacoes || []
      );
      const produto = await ProdutoModel.buscarPorId(id);

      res.status(201).json({
        mensagem: 'Produto cadastrado com sucesso com suas variações de grade.',
        produto: produto ? anexarMargemLucro(produto) : null,
      });
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ erro: 'Código de barras já cadastrado em outra peça.' });
        return;
      }
      console.error('Erro ao cadastrar produto:', error);
      res.status(500).json({ erro: 'Erro interno ao cadastrar produto.' });
    }
  }

  static async atualizar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID inválido.' });
        return;
      }

      const existente = await ProdutoModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }

      const resultado = await validarEntrada(req.body ?? {}, existente);
      if (resultado.erro || !resultado.dados) {
        res.status(400).json({ erro: resultado.erro });
        return;
      }

      await ProdutoModel.atualizarComVariacoes(
        id,
        resultado.dados,
        resultado.variacoes
      );
      const produtoAtualizado = await ProdutoModel.buscarPorId(id);

      res.status(200).json({
        mensagem: 'Produto e variações atualizados com sucesso.',
        produto: produtoAtualizado ? anexarMargemLucro(produtoAtualizado) : null,
      });
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ erro: 'Código de barras já em uso.' });
        return;
      }
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({ erro: 'Erro interno ao atualizar produto.' });
    }
  }

  static async excluir(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID inválido.' });
        return;
      }

      const existente = await ProdutoModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }

      await ProdutoModel.desativar(id);
      res.status(200).json({ mensagem: 'Produto inativado com sucesso do acervo.' });
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      res.status(500).json({ erro: 'Erro interno ao excluir produto.' });
    }
  }

  static async obterOpcoesPagamento(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        res.status(400).json({ erro: 'ID de produto inválido.' });
        return;
      }

      const produto = await ProdutoModel.buscarPorId(id);
      if (!produto) {
        res.status(404).json({ erro: 'Produto não encontrado.' });
        return;
      }

      const opcoes = PagamentoModel.gerarOpcoesPagamento(
        Number(produto.preco_unitario),
        produto.id_produto
      );

      res.status(200).json({
        produto: {
          id_produto: produto.id_produto,
          nome: produto.nome,
          preco_unitario: Number(produto.preco_unitario),
        },
        pagamento: opcoes,
      });
    } catch (error) {
      console.error('Erro ao obter opções de pagamento:', error);
      res.status(500).json({ erro: 'Erro interno ao consultar opções de pagamento.' });
    }
  }
}
