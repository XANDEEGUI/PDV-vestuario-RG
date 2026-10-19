import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { PaymentModal } from '../components/PaymentModal';
import { SaleReceiptModal } from '../components/SaleReceiptModal';
import { GradeSelectorModal } from '../components/GradeSelectorModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { Produto, Cliente, Venda, ItemVenda, FormaPagamento, Categoria, ProdutoVariacao } from '../types';
import toast from 'react-hot-toast';

export default function PdvPage() {
  const { usuario } = useAuth();
  const isGerente = usuario?.cargo === 'gerente';

  // ── Estados Principais ──────────────────────────────────────────────
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<number | null>(null);

  // Venda ativa
  const [vendaAtiva, setVendaAtiva] = useState<Venda | null>(null);
  const [itensCarrinho, setItensCarrinho] = useState<ItemVenda[]>([]);

  // Desconto
  const [inputDesconto, setInputDesconto] = useState<string>('');
  const [isUpdatingDesconto, setIsUpdatingDesconto] = useState(false);

  // Modais
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [produtoParaGrade, setProdutoParaGrade] = useState<Produto | null>(null);
  const [vendaFinalizada, setVendaFinalizada] = useState<Venda | null>(null);
  const [itensFinalizados, setItensFinalizados] = useState<ItemVenda[]>([]);
  const [formaPagamentoFinal, setFormaPagamentoFinal] = useState<string>('');
  const [detalhesPagamentoFinal, setDetalhesPagamentoFinal] = useState<string>('');

  // Carregamentos
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(false);
  const [isProcessingItem, setIsProcessingItem] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Refs para atalhos
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const descontoInputRef = useRef<HTMLInputElement>(null);

  // ── Carrega Catálogo de Produtos e Clientes ─────────────────────────
  const carregarProdutos = useCallback(async (termo?: string) => {
    try {
      setIsLoadingProdutos(true);
      const url = termo ? `/produtos?busca=${encodeURIComponent(termo)}` : '/produtos';
      const { data } = await api.get<Produto[]>(url);
      setProdutos(data);
    } catch {
      toast.error('Erro ao carregar catálogo de produtos.');
    } finally {
      setIsLoadingProdutos(false);
    }
  }, []);

  const carregarClientes = useCallback(async () => {
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(data);
    } catch {
      // Ignora erro silenciosamente se ainda não houver clientes
    }
  }, []);

  const carregarCategorias = useCallback(async () => {
    try {
      const { data } = await api.get<Categoria[]>('/categorias');
      setCategorias(data);
    } catch {
      // Ignora erro silenciosamente
    }
  }, []);

  // ── Verifica se há venda aberta ou cria uma nova ─────────────────────
  const obterOuCriarVenda = useCallback(async (): Promise<Venda | null> => {
    if (vendaAtiva && vendaAtiva.status === 'aberta') {
      return vendaAtiva;
    }

    try {
      const { data } = await api.post<{ mensagem: string; venda: Venda }>('/vendas/abrir', {
        id_cliente: clienteSelecionado,
      });
      setVendaAtiva(data.venda);
      setItensCarrinho([]);
      setInputDesconto('0');
      return data.venda;
    } catch {
      toast.error('Erro ao abrir nova venda no caixa.');
      return null;
    }
  }, [vendaAtiva, clienteSelecionado]);

  // Carrega dados iniciais e busca vendas abertas
  useEffect(() => {
    carregarProdutos();
    carregarClientes();
    carregarCategorias();

    // Tenta recuperar última venda aberta
    api.get<Venda[]>('/vendas').then(async (res) => {
      const vendaAberta = res.data.find((v) => v.status === 'aberta');
      if (vendaAberta) {
        setVendaAtiva(vendaAberta);
        setClienteSelecionado(vendaAberta.id_cliente ?? null);
        setInputDesconto(String(vendaAberta.desconto || 0));

        // Carrega itens da venda
        try {
          const det = await api.get<{ venda: Venda; itens: ItemVenda[] }>(`/vendas/${vendaAberta.id_venda}`);
          setItensCarrinho(det.data.itens || []);
        } catch {
          // ignora
        }
      }
    }).catch(() => null);
  }, [carregarProdutos, carregarClientes, carregarCategorias]);

  // Debounce na busca de produtos
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarProdutos(busca.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, carregarProdutos]);

  // ── Atalhos de Teclado (F2, F4, F8) ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Foco na Busca
      if (e.key === 'F2') {
        e.preventDefault();
        buscaInputRef.current?.focus();
        buscaInputRef.current?.select();
      }

      // F4: Foco no Desconto
      if (e.key === 'F4') {
        e.preventDefault();
        if (isGerente) {
          descontoInputRef.current?.focus();
          descontoInputRef.current?.select();
        } else {
          toast.error('Aplicação de desconto restrita a gerentes.');
        }
      }

      // F8: Finalizar Venda
      if (e.key === 'F8') {
        e.preventDefault();
        if (itensCarrinho.length === 0) {
          toast.error('Adicione ao menos um item para finalizar a venda.');
          return;
        }
        setIsPaymentModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGerente, itensCarrinho.length]);

  // ── Adicionar Produto ao Carrinho ───────────────────────────────────
  const handleAdicionarProduto = async (
    produto: Produto,
    variacao: ProdutoVariacao | null = null,
    quantidade: number = 1
  ) => {
    const estoqueDisponivel = variacao ? variacao.quantidade_estoque : produto.quantidade_estoque;
    if (estoqueDisponivel <= 0) {
      toast.error('Combinação ou produto sem estoque disponível no momento.');
      return;
    }

    try {
      setIsProcessingItem(true);
      const venda = await obterOuCriarVenda();
      if (!venda) return;

      const { data } = await api.post<{
        mensagem: string;
        venda: Venda;
        itens: ItemVenda[];
      }>(`/vendas/${venda.id_venda}/itens`, {
        id_produto: produto.id_produto,
        id_variacao: variacao?.id_variacao || null,
        quantidade,
      });

      setVendaAtiva(data.venda);
      setItensCarrinho(data.itens);
      setInputDesconto(String(data.venda.desconto || 0));

      const desc = variacao
        ? `${produto.nome} (${variacao.cor} - Tam ${variacao.tamanho})`
        : produto.nome;
      toast.success(`${desc} adicionado ao caixa.`);

      // Atualiza catálogo localmente para refletir estoque decrementado
      setProdutos((prev) =>
        prev.map((p) => {
          if (p.id_produto !== produto.id_produto) return p;
          const novoEstoque = Math.max(0, p.quantidade_estoque - quantidade);
          const novasVariacoes = p.variacoes?.map((v) =>
            v.id_variacao === variacao?.id_variacao
              ? { ...v, quantidade_estoque: Math.max(0, v.quantidade_estoque - quantidade) }
              : v
          );
          return {
            ...p,
            quantidade_estoque: novoEstoque,
            variacoes: novasVariacoes,
          };
        })
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao adicionar produto.';
      toast.error(msg);
    } finally {
      setIsProcessingItem(false);
    }
  };

  // Se o usuário digitar Enter no campo de busca (leitor de código de barras)
  const handleBuscaKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busca.trim()) {
      e.preventDefault();
      const termo = busca.trim().toLowerCase();

      // 1. Procura se é o código de barras de alguma variação específica
      for (const prod of produtos) {
        const varMatch = prod.variacoes?.find(
          (v) => v.codigo_barras?.toLowerCase() === termo
        );
        if (varMatch) {
          await handleAdicionarProduto(prod, varMatch, 1);
          setBusca('');
          return;
        }
      }

      // 2. Procura correspondência exata do produto pai
      const matchPai = produtos.find(
        (p) => p.codigo_barras?.toLowerCase() === termo
      );

      if (matchPai) {
        if (matchPai.variacoes && matchPai.variacoes.length > 0) {
          setProdutoParaGrade(matchPai);
          setIsGradeModalOpen(true);
        } else {
          await handleAdicionarProduto(matchPai, null, 1);
        }
        setBusca('');
        return;
      }

      // 3. Primeiro resultado textual
      const matchTexto = produtos[0];
      if (matchTexto) {
        if (matchTexto.variacoes && matchTexto.variacoes.length > 0) {
          setProdutoParaGrade(matchTexto);
          setIsGradeModalOpen(true);
        } else {
          await handleAdicionarProduto(matchTexto, null, 1);
        }
        setBusca('');
      } else {
        toast.error('Nenhum produto encontrado com o código informado.');
      }
    }
  };

  // ── Remover Item do Carrinho ────────────────────────────────────────
  const handleRemoverItem = async (idProduto: number, idVariacao?: number | null) => {
    if (!vendaAtiva) return;

    try {
      setIsProcessingItem(true);
      const url = idVariacao
        ? `/vendas/${vendaAtiva.id_venda}/itens/${idProduto}?id_variacao=${idVariacao}`
        : `/vendas/${vendaAtiva.id_venda}/itens/${idProduto}`;

      const { data } = await api.delete<{
        mensagem: string;
        venda: Venda;
        itens: ItemVenda[];
      }>(url);

      setVendaAtiva(data.venda);
      setItensCarrinho(data.itens);
      toast.success('Item removido da venda.');
      carregarProdutos(busca.trim());
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao remover item.';
      toast.error(msg);
    } finally {
      setIsProcessingItem(false);
    }
  };

  // ── Alterar Quantidade de Item no Carrinho (+ ou -) ─────────────────
  const handleAlterarQuantidade = async (item: ItemVenda, delta: number) => {
    if (!vendaAtiva) return;

    if (delta < 0 && item.quantidade <= 1) {
      handleRemoverItem(item.id_produto, item.id_variacao);
      return;
    }

    try {
      setIsProcessingItem(true);
      if (delta > 0) {
        // Adiciona +1
        const { data } = await api.post<{
          mensagem: string;
          venda: Venda;
          itens: ItemVenda[];
        }>(`/vendas/${vendaAtiva.id_venda}/itens`, {
          id_produto: item.id_produto,
          id_variacao: item.id_variacao || null,
          quantidade: 1,
        });
        setVendaAtiva(data.venda);
        setItensCarrinho(data.itens);
      } else {
        // Para decrementar no backend: remove e readiciona a quantidade desejada
        const urlDel = item.id_variacao
          ? `/vendas/${vendaAtiva.id_venda}/itens/${item.id_produto}?id_variacao=${item.id_variacao}`
          : `/vendas/${vendaAtiva.id_venda}/itens/${item.id_produto}`;
        await api.delete(urlDel);
        const novaQtd = item.quantidade - 1;
        if (novaQtd > 0) {
          const { data } = await api.post<{
            mensagem: string;
            venda: Venda;
            itens: ItemVenda[];
          }>(`/vendas/${vendaAtiva.id_venda}/itens`, {
            id_produto: item.id_produto,
            id_variacao: item.id_variacao || null,
            quantidade: novaQtd,
          });
          setVendaAtiva(data.venda);
          setItensCarrinho(data.itens);
        } else {
          const det = await api.get<{ venda: Venda; itens: ItemVenda[] }>(`/vendas/${vendaAtiva.id_venda}`);
          setVendaAtiva(det.data.venda);
          setItensCarrinho(det.data.itens || []);
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao alterar quantidade.';
      toast.error(msg);
    } finally {
      setIsProcessingItem(false);
    }
  };

  // ── Atualizar Cliente da Venda ──────────────────────────────────────
  const handleMudarCliente = async (idCliente: number | null) => {
    setClienteSelecionado(idCliente);
    if (!vendaAtiva) return;

    try {
      const { data } = await api.put<{ venda: Venda }>(`/vendas/${vendaAtiva.id_venda}/cliente`, {
        id_cliente: idCliente,
      });
      setVendaAtiva(data.venda);
      toast.success('Cliente associado à venda.');
    } catch {
      toast.error('Erro ao vincular cliente.');
    }
  };

  // ── Aplicar Desconto (Trava de Gerente) ──────────────────────────────
  const handleAplicarDesconto = async () => {
    if (!vendaAtiva) return;

    if (!isGerente) {
      toast.error('Aplicação de desconto restrita a gerentes.');
      return;
    }

    const valorDesconto = Number(inputDesconto.replace(',', '.'));
    if (isNaN(valorDesconto) || valorDesconto < 0) {
      toast.error('Insira um valor de desconto válido.');
      return;
    }

    if (valorDesconto > Number(vendaAtiva.subtotal)) {
      toast.error('O desconto não pode ser maior que o subtotal da venda.');
      return;
    }

    try {
      setIsUpdatingDesconto(true);
      const { data } = await api.post<{ mensagem: string; venda: Venda }>(
        `/vendas/${vendaAtiva.id_venda}/desconto`,
        { desconto: valorDesconto }
      );
      setVendaAtiva(data.venda);
      toast.success('Desconto aplicado com sucesso!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao aplicar desconto.';
      toast.error(msg);
    } finally {
      setIsUpdatingDesconto(false);
    }
  };

  // ── Cancelar Venda Atual ────────────────────────────────────────────
  const handleCancelarVenda = async () => {
    if (!vendaAtiva) return;

    const confirmou = window.confirm('Tem certeza de que deseja cancelar esta venda? Todos os itens serão descartados.');
    if (!confirmou) return;

    try {
      await api.post(`/vendas/${vendaAtiva.id_venda}/cancelar`);
      toast.success('Venda cancelada.');
      setVendaAtiva(null);
      setItensCarrinho([]);
      setInputDesconto('0');
      setClienteSelecionado(null);
      carregarProdutos(busca.trim());
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao cancelar venda.';
      toast.error(msg);
    }
  };

  // ── Finalizar Venda com Pagamento Selecionado ─────────────────────────
  const handleConfirmarPagamento = async (
    forma: FormaPagamento,
    parcelas: number,
    detalhes?: string
  ) => {
    if (!vendaAtiva) return;

    try {
      setIsFinalizing(true);
      const { data } = await api.post<{
        mensagem: string;
        venda: Venda;
        itens: ItemVenda[];
      }>(`/vendas/${vendaAtiva.id_venda}/finalizar`, {
        forma_pagamento: forma,
        parcelas,
        detalhes,
      });

      toast.success('Venda concluída com sucesso!');
      setIsPaymentModalOpen(false);

      // Prepara e abre recibo
      setVendaFinalizada(data.venda);
      setItensFinalizados(data.itens || itensCarrinho);
      setFormaPagamentoFinal(forma.replace('_', ' ').toUpperCase());
      setDetalhesPagamentoFinal(detalhes || '');
      setIsReceiptModalOpen(true);

      // Limpa venda ativa
      setVendaAtiva(null);
      setItensCarrinho([]);
      setInputDesconto('0');
      setClienteSelecionado(null);

      // Atualiza estoque no catálogo
      carregarProdutos();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao finalizar venda.';
      toast.error(msg);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Valores calculados
  const subtotal = Number(vendaAtiva?.subtotal || 0);
  const desconto = Number(vendaAtiva?.desconto || 0);
  const total = Number(vendaAtiva?.total || 0);

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans select-none">
      <Navbar />

      {/* ── Subheader de Atalhos e Status do Caixa ───────────────────── */}
      <div className="bg-surface border-b border-border px-4 py-2 flex items-center justify-between text-xs text-navy-muted">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium text-navy-deep">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Caixa Operacional
          </span>
          {vendaAtiva && (
            <span className="badge-gold">
              Venda #{String(vendaAtiva.id_venda).padStart(5, '0')}
            </span>
          )}
        </div>

        {/* Badges de Atalhos */}
        <div className="hidden sm:flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-mono text-[10px] text-navy-deep shadow-xs">
              F2
            </kbd>{' '}
            Busca / Leitor
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-mono text-[10px] text-navy-deep shadow-xs">
              F4
            </kbd>{' '}
            Desconto
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-border rounded font-mono text-[10px] text-navy-deep shadow-xs">
              F8
            </kbd>{' '}
            Finalizar
          </span>
        </div>
      </div>

      {/* ── Split Layout Principal: Catálogo (Esq) & Carrinho (Dir) ──── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LADO ESQUERDO: Catálogo & Busca de Produtos (7 cols) ───── */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Campo de Busca / Leitor de Código de Barras */}
          <div className="card-luxury p-4 space-y-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-muted/60 pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                ref={buscaInputRef}
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={handleBuscaKeyDown}
                placeholder="Buscar por Nome, Código de Barras ou Cor (F2)..."
                className="input-luxury pl-11 pr-20 py-3 text-sm"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface border border-border text-[10px] font-mono text-navy-muted uppercase font-semibold">
                F2
              </span>
            </div>
            <p className="text-[11px] text-slate-500 pl-1">
              Dica: Digite ou escaneie o código de barras e aperte <kbd className="font-semibold text-navy-deep">Enter</kbd> para adicionar instantaneamente.
            </p>
          </div>

          {/* Vitrine Visual de Produtos */}
          <div className="card-luxury p-5 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-border/80 pb-3">
              <div>
                <h3 className="font-serif text-lg text-navy-deep font-medium">
                  Vitrine da Boutique
                </h3>
                <p className="text-xs text-navy-muted">
                  {produtos.length} peças disponíveis no catálogo
                </p>
              </div>

              {isLoadingProdutos && (
                <span className="text-xs text-gold flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  Atualizando...
                </span>
              )}
            </div>

            {/* Chips Superiores de Categorias */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
              <button
                type="button"
                onClick={() => setCategoriaAtiva(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap border ${
                  categoriaAtiva === null
                    ? 'bg-navy-deep text-white border-gold shadow-luxury ring-1 ring-gold/40'
                    : 'bg-surface text-navy-muted border-border hover:border-gold/40 hover:bg-white'
                }`}
              >
                Todas ({produtos.length})
              </button>
              {categorias.map((cat) => {
                const count = produtos.filter((p) => p.id_categoria === cat.id_categoria).length;
                const isActive = categoriaAtiva === cat.id_categoria;
                return (
                  <button
                    key={cat.id_categoria}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat.id_categoria)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap border ${
                      isActive
                        ? 'bg-navy-deep text-white border-gold shadow-luxury ring-1 ring-gold/40'
                        : 'bg-surface text-navy-muted border-border hover:border-gold/40 hover:bg-white'
                    }`}
                  >
                    {cat.nome} {count > 0 && <span className="opacity-70 font-mono text-[10px]">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Grid de Cards de Luxo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[560px] pr-1 scrollbar-luxury">
              {produtos
                .filter((p) => (categoriaAtiva !== null ? p.id_categoria === categoriaAtiva : true))
                .map((produto) => {
                  const emEstoque = produto.quantidade_estoque > 0;
                  const estoqueBaixo = emEstoque && produto.quantidade_estoque <= produto.estoque_minimo;
                  const preco = Number(produto.preco_unitario || produto.preco_venda || 0);
                  const temGrade = produto.variacoes && produto.variacoes.length > 0;

                  const handleClickCard = () => {
                    if (!emEstoque || isProcessingItem) return;
                    if (temGrade) {
                      setProdutoParaGrade(produto);
                      setIsGradeModalOpen(true);
                    } else {
                      handleAdicionarProduto(produto, null, 1);
                    }
                  };

                  return (
                    <div
                      key={produto.id_produto}
                      onClick={handleClickCard}
                      className={`group relative rounded-lg border p-4 bg-white transition-all duration-200 flex flex-col justify-between ${
                        emEstoque
                          ? 'cursor-pointer hover:border-gold hover:shadow-luxury hover:-translate-y-0.5 border-border'
                          : 'opacity-50 border-border bg-slate-50 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        {/* Topo do Card: Grade e Estoque */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-sans font-semibold tracking-wider uppercase text-navy-muted bg-surface px-2 py-0.5 rounded border border-border">
                            {produto.nome_categoria || (temGrade ? `${produto.variacoes?.length} variações` : 'Peça Única')}
                          </span>

                          {estoqueBaixo ? (
                            <span className="badge-gold !text-[9px]">
                              Estoque Mínimo ({produto.quantidade_estoque})
                            </span>
                          ) : emEstoque ? (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {produto.quantidade_estoque} un.
                            </span>
                          ) : (
                            <span className="text-[10px] text-danger font-semibold uppercase">
                              Esgotado
                            </span>
                          )}
                        </div>

                        {/* Nome do Produto */}
                        <h4 className="font-sans font-semibold text-sm text-navy-deep line-clamp-1 group-hover:text-gold transition-colors">
                          {produto.nome}
                        </h4>

                        {/* Grade Resumo */}
                        {temGrade ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(produto.variacoes?.map((v) => v.tamanho))).map((tam) => (
                              <span key={tam} className="text-[9px] font-bold text-navy-deep bg-surface border border-border rounded px-1.5 py-0.2">
                                {tam}
                              </span>
                            ))}
                            <span className="text-[9px] text-gold font-semibold self-center ml-1">
                              • Selecionar Grade
                            </span>
                          </div>
                        ) : (
                          produto.codigo_barras && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              #{produto.codigo_barras}
                            </p>
                          )
                        )}
                      </div>

                      {/* Rodapé do Card: Preço e Botão Adicionar */}
                      <div className="flex items-end justify-between mt-4 pt-3 border-t border-border/50">
                        <div>
                          <span className="text-[10px] font-sans uppercase text-navy-muted block">
                            Preço Unit.
                          </span>
                          <span className="font-serif text-base text-navy-deep font-bold">
                            R$ {preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!emEstoque || isProcessingItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickCard();
                          }}
                          className={`h-8 px-2.5 rounded-full flex items-center justify-center text-xs font-bold gap-1 transition-all ${
                            emEstoque
                              ? 'bg-navy-deep text-white group-hover:bg-gold group-hover:text-navy-deep shadow-xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                          title={temGrade ? 'Escolher Cor e Tamanho' : 'Adicionar ao Carrinho'}
                        >
                          {temGrade ? (
                            <>
                              <span className="text-gold group-hover:text-navy-deep">✦</span>
                              <span>Grade</span>
                            </>
                          ) : (
                            <span>+</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {produtos.length === 0 && !isLoadingProdutos && (
                <div className="col-span-2 text-center py-12 text-slate-400">
                  <p className="font-serif text-lg text-navy-muted">Nenhum produto encontrado</p>
                  <p className="text-xs mt-1">Tente ajustar os termos da sua pesquisa.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── LADO DIREITO: Carrinho do Caixa & Fechamento (5 cols) ──── */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Card Principal do Carrinho */}
          <div className="card-luxury p-5 flex-1 flex flex-col justify-between">

            <div>
              {/* Header do Caixa e Seletor de Cliente */}
              <div className="border-b border-border pb-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg text-navy-deep font-medium">
                      Carrinho do Caixa
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-xs font-semibold">
                      {itensCarrinho.reduce((acc, it) => acc + it.quantidade, 0)} itens
                    </span>
                  </div>

                  {itensCarrinho.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCancelarVenda}
                      className="text-xs text-danger hover:underline transition-colors"
                    >
                      Cancelar Venda
                    </button>
                  )}
                </div>

                {/* Seletor de Cliente */}
                <div>
                  <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-navy-muted block mb-1">
                    Cliente / CPF na Nota
                  </label>
                  <select
                    value={clienteSelecionado ?? ''}
                    onChange={(e) => handleMudarCliente(e.target.value ? Number(e.target.value) : null)}
                    className="input-luxury !py-2 text-xs bg-surface cursor-pointer"
                  >
                    <option value="">Consumidor Final (Não identificado)</option>
                    {clientes.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nome} {c.cpf ? `(CPF: ${c.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabela dos Itens no Carrinho */}
              <div className="overflow-y-auto max-h-[300px] scrollbar-luxury divide-y divide-border/60">
                {itensCarrinho.map((item) => (
                  <div
                    key={item.id_item || `${item.id_produto}_${item.id_variacao || 'padrao'}`}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-semibold text-xs text-navy-deep truncate">
                        {item.nome_produto || `Item #${item.id_produto}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(item.cor || item.tamanho) && (
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-navy-deep bg-surface px-1.5 py-0.2 rounded border border-border">
                            {item.cor || 'Único'} • {item.tamanho || 'U'}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          R$ {Number(item.preco_unitario).toFixed(2)} cada
                        </span>
                      </div>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex items-center gap-1.5 bg-surface border border-border rounded px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item, -1)}
                        disabled={isProcessingItem}
                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-navy-deep hover:bg-white transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-semibold text-navy-deep">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item, +1)}
                        disabled={isProcessingItem}
                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-navy-deep hover:bg-white transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal do Item */}
                    <div className="text-right w-20">
                      <span className="font-serif text-xs font-semibold text-navy-deep block">
                        R$ {Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>

                    {/* Remover */}
                    <button
                      type="button"
                      onClick={() => handleRemoverItem(item.id_produto, item.id_variacao)}
                      disabled={isProcessingItem}
                      className="text-slate-400 hover:text-danger p-1 rounded transition-colors"
                      title="Remover item"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {itensCarrinho.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <div className="w-10 h-10 mx-auto mb-2 text-slate-300">
                      🛒
                    </div>
                    <p className="font-serif text-sm text-navy-muted">
                      Carrinho do caixa vazio
                    </p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Selecione itens no catálogo ao lado ou passe o código de barras no leitor.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── PAINEL INFERIOR DE FECHAMENTO ───────────────────────── */}
            <div className="border-t border-border pt-4 mt-4 space-y-3">

              {/* Subtotal */}
              <div className="flex items-center justify-between text-xs text-navy-muted">
                <span>Subtotal:</span>
                <span className="font-serif text-sm text-navy-deep font-medium">
                  R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Campo de Desconto com Trava de Permissão */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-navy-muted flex items-center gap-1.5">
                    <span>Desconto (F4)</span>
                    {!isGerente && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        🔒 Restrito a Gerente
                      </span>
                    )}
                  </span>
                  {desconto > 0 && (
                    <span className="font-serif text-xs text-danger font-semibold">
                      - R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      R$
                    </span>
                    <input
                      ref={descontoInputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!isGerente || itensCarrinho.length === 0 || isUpdatingDesconto}
                      value={inputDesconto}
                      onChange={(e) => setInputDesconto(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAplicarDesconto()}
                      placeholder={isGerente ? '0,00' : 'Apenas Gerente'}
                      className={`input-luxury !py-2 pl-8 text-xs ${
                        !isGerente ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {isGerente && (
                    <button
                      type="button"
                      onClick={handleAplicarDesconto}
                      disabled={itensCarrinho.length === 0 || isUpdatingDesconto}
                      className="px-3 py-2 rounded border border-gold text-xs font-semibold text-gold hover:bg-gold hover:text-navy-deep transition-all"
                    >
                      {isUpdatingDesconto ? '...' : 'Aplicar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Total Geral em Destaque Serifado e Dourado Champagne */}
              <div className="p-4 rounded-lg bg-navy-deep border border-gold/30 shadow-luxury flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-sans uppercase tracking-[0.25em] text-gold block font-semibold">
                    Total Geral
                  </span>
                  <span className="text-[11px] text-slate-400">
                    À vista ou parcelado
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-serif text-3xl font-bold text-gold tracking-tight">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Botão Finalizar Venda (F8) */}
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={itensCarrinho.length === 0 || isFinalizing}
                className="btn-primary w-full py-4 text-base font-bold !bg-navy-deep !text-white border border-gold/50 shadow-luxury flex items-center justify-center gap-2 group hover:!border-gold transition-all"
              >
                <span className="text-gold group-hover:scale-110 transition-transform">✓</span>
                <span>Finalizar Venda</span>
                <span className="ml-2 px-2 py-0.5 rounded bg-gold/20 text-gold text-xs font-mono">
                  F8
                </span>
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* ── Modal da Tabela de Pagamentos ────────────────────────────── */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        subtotal={subtotal}
        desconto={desconto}
        idVenda={vendaAtiva?.id_venda ?? null}
        onConfirmar={handleConfirmarPagamento}
        isLoading={isFinalizing}
      />

      {/* ── Modal do Comprovante de Venda Concluída ──────────────────── */}
      <SaleReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          buscaInputRef.current?.focus();
        }}
        venda={vendaFinalizada}
        itens={itensFinalizados}
        formaPagamentoNome={formaPagamentoFinal}
        detalhesPagamento={detalhesPagamentoFinal}
      />

      {/* ── Modal Seletor de Grade (Cores e Tamanhos) ───────────────── */}
      <GradeSelectorModal
        isOpen={isGradeModalOpen}
        onClose={() => {
          setIsGradeModalOpen(false);
          setProdutoParaGrade(null);
        }}
        produto={produtoParaGrade}
        onAdicionar={handleAdicionarProduto}
      />

    </div>
  );
}