import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { ProductFormModal } from '../components/ProductFormModal';
import { DeleteProductModal } from '../components/DeleteProductModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { Produto } from '../types';
import toast from 'react-hot-toast';

export default function ProdutosPage() {
  const { usuario } = useAuth();
  const isGerente = usuario?.cargo === 'gerente';

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [apenasAlerta, setApenasAlerta] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [produtoExcluindo, setProdutoExcluindo] = useState<Produto | null>(null);

  // ── Carregar Produtos da API ─────────────────────────────────────────
  const carregarProdutos = useCallback(async (termo?: string) => {
    try {
      setIsLoading(true);
      const url = termo ? `/produtos?busca=${encodeURIComponent(termo)}` : '/produtos';
      const { data } = await api.get<Produto[]>(url);
      setProdutos(data);
    } catch {
      toast.error('Erro ao carregar lista de produtos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarProdutos(busca.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, carregarProdutos]);

  // Handlers para ações
  const handleNovoProduto = () => {
    setProdutoEditando(null);
    setIsFormModalOpen(true);
  };

  const handleEditar = (prod: Produto) => {
    setProdutoEditando(prod);
    setIsFormModalOpen(true);
  };

  const handleExcluir = (prod: Produto) => {
    setProdutoExcluindo(prod);
    setIsDeleteModalOpen(true);
  };

  // Filtragem local se toggle de alerta estiver ativo
  const produtosExibidos = produtos.filter((p) => {
    if (apenasAlerta) {
      return p.quantidade_estoque <= p.estoque_minimo;
    }
    return true;
  });

  // Métricas para cards executivos
  const totalPecas = produtos.length;
  const totalEmAlerta = produtos.filter((p) => p.quantidade_estoque <= p.estoque_minimo).length;
  const valorTotalEstoque = produtos.reduce(
    (acc, p) => acc + (p.quantidade_estoque * Number(p.preco_unitario || p.preco_venda || 0)),
    0
  );
  const margemMedia =
    produtos.length > 0
      ? (
          produtos.reduce((acc, p) => acc + Number(p.margem_lucro || 0), 0) /
          produtos.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans select-none">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Cabeçalho da Página ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-sans font-semibold tracking-[0.3em] uppercase text-gold">
                Acervo & Gestão
              </span>
              <span className="badge-gold !text-[9px]">Acesso Gerencial</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-navy-deep">
              Catálogo de Peças & Produtos
            </h1>
            <p className="text-xs text-navy-muted font-sans mt-0.5">
              Controle de precificação, margem de lucro e monitoramento de estoque mínimo da boutique.
            </p>
          </div>

          {/* Botão Novo Produto */}
          <button
            type="button"
            onClick={handleNovoProduto}
            className="btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover border border-gold/40 shadow-luxury py-3 px-5 text-xs font-semibold flex items-center justify-center gap-2 group"
          >
            <span className="text-gold group-hover:scale-125 transition-transform">✦</span>
            <span>Cadastrar Nova Peça</span>
          </button>
        </div>

        {/* ── Cards de Métricas Executivas ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total de Peças */}
          <div className="card-luxury p-4 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Peças Ativas
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-2xl text-navy-deep font-bold">
                {totalPecas}
              </span>
              <span className="text-xs text-slate-400">no catálogo</span>
            </div>
          </div>

          {/* Alerta Estoque Mínimo */}
          <div
            onClick={() => setApenasAlerta(!apenasAlerta)}
            className={`card-luxury p-4 flex flex-col justify-between cursor-pointer transition-all ${
              apenasAlerta ? 'ring-2 ring-gold border-gold bg-gold/5' : 'hover:border-gold/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
                Estoque Mínimo
              </span>
              {totalEmAlerta > 0 && (
                <span className="badge-gold !text-[9px]">Atenção</span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`font-serif text-2xl font-bold ${
                totalEmAlerta > 0 ? 'text-amber-700' : 'text-navy-deep'
              }`}>
                {totalEmAlerta}
              </span>
              <span className="text-xs text-gold font-semibold underline">
                {apenasAlerta ? 'Ver todos' : 'Filtrar peças'}
              </span>
            </div>
          </div>

          {/* Margem Média */}
          <div className="card-luxury p-4 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Margem Média
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-2xl text-emerald-700 font-bold">
                {margemMedia}%
              </span>
              <span className="text-xs text-slate-400">lucro s/ venda</span>
            </div>
          </div>

          {/* Valor Total em Estoque */}
          <div className="card-luxury p-4 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Capital em Estoque
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-xl sm:text-2xl text-gold font-bold">
                R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-slate-400">venda</span>
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
              placeholder="Buscar por Peça, Código de Barras ou Cor..."
              className="input-luxury pl-10 py-2.5 text-xs"
            />
          </div>

          {/* Toggle de Alerta */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setApenasAlerta(false)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                !apenasAlerta
                  ? 'bg-navy-deep text-white shadow-xs'
                  : 'text-navy-muted hover:bg-surface border border-border'
              }`}
            >
              Todas as Peças ({produtos.length})
            </button>
            <button
              type="button"
              onClick={() => setApenasAlerta(true)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                apenasAlerta
                  ? 'bg-gold text-navy-deep shadow-xs'
                  : 'text-navy-muted hover:bg-surface border border-border'
              }`}
            >
              <span>Estoque Mínimo</span>
              {totalEmAlerta > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {totalEmAlerta}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Tabela Moderna de Produtos ────────────────────────────── */}
        <div className="card-luxury overflow-hidden">
          <div className="overflow-x-auto scrollbar-luxury">
            <table className="table-luxury">
              <thead>
                <tr className="bg-surface/70">
                  <th>Código de Barras</th>
                  <th>Peça / Produto</th>
                  <th>Grade (Cor / Tam)</th>
                  <th className="text-right">Preço Custo</th>
                  <th className="text-right">Preço Venda</th>
                  <th className="text-right">Margem %</th>
                  <th className="text-center">Estoque</th>
                  <th className="text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {produtosExibidos.map((prod) => {
                  const precoCusto = Number(prod.preco_custo || 0);
                  const precoVenda = Number(prod.preco_unitario || prod.preco_venda || 0);
                  const margem = Number(prod.margem_lucro || 0);
                  const estoqueBaixo = prod.quantidade_estoque <= prod.estoque_minimo;

                  return (
                    <tr key={prod.id_produto} className="hover:bg-surface/50 transition-colors">

                      {/* Código de Barras */}
                      <td className="font-mono text-xs text-slate-500">
                        {prod.codigo_barras ? (
                          <span className="px-2 py-0.5 rounded bg-surface border border-border">
                            {prod.codigo_barras}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Nome da Peça */}
                      <td className="font-semibold text-navy-deep text-sm max-w-[240px]">
                        {prod.nome}
                      </td>

                      {/* Grade & Categoria */}
                      <td>
                        <div className="flex flex-col gap-1">
                          {prod.nome_categoria && (
                            <span className="text-[10px] font-sans font-semibold tracking-wider text-gold uppercase">
                              {prod.nome_categoria}
                            </span>
                          )}
                          {prod.variacoes && prod.variacoes.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[260px]">
                              {prod.variacoes.slice(0, 4).map((v) => (
                                <span
                                  key={v.id_variacao}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface text-navy-deep border border-border text-[10px]"
                                >
                                  <span>{v.cor}</span>
                                  <span className="font-bold text-navy-deep">{v.tamanho}</span>
                                  <span className="text-slate-400 font-mono">({v.quantidade_estoque})</span>
                                </span>
                              ))}
                              {prod.variacoes.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-semibold self-center">
                                  +{prod.variacoes.length - 4} mais
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface text-navy-muted border border-border text-xs font-medium">
                              <span>{prod.cor || 'Único'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-navy-deep">{prod.tamanho || 'U'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Preço de Custo */}
                      <td className="text-right font-serif text-xs text-slate-500">
                        R$ {precoCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Preço de Venda */}
                      <td className="text-right font-serif text-sm font-semibold text-navy-deep">
                        R$ {precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Margem de Lucro % */}
                      <td className="text-right">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          +{margem.toFixed(2)}%
                        </span>
                      </td>

                      {/* Estoque Atual & Badge de Alerta */}
                      <td className="text-center">
                        {estoqueBaixo ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="badge-gold !bg-amber-100/70 !text-amber-800 !border-amber-300 font-bold">
                              ESTOQUE MÍNIMO
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {prod.quantidade_estoque} un. (mín: {prod.estoque_minimo})
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-navy-deep text-xs">
                            {prod.quantidade_estoque} un.
                          </span>
                        )}
                      </td>

                      {/* Ações (Editar e Excluir Gerencial) */}
                      <td className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditar(prod)}
                            className="p-1.5 rounded hover:bg-surface text-navy-muted hover:text-navy-deep transition-colors"
                            title="Editar peça"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Exclusão visível apenas para cargo de Gerente */}
                          {isGerente && (
                            <button
                              type="button"
                              onClick={() => handleExcluir(prod)}
                              className="p-1.5 rounded hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors"
                              title="Inativar produto (Gerente)"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {produtosExibidos.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <p className="font-serif text-base text-navy-muted">
                        Nenhum produto cadastrado ou encontrado
                      </p>
                      <p className="text-xs mt-1">
                        Utilize o botão acima para cadastrar a primeira peça no catálogo.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── Modal de Cadastro e Edição ──────────────────────────────── */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        produtoParaEditar={produtoEditando}
        onSalvo={() => carregarProdutos(busca.trim())}
      />

      {/* ── Modal de Confirmação de Exclusão (Gerente) ──────────────── */}
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        produto={produtoExcluindo}
        onExcluido={() => carregarProdutos(busca.trim())}
      />

    </div>
  );
}
