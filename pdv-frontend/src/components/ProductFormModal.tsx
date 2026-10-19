import { useState, useEffect } from 'react';
import type { Produto, Categoria, VariacaoEntrada } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtoParaEditar?: Produto | null;
  onSalvo: () => void;
}

const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46', 'Único'];

export function ProductFormModal({
  isOpen,
  onClose,
  produtoParaEditar,
  onSalvo,
}: ProductFormModalProps) {
  const isEditing = !!produtoParaEditar;

  // Categorias vindas do backend
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [idCategoria, setIdCategoria] = useState<string>('');

  // Dados do produto pai
  const [nome, setNome] = useState('');
  const [precoCusto, setPrecoCusto] = useState<string>('');
  const [precoUnitario, setPrecoUnitario] = useState<string>('');
  const [estoqueMinimo, setEstoqueMinimo] = useState<string>('5');
  const [codigoBarrasPai, setCodigoBarrasPai] = useState<string>('');

  // Grade de Variações dinâmica (Cor, Tamanho, Código de Barras, Estoque)
  const [variacoes, setVariacoes] = useState<VariacaoEntrada[]>([]);

  // Auxiliares para inserção rápida de linha
  const [novaCor, setNovaCor] = useState('');
  const [novoTamanho, setNovoTamanho] = useState('M');
  const [novoEstoque, setNovoEstoque] = useState('5');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega categorias da API
  useEffect(() => {
    if (isOpen) {
      api.get<Categoria[]>('/categorias')
        .then((res) => setCategorias(res.data))
        .catch(() => toast.error('Não foi possível carregar as categorias.'));
    }
  }, [isOpen]);

  // Preenche dados ao abrir para edição ou reseta para novo
  useEffect(() => {
    if (produtoParaEditar) {
      setNome(produtoParaEditar.nome || '');
      setIdCategoria(produtoParaEditar.id_categoria ? String(produtoParaEditar.id_categoria) : '');
      setPrecoCusto(String(produtoParaEditar.preco_custo || '0'));
      setPrecoUnitario(String(produtoParaEditar.preco_unitario || produtoParaEditar.preco_venda || '0'));
      setEstoqueMinimo(String(produtoParaEditar.estoque_minimo || '5'));
      setCodigoBarrasPai(produtoParaEditar.codigo_barras || '');

      // Se o produto já possui variações carregadas
      if (produtoParaEditar.variacoes && produtoParaEditar.variacoes.length > 0) {
        setVariacoes(
          produtoParaEditar.variacoes.map((v) => ({
            id_variacao: v.id_variacao,
            cor: v.cor,
            tamanho: v.tamanho,
            codigo_barras: v.codigo_barras || '',
            quantidade_estoque: Number(v.quantidade_estoque) || 0,
          }))
        );
      } else {
        // Se for um produto legado sem grade explícita, cria uma linha padrão inicial
        setVariacoes([
          {
            cor: produtoParaEditar.cor || 'Padrão',
            tamanho: produtoParaEditar.tamanho || 'M',
            codigo_barras: produtoParaEditar.codigo_barras || '',
            quantidade_estoque: Number(produtoParaEditar.quantidade_estoque) || 0,
          },
        ]);
      }
    } else {
      setNome('');
      setIdCategoria(categorias[0]?.id_categoria ? String(categorias[0].id_categoria) : '1');
      setPrecoCusto('');
      setPrecoUnitario('');
      setEstoqueMinimo('5');
      setCodigoBarrasPai('');
      // Inicializa com grade padrão sugerida
      setVariacoes([
        { cor: 'Preto', tamanho: 'P', codigo_barras: gerarCodigoAleatorio(), quantidade_estoque: 5 },
        { cor: 'Preto', tamanho: 'M', codigo_barras: gerarCodigoAleatorio(), quantidade_estoque: 10 },
        { cor: 'Preto', tamanho: 'G', codigo_barras: gerarCodigoAleatorio(), quantidade_estoque: 5 },
      ]);
    }
  }, [produtoParaEditar, isOpen, categorias]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  function gerarCodigoAleatorio() {
    return '789' + Math.floor(100000 + Math.random() * 900000);
  }

  // Cálculos financeiros
  const numCusto = parseFloat(precoCusto.replace(',', '.')) || 0;
  const numVenda = parseFloat(precoUnitario.replace(',', '.')) || 0;
  const margemLucroCalculada =
    numCusto > 0 ? (((numVenda - numCusto) / numCusto) * 100).toFixed(2) : '0.00';
  const margemInvalida = numVenda > 0 && numVenda <= numCusto;

  // Estoque total somado da grade
  const totalEstoqueGrade = variacoes.reduce((acc, v) => acc + (Number(v.quantidade_estoque) || 0), 0);

  // Manipuladores de Variações
  const handleAdicionarVariacao = () => {
    const corLimpa = (novaCor.trim() || 'Única');
    const tamLimpo = (novoTamanho.trim() || 'M').toUpperCase();

    // Verifica se já existe a mesma cor e tamanho
    const duplicado = variacoes.some(
      (v) => v.cor.toLowerCase() === corLimpa.toLowerCase() && v.tamanho.toUpperCase() === tamLimpo
    );

    if (duplicado) {
      toast.error(`A variação ${corLimpa} - Tam ${tamLimpo} já está na lista.`);
      return;
    }

    setVariacoes((prev) => [
      ...prev,
      {
        cor: corLimpa,
        tamanho: tamLimpo,
        codigo_barras: gerarCodigoAleatorio(),
        quantidade_estoque: Math.max(0, parseInt(novoEstoque, 10) || 0),
      },
    ]);

    setNovaCor('');
    toast.success(`Variação ${corLimpa} - Tam ${tamLimpo} adicionada.`);
  };

  const handleRemoverVariacao = (index: number) => {
    if (variacoes.length <= 1) {
      toast.error('O produto deve ter ao menos uma variação de cor e tamanho.');
      return;
    }
    setVariacoes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAtualizarVariacao = (index: number, campo: keyof VariacaoEntrada, valor: any) => {
    setVariacoes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const handleGerarGradeCompleta = (cor: string) => {
    if (!cor.trim()) {
      toast.error('Informe uma cor para gerar a grade padrão.');
      return;
    }
    const corLimpa = cor.trim();
    const tamanhosGrade = ['P', 'M', 'G', 'GG'];
    
    const novas = tamanhosGrade.map((tam) => ({
      cor: corLimpa,
      tamanho: tam,
      codigo_barras: gerarCodigoAleatorio(),
      quantidade_estoque: 5,
    }));

    // Filtra removendo existentes com mesma cor/tamanho
    setVariacoes((prev) => {
      const semDuplicados = prev.filter(
        (v) => !(v.cor.toLowerCase() === corLimpa.toLowerCase() && tamanhosGrade.includes(v.tamanho))
      );
      return [...semDuplicados, ...novas];
    });

    toast.success(`Grade de 4 tamanhos (P, M, G, GG) gerada para ${corLimpa}!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('O nome da peça é obrigatório.');
      return;
    }

    if (numVenda <= 0) {
      toast.error('Informe um preço de venda maior que zero.');
      return;
    }

    if (numVenda <= numCusto) {
      toast.error('O preço de venda deve ser estritamente maior que o preço de custo.');
      return;
    }

    if (variacoes.length === 0) {
      toast.error('Adicione ao menos uma variação de cor e tamanho na grade.');
      return;
    }

    // Validação de unicidade de cor e tamanho na grade
    const combinacoes = new Set();
    for (const v of variacoes) {
      const chave = `${v.cor.trim().toLowerCase()}_${v.tamanho.trim().toUpperCase()}`;
      if (combinacoes.has(chave)) {
        toast.error(`Existem variações duplicadas com Cor "${v.cor}" e Tamanho "${v.tamanho}".`);
        return;
      }
      combinacoes.add(chave);
    }

    const payload = {
      nome: nome.trim(),
      id_categoria: idCategoria ? Number(idCategoria) : null,
      codigo_barras: codigoBarrasPai.trim() || null,
      preco_custo: numCusto,
      preco_unitario: numVenda,
      estoque_minimo: parseInt(estoqueMinimo, 10) || 5,
      variacoes: variacoes.map((v) => ({
        ...(v.id_variacao ? { id_variacao: v.id_variacao } : {}),
        cor: v.cor.trim(),
        tamanho: v.tamanho.trim().toUpperCase(),
        codigo_barras: v.codigo_barras?.trim() || null,
        quantidade_estoque: Math.max(0, Number(v.quantidade_estoque) || 0),
      })),
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await api.put(`/produtos/${produtoParaEditar.id_produto}`, payload);
        toast.success('Peça e suas variações atualizadas com sucesso!');
      } else {
        await api.post('/produtos', payload);
        toast.success('Nova peça cadastrada com sucesso com sua grade de variações!');
      }
      onSalvo();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao salvar produto com grade.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-luxury-lg border border-gold/30 w-full max-w-4xl overflow-hidden animate-fadeIn text-navy-deep my-8">

        {/* ── Topo do Modal ──────────────────────────────────────────── */}
        <div className="bg-navy-deep px-6 py-4 border-b border-gold/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold">
                Gestão do Acervo & Grade
              </p>
              <h2 className="font-serif text-xl text-white">
                {isEditing ? `Editar Peça #${produtoParaEditar.id_produto} & Grade` : 'Cadastrar Nova Peça com Grade'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* ── Formulário Principal ───────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* 1. SEÇÃO PRINCIPAL DO PRODUTO */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-deep mb-3 flex items-center gap-2">
              <span className="text-gold">✦</span>
              <span>1. Informações da Peça Principal</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nome do Produto */}
              <div className="md:col-span-2">
                <label className="label-luxury">
                  Nome da Peça <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Camisa Polo Slim Fit, Blazer Alfaiataria..."
                  className="input-luxury"
                  maxLength={100}
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="label-luxury">
                  Categoria <span className="text-danger">*</span>
                </label>
                <select
                  required
                  value={idCategoria}
                  onChange={(e) => setIdCategoria(e.target.value)}
                  className="input-luxury cursor-pointer bg-white"
                >
                  <option value="">Selecione uma Categoria...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preço de Custo */}
              <div>
                <label className="label-luxury">
                  Preço de Custo (R$) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                    placeholder="50.00"
                    className="input-luxury pl-9"
                  />
                </div>
              </div>

              {/* Preço de Venda */}
              <div>
                <label className="label-luxury">
                  Preço de Venda (R$) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={precoUnitario}
                    onChange={(e) => setPrecoUnitario(e.target.value)}
                    placeholder="150.00"
                    className={`input-luxury pl-9 ${margemInvalida ? 'border-danger focus:ring-danger/30' : ''}`}
                  />
                </div>
              </div>

              {/* Estoque Mínimo */}
              <div>
                <label className="label-luxury">Estoque Mínimo Geral</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(e.target.value)}
                  className="input-luxury"
                />
              </div>
            </div>

            {/* Barra de Lucratividade Prevista */}
            <div className="mt-3 p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold text-navy-deep">Margem Calculada de Lucro: </span>
                <span className="text-slate-500">
                  ((Venda R$ {numVenda.toFixed(2)} - Custo R$ {numCusto.toFixed(2)}) ÷ Custo) × 100
                </span>
              </div>
              <div className="text-right">
                <span className={`font-serif text-lg font-bold ${
                  margemInvalida ? 'text-danger' : 'text-emerald-700'
                }`}>
                  {numCusto > 0 && numVenda > 0 ? `+${margemLucroCalculada}%` : '—'}
                </span>
                {numCusto > 0 && numVenda > numCusto && (
                  <span className="text-xs text-gold font-semibold ml-2">
                    (Lucro: R$ {(numVenda - numCusto).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO DA GRADE INTERATIVA DE VARIAÇÕES (CORES E TAMANHOS) */}
          <div className="border-t border-border pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-deep flex items-center gap-2">
                  <span className="text-gold">✦</span>
                  <span>2. Grade de Variações (Cores, Tamanhos & Estoque)</span>
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Adicione as combinações de cores e tamanhos para esta peça. O estoque total será calculado automaticamente.
                </p>
              </div>

              {/* Totalizador de Estoque da Grade */}
              <div className="flex items-center gap-2 bg-navy-deep text-white px-3.5 py-1.5 rounded-lg border border-gold/40 shadow-xs">
                <span className="text-[10px] uppercase font-sans tracking-wider text-gold">Estoque Total:</span>
                <span className="font-serif text-base font-bold text-white">{totalEstoqueGrade} un.</span>
              </div>
            </div>

            {/* Ferramenta Rápida de Adição de Nova Variação */}
            <div className="p-3.5 rounded-lg bg-surface border border-gold/30 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[10px] uppercase font-semibold text-navy-muted block mb-1">
                  Cor
                </label>
                <input
                  type="text"
                  value={novaCor}
                  onChange={(e) => setNovaCor(e.target.value)}
                  placeholder="Ex: Azul Marinho"
                  className="input-luxury !py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-navy-muted block mb-1">
                  Tamanho
                </label>
                <select
                  value={novoTamanho}
                  onChange={(e) => setNovoTamanho(e.target.value)}
                  className="input-luxury !py-2 text-xs cursor-pointer bg-white"
                >
                  {TAMANHOS_PADRAO.map((tam) => (
                    <option key={tam} value={tam}>{tam}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-navy-muted block mb-1">
                  Estoque Inicial
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={novoEstoque}
                  onChange={(e) => setNovoEstoque(e.target.value)}
                  className="input-luxury !py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAdicionarVariacao}
                  className="flex-1 btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover py-2 text-xs font-semibold shadow-xs"
                >
                  + Adicionar Variação
                </button>

                <button
                  type="button"
                  title="Gera P, M, G, GG na cor digitada"
                  onClick={() => handleGerarGradeCompleta(novaCor || 'Preto')}
                  className="px-3 py-2 rounded border border-gold/60 bg-gold/15 text-navy-deep hover:bg-gold/25 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  Grade Completa
                </button>
              </div>
            </div>

            {/* Tabela Interativa de Variações */}
            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto scrollbar-luxury">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-surface/80 border-b border-border text-[10px] uppercase font-semibold text-navy-muted tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Cor</th>
                    <th className="py-2.5 px-3">Tamanho</th>
                    <th className="py-2.5 px-3">Código de Barras</th>
                    <th className="py-2.5 px-3 w-32">Estoque Inicial</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-white">
                  {variacoes.map((v, index) => (
                    <tr key={index} className="hover:bg-surface/40 transition-colors">
                      {/* Cor */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={v.cor}
                          onChange={(e) => handleAtualizarVariacao(index, 'cor', e.target.value)}
                          className="w-full p-1.5 border border-border rounded text-xs focus:ring-1 focus:ring-gold outline-none"
                        />
                      </td>

                      {/* Tamanho */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          required
                          value={v.tamanho}
                          onChange={(e) => handleAtualizarVariacao(index, 'tamanho', e.target.value.toUpperCase())}
                          className="w-20 p-1.5 border border-border rounded text-xs font-bold uppercase focus:ring-1 focus:ring-gold outline-none text-center"
                        />
                      </td>

                      {/* Código de Barras */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={v.codigo_barras || ''}
                            onChange={(e) => handleAtualizarVariacao(index, 'codigo_barras', e.target.value)}
                            placeholder="789..."
                            className="w-full p-1.5 border border-border rounded font-mono text-[11px] focus:ring-1 focus:ring-gold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAtualizarVariacao(index, 'codigo_barras', gerarCodigoAleatorio())}
                            className="text-[9px] text-gold hover:text-navy-deep font-semibold uppercase px-1.5 py-1 bg-surface rounded border border-border"
                            title="Gerar código único aleatório"
                          >
                            Gerar
                          </button>
                        </div>
                      </td>

                      {/* Estoque */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={v.quantidade_estoque}
                          onChange={(e) => handleAtualizarVariacao(index, 'quantidade_estoque', Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-24 p-1.5 border border-border rounded text-xs font-bold text-center focus:ring-1 focus:ring-gold outline-none"
                        />
                      </td>

                      {/* Ação: Remover */}
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoverVariacao(index)}
                          className="text-danger hover:text-red-800 p-1 rounded hover:bg-red-50 text-xs transition-colors"
                          title="Remover combinação"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}

                  {variacoes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        Nenhuma variação adicionada. Adicione ao menos uma combinação acima.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Botões de Ação ────────────────────────────────────────── */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-navy-muted">
              <span>Grade ativa: <strong>{variacoes.length} variações</strong> | Estoque Total: <strong>{totalEstoqueGrade} un.</strong></span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded border border-border text-xs font-sans font-semibold text-navy-deep hover:bg-surface transition-colors"
              >
                Cancelar (ESC)
              </button>

              <button
                type="submit"
                disabled={isSubmitting || margemInvalida || variacoes.length === 0}
                className="btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover py-2.5 px-6 text-xs font-semibold shadow-luxury flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-gold" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Gravando no Acervo...</span>
                  </>
                ) : (
                  <>
                    <span className="text-gold">✦</span>
                    <span>{isEditing ? 'Atualizar Peça e Grade' : 'Cadastrar Peça com Grade'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
