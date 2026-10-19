import { useState, useEffect } from 'react';
import type { Produto, ProdutoVariacao } from '../types';

interface GradeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto | null;
  onAdicionar: (produto: Produto, variacao: ProdutoVariacao | null, quantidade: number) => Promise<void>;
}

export function GradeSelectorModal({
  isOpen,
  onClose,
  produto,
  onAdicionar,
}: GradeSelectorModalProps) {
  const [corSelecionada, setCorSelecionada] = useState<string>('');
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  // Variações do produto
  const variacoes = produto?.variacoes || [];

  // Cores únicas disponíveis
  const coresDisponiveis = Array.from(new Set(variacoes.map((v) => v.cor))).filter(Boolean);

  // Inicializa a cor selecionada e tamanho ao abrir modal
  useEffect(() => {
    if (produto && variacoes.length > 0) {
      const primeiraCorComEstoque = coresDisponiveis.find((c) =>
        variacoes.some((v) => v.cor === c && v.quantidade_estoque > 0)
      ) || coresDisponiveis[0] || '';
      
      setCorSelecionada(primeiraCorComEstoque);

      const variacoesDestaCor = variacoes.filter((v) => v.cor === primeiraCorComEstoque);
      const primeiroTamComEstoque = variacoesDestaCor.find((v) => v.quantidade_estoque > 0)?.tamanho ||
        variacoesDestaCor[0]?.tamanho || '';
      
      setTamanhoSelecionado(primeiroTamComEstoque);
      setQuantidade(1);
    } else {
      setCorSelecionada('');
      setTamanhoSelecionado('');
      setQuantidade(1);
    }
  }, [produto, isOpen]);

  // Ao mudar de cor, seleciona automaticamente o primeiro tamanho disponível dessa cor
  const handleSelecionarCor = (cor: string) => {
    setCorSelecionada(cor);
    const variacoesDestaCor = variacoes.filter((v) => v.cor === cor);
    const primeiroTamComEstoque = variacoesDestaCor.find((v) => v.quantidade_estoque > 0)?.tamanho ||
      variacoesDestaCor[0]?.tamanho || '';
    setTamanhoSelecionado(primeiroTamComEstoque);
    setQuantidade(1);
  };

  if (!isOpen || !produto) return null;

  // Tamanhos disponíveis para a cor selecionada
  const variacoesDaCor = variacoes.filter((v) => v.cor === corSelecionada);

  // Variação ativa correspondente à cor e tamanho selecionados
  const variacaoAtiva = variacoesDaCor.find((v) => v.tamanho === tamanhoSelecionado) || null;
  const estoqueDisponivel = variacaoAtiva ? variacaoAtiva.quantidade_estoque : produto.quantidade_estoque;
  const precoUnitario = Number(produto.preco_unitario || produto.preco_venda || 0);
  const subtotal = precoUnitario * quantidade;

  const handleConfirmar = async () => {
    if (estoqueDisponivel <= 0 || quantidade <= 0) return;
    try {
      setIsAdding(true);
      await onAdicionar(produto, variacaoAtiva, quantidade);
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-luxury-lg border border-gold/30 w-full max-w-lg overflow-hidden animate-fadeIn text-navy-deep">
        
        {/* ── Topo Minimalista de Luxo ───────────────────────────────── */}
        <div className="bg-navy-deep px-6 py-4 border-b border-gold/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gold/15 border border-gold/40 flex items-center justify-center text-gold font-serif text-sm font-bold">
              ✦
            </div>
            <div>
              <p className="text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold">
                Seletor de Grade
              </p>
              <h3 className="font-serif text-lg text-white font-medium line-clamp-1">
                {produto.nome}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isAdding}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* ── Conteúdo do Seletor ───────────────────────────────────── */}
        <div className="p-6 space-y-5">

          {/* Cabeçalho do Produto & Preço */}
          <div className="flex items-baseline justify-between border-b border-border/70 pb-3">
            <div>
              <span className="text-[11px] text-navy-muted uppercase tracking-wider font-semibold">
                {produto.nome_categoria || 'Vestuário'}
              </span>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Escolha a cor e a numeração desejada para esta peça
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-navy-muted block">
                Valor Unitário
              </span>
              <span className="font-serif text-xl font-bold text-navy-deep">
                R$ {precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 1. Seleção de Cor */}
          {coresDisponiveis.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-navy-deep uppercase tracking-wider block mb-2">
                1. Escolha a Cor:
              </label>
              <div className="flex flex-wrap gap-2">
                {coresDisponiveis.map((cor) => {
                  const isSelected = cor === corSelecionada;
                  const totalEstoqueCor = variacoes
                    .filter((v) => v.cor === cor)
                    .reduce((acc, v) => acc + Number(v.quantidade_estoque), 0);

                  return (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => handleSelecionarCor(cor)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-navy-deep text-white border-gold shadow-luxury ring-1 ring-gold/40'
                          : 'bg-surface text-navy-deep border-border hover:border-gold/50 hover:bg-white'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-gold' : 'bg-slate-400'}`} />
                      <span>{cor}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-gold/20 text-gold' : 'text-slate-400'
                      }`}>
                        {totalEstoqueCor} un.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Seleção de Tamanho */}
          {variacoesDaCor.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-navy-deep uppercase tracking-wider block mb-2">
                2. Escolha o Tamanho:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variacoesDaCor.map((v) => {
                  const isSelected = v.tamanho === tamanhoSelecionado;
                  const temEstoque = v.quantidade_estoque > 0;

                  return (
                    <button
                      key={v.id_variacao || v.tamanho}
                      type="button"
                      disabled={!temEstoque}
                      onClick={() => {
                        setTamanhoSelecionado(v.tamanho);
                        setQuantidade(1);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        !temEstoque
                          ? 'opacity-40 border-border bg-slate-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-gold bg-gold/10 shadow-xs ring-2 ring-gold/30'
                          : 'border-border bg-white hover:border-navy-deep/30 hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-navy-deep">
                          {v.tamanho}
                        </span>
                        {isSelected && (
                          <span className="text-gold font-bold text-xs">✓</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className={`text-[11px] font-medium ${temEstoque ? 'text-emerald-700' : 'text-danger'}`}>
                          {temEstoque ? `${v.quantidade_estoque} un.` : 'Esgotado'}
                        </span>
                        {v.codigo_barras && (
                          <span className="text-[9px] font-mono text-slate-400">
                            #{v.codigo_barras.slice(-4)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Caso produto não tenha grade detalhada */}
          {variacoes.length === 0 && (
            <div className="p-4 rounded-lg bg-surface border border-border text-center">
              <p className="text-xs text-navy-muted">
                Este produto é de tamanho e cor únicos.
              </p>
              <p className="font-semibold text-sm text-navy-deep mt-1">
                Saldo disponível: <span className="text-emerald-700">{produto.quantidade_estoque} unidades</span>
              </p>
            </div>
          )}

          {/* 3. Seletor de Quantidade & Resumo */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-navy-muted block mb-1">
                Quantidade
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={quantidade <= 1}
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded border border-border bg-surface text-navy-deep font-bold hover:bg-white disabled:opacity-30 transition-colors"
                >
                  -
                </button>
                <span className="w-10 text-center font-serif text-base font-bold text-navy-deep">
                  {quantidade}
                </span>
                <button
                  type="button"
                  disabled={quantidade >= estoqueDisponivel}
                  onClick={() => setQuantidade((q) => Math.min(estoqueDisponivel, q + 1))}
                  className="w-8 h-8 rounded border border-border bg-surface text-navy-deep font-bold hover:bg-white disabled:opacity-30 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-navy-muted block">
                Total do Item
              </span>
              <span className="font-serif text-xl font-bold text-gold">
                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>

        {/* ── Botões de Ação ────────────────────────────────────────── */}
        <div className="bg-surface/60 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {variacaoAtiva ? (
              <span>
                Item: <strong>{corSelecionada}</strong> / <strong>{tamanhoSelecionado}</strong> ({estoqueDisponivel} un. em estoque)
              </span>
            ) : (
              <span>Selecione uma combinação</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdding}
              className="px-4 py-2 rounded border border-border text-xs font-semibold text-navy-deep hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isAdding || estoqueDisponivel <= 0 || (variacoes.length > 0 && !variacaoAtiva)}
              onClick={handleConfirmar}
              className="btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover py-2 px-5 text-xs font-semibold shadow-luxury flex items-center gap-2 disabled:opacity-50"
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-gold" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Adicionando...</span>
                </>
              ) : (
                <>
                  <span className="text-gold">✦</span>
                  <span>Adicionar ao Carrinho</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

