import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { formatarCpf } from '../utils/formatters';
import api from '../services/api';
import type { RelatorioLucroGeral } from '../types';
import toast from 'react-hot-toast';

export default function HistoricoVendasPage() {
  const [relatorio, setRelatorio] = useState<RelatorioLucroGeral | null>(null);
  const [busca, setBusca] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('todos');
  const [vendasExpandidas, setVendasExpandidas] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // ── Carregar Dados do Relatório de Lucro ─────────────────────────────
  const carregarRelatorio = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get<RelatorioLucroGeral>('/vendas/historico');
      setRelatorio(data);

      // Por padrão, expande a venda mais recente
      if (data.vendas && data.vendas.length > 0) {
        setVendasExpandidas({ [data.vendas[0].id_venda]: true });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao carregar histórico de vendas e lucros.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarRelatorio();
  }, [carregarRelatorio]);

  // Alternar expansão de detalhes de uma venda
  const toggleExpandir = (idVenda: number) => {
    setVendasExpandidas((prev) => ({
      ...prev,
      [idVenda]: !prev[idVenda],
    }));
  };

  // Alternar expandir todas
  const handleToggleTodas = () => {
    if (!relatorio) return;
    const todasExpandidas = relatorio.vendas.every((v) => vendasExpandidas[v.id_venda]);
    const novoEstado: Record<number, boolean> = {};
    relatorio.vendas.forEach((v) => {
      novoEstado[v.id_venda] = !todasExpandidas;
    });
    setVendasExpandidas(novoEstado);
  };

  // Lista de vendedores únicos para filtro
  const listaVendedores = Array.from(
    new Set((relatorio?.vendas || []).map((v) => v.nome_usuario).filter(Boolean))
  ) as string[];

  // Filtragem das vendas
  const vendasFiltradas = (relatorio?.vendas || []).filter((venda) => {
    // Filtro por vendedor
    if (vendedorFiltro !== 'todos' && venda.nome_usuario !== vendedorFiltro) {
      return false;
    }

    // Busca textual por Cliente, CPF ou Produto
    if (!busca.trim()) return true;

    const termo = busca.trim().toLowerCase();
    const nomeCliente = (venda.nome_cliente || 'cliente não identificado / avulso').toLowerCase();
    const cpfCliente = (venda.cpf_cliente || '').replace(/\D/g, '');
    const nomeVendedor = (venda.nome_usuario || '').toLowerCase();
    const temProduto = (venda.itens || []).some((it) =>
      (it.nome_produto || '').toLowerCase().includes(termo)
    );

    return (
      nomeCliente.includes(termo) ||
      cpfCliente.includes(termo.replace(/\D/g, '')) ||
      nomeVendedor.includes(termo) ||
      temProduto
    );
  });

  const resumo = relatorio?.resumo;

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans select-none">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Cabeçalho da Página ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-sans font-semibold tracking-[0.3em] uppercase text-gold">
                Performance Financeira
              </span>
              <span className="badge-gold !text-[9px]">Gerente & Vendedor</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-navy-deep">
              Histórico de Vendas & Lucratividade
            </h1>
            <p className="text-xs text-navy-muted font-sans mt-0.5">
              Acompanhamento de vendas, identificação de clientes e apuração de lucro líquido real e margem percentual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleTodas}
              className="px-4 py-2 rounded border border-border bg-white text-xs font-semibold text-navy-deep hover:bg-surface transition-colors shadow-xs"
            >
              Expandir / Recolher Todas
            </button>
            <button
              type="button"
              onClick={carregarRelatorio}
              disabled={isLoading}
              className="p-2 rounded border border-border bg-white text-navy-muted hover:text-navy-deep transition-colors"
              title="Atualizar dados"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={isLoading ? 'animate-spin' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Cards de Métricas no Topo (Destaque Dourado Champagne) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Faturamento Total (R$) */}
          <div className="card-luxury p-5 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Faturamento Total (R$)
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-serif text-2xl sm:text-3xl text-navy-deep font-bold">
                R$ {(resumo?.total_faturado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400 font-sans">
                {resumo?.quantidade_vendas || 0} finalizadas
              </span>
            </div>
          </div>

          {/* Custo Total (R$) */}
          <div className="card-luxury p-5 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Custo Total (R$)
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-serif text-2xl sm:text-3xl text-slate-600 font-bold">
                R$ {(resumo?.total_custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400 font-sans">
                custo de aquisição
              </span>
            </div>
          </div>

          {/* Lucro Total (R$ e %) em Destaque Dourado Champagne */}
          <div className="card-luxury p-5 flex flex-col justify-between border-gold bg-gradient-to-br from-white via-gold/5 to-gold/15 shadow-luxury">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans uppercase tracking-widest text-gold font-bold">
                Lucro Total (R$ e %)
              </span>
              <span className="badge-gold !text-[9px] !bg-gold/25 !text-navy-deep font-bold">
                +{resumo?.margem_geral_porcentagem || 0}%
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-serif text-2xl sm:text-3xl text-gold font-bold">
                + R$ {(resumo?.total_lucro || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-emerald-800 font-bold">
                +{resumo?.margem_geral_porcentagem || 0}% margem
              </span>
            </div>
          </div>

        </div>

        {/* ── Filtros e Barra de Pesquisa ───────────────────────────── */}
        <div className="card-luxury p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-muted/60 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por Cliente, CPF ou Peça..."
              className="input-luxury pl-10 py-2.5 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filtro de Vendedor */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-navy-muted font-medium whitespace-nowrap">Vendedor:</span>
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="input-luxury !py-2 text-xs bg-surface cursor-pointer w-full sm:w-44"
              >
                <option value="todos">Todos os Vendedores</option>
                {listaVendedores.map((vend) => (
                  <option key={vend} value={vend}>
                    {vend}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-navy-muted whitespace-nowrap hidden lg:inline">
              {vendasFiltradas.length} {vendasFiltradas.length === 1 ? 'venda' : 'vendas'}
            </span>
          </div>
        </div>

        {/* ── Lista de Vendas com Lucro e Itens (Accordion) ─────────── */}
        <div className="space-y-4">
          {vendasFiltradas.map((venda) => {
            const isExpandida = !!vendasExpandidas[venda.id_venda];
            const dataFormatada = venda.data_venda
              ? new Date(venda.data_venda).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';

            return (
              <div
                key={venda.id_venda}
                className="card-luxury overflow-hidden transition-all duration-200 border-border hover:border-gold/50"
              >
                {/* ── Linha Principal da Venda (Clicável) ──────────────── */}
                <div
                  onClick={() => toggleExpandir(venda.id_venda)}
                  className="p-5 cursor-pointer bg-white hover:bg-surface/40 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  {/* Identificação da Venda & Data */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-10 h-10 rounded-md bg-navy-deep text-gold flex items-center justify-center font-serif text-sm font-bold border border-gold/30">
                      #{String(venda.id_venda).padStart(4, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-semibold text-navy-deep">
                          Venda #{venda.id_venda}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800">
                          {venda.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {dataFormatada} • Atendido por: <strong className="text-navy-deep">{venda.nome_usuario || 'Vendedor'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Identificação do Cliente Comprador */}
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div className="w-8 h-8 rounded-full bg-gold/15 text-gold border border-gold/30 flex items-center justify-center font-serif text-xs font-bold">
                      {venda.nome_cliente ? venda.nome_cliente.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <span className="text-[10px] font-sans uppercase tracking-wider text-navy-muted block">
                        Cliente Comprador
                      </span>
                      <span className="font-sans font-semibold text-xs text-navy-deep">
                        {venda.nome_cliente || 'Consumidor Final (Sem cadastro)'}
                      </span>
                      {venda.cpf_cliente && (
                        <p className="text-[10px] font-mono text-slate-500">
                          CPF: {formatarCpf(venda.cpf_cliente)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Resumo Financeiro da Venda */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-border/60">
                    {/* Total Faturado */}
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-navy-muted block">
                        Total Pago
                      </span>
                      <span className="font-serif text-sm font-semibold text-navy-deep">
                        R$ {Number(venda.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Lucro da Venda em R$ e % */}
                    <div className="text-right min-w-[130px]">
                      <span className="text-[10px] uppercase tracking-wider text-gold font-bold block">
                        Lucro Líquido
                      </span>
                      <div className="flex items-baseline justify-end gap-1.5">
                        <span className="font-serif text-base font-bold text-emerald-700">
                          + R$ {Number(venda.lucro_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] font-semibold text-gold">
                          (+{venda.margem_lucro_total}%)
                        </span>
                      </div>
                    </div>

                    {/* Ícone de Expansão */}
                    <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-navy-muted text-xs transition-transform duration-200">
                      {isExpandida ? '▲' : '▼'}
                    </div>
                  </div>
                </div>

                {/* ── Área Expandida: Detalhamento dos Itens e Frases de Lucro ── */}
                {isExpandida && (
                  <div className="border-t border-border bg-surface/40 p-5 space-y-4 animate-fadeIn">

                    <div className="flex items-center justify-between border-b border-border/80 pb-2">
                      <h4 className="font-serif text-sm font-medium text-navy-deep flex items-center gap-2">
                        <span>Peças Adquiridas nesta Venda</span>
                        <span className="text-xs text-navy-muted font-sans">
                          ({venda.itens.length} {venda.itens.length === 1 ? 'item' : 'itens'})
                        </span>
                      </h4>
                      {venda.forma_pagamento && (
                        <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-navy-muted bg-white px-2 py-0.5 rounded border">
                          Pagamento: {venda.forma_pagamento.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Lista com as Frases de Lucro e Tabela */}
                    <div className="grid grid-cols-1 gap-3">
                      {venda.itens.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-white border border-border shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                        >
                          {/* Frase Resumo em Destaque */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-5 h-5 rounded bg-gold/15 text-gold text-[10px] font-bold flex items-center justify-center">
                                {item.quantidade}x
                              </span>
                              <span className="font-sans font-bold text-xs text-navy-deep">
                                {item.nome_produto || `Peça #${item.id_produto}`}
                              </span>
                              {item.codigo_barras && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  #{item.codigo_barras}
                                </span>
                              )}
                            </div>

                            {/* A frase de resumo solicitada */}
                            <p className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1 inline-block mt-0.5">
                              {item.frase_resumo}
                            </p>
                          </div>

                          {/* Comparativo de Custo vs Venda do Item */}
                          <div className="flex items-center gap-4 text-xs font-sans text-right self-end md:self-auto border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                            <div>
                              <span className="text-[10px] uppercase text-navy-muted block">
                                Custo ({item.quantidade}x un.)
                              </span>
                              <span className="font-serif text-slate-500">
                                R$ {Number(item.custo_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase text-navy-muted block">
                                Faturado
                              </span>
                              <span className="font-serif font-semibold text-navy-deep">
                                R$ {Number(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="min-w-[100px]">
                              <span className="text-[10px] uppercase text-gold font-bold block">
                                Lucro da Peça
                              </span>
                              <span className="font-serif font-bold text-emerald-700">
                                + R$ {Number(item.lucro_item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Detalhe de Desconto da Venda (se houver) */}
                    {Number(venda.desconto) > 0 && (
                      <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                        <span>
                          ℹ <strong>Desconto Concedido:</strong> Foi aplicado um desconto de R${' '}
                          {Number(venda.desconto).toFixed(2)} que foi deduzido do lucro final desta transação.
                        </span>
                        <span className="font-serif font-bold text-danger">
                          - R$ {Number(venda.desconto).toFixed(2)}
                        </span>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}

          {vendasFiltradas.length === 0 && !isLoading && (
            <div className="card-luxury p-12 text-center text-slate-400">
              <p className="font-serif text-lg text-navy-muted">
                Nenhuma venda finalizada encontrada
              </p>
              <p className="text-xs mt-1">
                Realize vendas no Caixa PDV para visualizar o histórico e o lucro gerado.
              </p>
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
