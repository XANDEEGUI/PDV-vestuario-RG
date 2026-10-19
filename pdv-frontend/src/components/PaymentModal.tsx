import { useState, useEffect } from 'react';
import type { FormaPagamento, ParcelaInfo, OpcoesPagamento } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  desconto: number;
  idVenda: number | null;
  onConfirmar: (forma: FormaPagamento, parcelas: number, detalhes?: string) => Promise<void>;
  isLoading: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  total,
  subtotal,
  desconto,
  idVenda,
  onConfirmar,
  isLoading,
}: PaymentModalProps) {
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>('pix');
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1);
  const [opcoes, setOpcoes] = useState<OpcoesPagamento | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Carrega opções de pagamento detalhadas da API
  useEffect(() => {
    if (!isOpen || !idVenda) return;

    let isMounted = true;
    api
      .get<{ opcoes_pagamento: OpcoesPagamento }>(`/vendas/${idVenda}/checkout`)
      .then((res) => {
        if (isMounted && res.data?.opcoes_pagamento) {
          setOpcoes(res.data.opcoes_pagamento);
        }
      })
      .catch(() => {
        // Fallback para geração local caso a rota use outro nome
        api.get<OpcoesPagamento>(`/vendas/${idVenda}/pagamento`).then((res) => {
          if (isMounted && res.data) {
            setOpcoes(res.data);
          }
        }).catch(() => null);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, idVenda, total]);

  // Se o modal fechar, reseta parcelas
  useEffect(() => {
    if (!isOpen) {
      setParcelaSelecionada(1);
      setCopiado(false);
    }
  }, [isOpen]);

  // Tecla de atalho ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Cálculo de parcelas fallback caso a API ainda não tenha retornado
  const maxParcelas = total >= 120 ? 12 : total >= 60 ? 6 : total >= 20 ? 3 : 1;
  const listaParcelas: ParcelaInfo[] =
    opcoes?.cartao_credito?.parcelas ||
    Array.from({ length: maxParcelas }, (_, idx) => {
      const p = idx + 1;
      const valorP = Number((total / p).toFixed(2));
      return {
        parcela: p,
        valor_parcela: valorP,
        total,
        descricao: `${p}x de R$ ${valorP.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros`,
      };
    });

  const handleCopiarChave = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success('Chave / Código copiado para a área de transferência!');
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleFinalizar = async () => {
    let detalhes = '';
    if (formaSelecionada === 'cartao_credito') {
      detalhes = `${parcelaSelecionada}x no Cartão de Crédito`;
    } else if (formaSelecionada === 'cartao_debito') {
      detalhes = 'À vista no Cartão de Débito';
    } else if (formaSelecionada === 'pix') {
      detalhes = 'Pagamento instantâneo via Pix';
    } else if (formaSelecionada === 'boleto') {
      detalhes = 'Boleto Bancário (vencimento 3 dias)';
    }

    await onConfirmar(formaSelecionada, parcelaSelecionada, detalhes);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-luxury-lg border border-gold/30 w-full max-w-4xl overflow-hidden animate-fadeIn">

        {/* ── Cabeçalho do Modal ────────────────────────────────────── */}
        <div className="bg-navy-deep px-6 py-5 border-b border-gold/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold">
                Fechamento do Caixa
              </p>
              <h2 className="font-serif text-xl text-white">
                Tabela de Formas de Pagamento
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Resumo Financeiro ──────────────────────────────────────── */}
        <div className="bg-canvas border-b border-border px-6 py-4 grid grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted block">
              Subtotal
            </span>
            <span className="font-serif text-lg text-navy-deep">
              R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted block">
              Desconto Concedido
            </span>
            <span className="font-serif text-lg text-danger">
              - R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-sans uppercase tracking-widest text-gold block font-semibold">
              Total Líquido a Pagar
            </span>
            <span className="font-serif text-2xl text-gold font-bold">
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ── Corpo do Modal: Split Formas & Detalhes ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">

          {/* Coluna Esquerda: Seletor de Formas de Pagamento */}
          <div className="md:col-span-4 border-r border-border p-4 bg-surface/50 space-y-2">
            <p className="text-[11px] font-semibold text-navy-muted tracking-wider uppercase mb-3">
              Selecione o Meio
            </p>

            {/* Opção Pix */}
            <button
              type="button"
              onClick={() => {
                setFormaSelecionada('pix');
                setParcelaSelecionada(1);
              }}
              className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex items-center gap-3 ${
                formaSelecionada === 'pix'
                  ? 'bg-white border-gold shadow-md text-navy-deep ring-1 ring-gold/40'
                  : 'bg-white/80 border-border hover:border-gold/50 text-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                formaSelecionada === 'pix' ? 'bg-gold text-navy-deep' : 'bg-canvas text-navy-muted'
              }`}>
                ❖
              </div>
              <div>
                <p className="font-sans font-semibold text-sm">PIX</p>
                <p className="text-[11px] text-slate-500">QR Code Instantâneo</p>
              </div>
            </button>

            {/* Opção Cartão de Crédito */}
            <button
              type="button"
              onClick={() => setFormaSelecionada('cartao_credito')}
              className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex items-center gap-3 ${
                formaSelecionada === 'cartao_credito'
                  ? 'bg-white border-gold shadow-md text-navy-deep ring-1 ring-gold/40'
                  : 'bg-white/80 border-border hover:border-gold/50 text-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                formaSelecionada === 'cartao_credito' ? 'bg-gold text-navy-deep' : 'bg-canvas text-navy-muted'
              }`}>
                💳
              </div>
              <div>
                <p className="font-sans font-semibold text-sm">Cartão de Crédito</p>
                <p className="text-[11px] text-slate-500">Até 12x Sem Juros</p>
              </div>
            </button>

            {/* Opção Cartão de Débito */}
            <button
              type="button"
              onClick={() => {
                setFormaSelecionada('cartao_debito');
                setParcelaSelecionada(1);
              }}
              className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex items-center gap-3 ${
                formaSelecionada === 'cartao_debito'
                  ? 'bg-white border-gold shadow-md text-navy-deep ring-1 ring-gold/40'
                  : 'bg-white/80 border-border hover:border-gold/50 text-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                formaSelecionada === 'cartao_debito' ? 'bg-gold text-navy-deep' : 'bg-canvas text-navy-muted'
              }`}>
                🏧
              </div>
              <div>
                <p className="font-sans font-semibold text-sm">Cartão de Débito</p>
                <p className="text-[11px] text-slate-500">À Vista na Maquininha</p>
              </div>
            </button>

            {/* Opção Boleto */}
            <button
              type="button"
              onClick={() => {
                setFormaSelecionada('boleto');
                setParcelaSelecionada(1);
              }}
              className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex items-center gap-3 ${
                formaSelecionada === 'boleto'
                  ? 'bg-white border-gold shadow-md text-navy-deep ring-1 ring-gold/40'
                  : 'bg-white/80 border-border hover:border-gold/50 text-slate-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                formaSelecionada === 'boleto' ? 'bg-gold text-navy-deep' : 'bg-canvas text-navy-muted'
              }`}>
                📄
              </div>
              <div>
                <p className="font-sans font-semibold text-sm">Boleto Bancário</p>
                <p className="text-[11px] text-slate-500">Vencimento em 3 dias</p>
              </div>
            </button>
          </div>

          {/* Coluna Direita: Detalhamento da Forma Escolhida */}
          <div className="md:col-span-8 p-6 flex flex-col justify-between">

            {/* DETALHE: PIX */}
            {formaSelecionada === 'pix' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-serif text-lg text-navy-deep">Pagamento Instantâneo via PIX</h3>
                  <span className="badge-gold">Chave Ativa</span>
                </div>

                <div className="p-4 rounded-lg bg-surface border border-border flex flex-col md:flex-row items-center gap-5">
                  {/* QR Code visual simulado */}
                  <div className="w-32 h-32 bg-white p-2 rounded-lg border border-border shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-navy-deep/90 rounded flex items-center justify-center text-gold text-xs font-mono p-1 break-all">
                      [QR CODE PIX]
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-left">
                    <p className="text-xs text-navy-muted font-sans leading-relaxed">
                      Escaneie o QR Code no aplicativo do seu banco ou utilize a chave Pix abaixo para pagamento imediato:
                    </p>
                    <div className="p-2.5 rounded bg-white border border-border flex items-center justify-between">
                      <span className="font-mono text-xs text-navy-deep font-semibold truncate max-w-[280px]">
                        {opcoes?.pix?.chave_pix || 'pdv.pagamentos@vestuario.com.br'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopiarChave(opcoes?.pix?.chave_pix || 'pdv.pagamentos@vestuario.com.br')}
                        className="text-xs text-gold hover:text-navy-deep font-semibold transition-colors px-2 py-1 bg-gold/10 hover:bg-gold/20 rounded"
                      >
                        {copiado ? 'Copiado!' : 'Copiar Chave'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Instrução: Confirmação automática pelo webhook bancário em até 10 segundos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* DETALHE: CARTÃO DE CRÉDITO (TABELA DE PARCELAMENTO) */}
            {formaSelecionada === 'cartao_credito' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div>
                    <h3 className="font-serif text-lg text-navy-deep">Tabela de Parcelamento no Cartão</h3>
                    <p className="text-xs text-slate-500">Selecione o plano desejado para o cliente</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-surface border text-[10px] font-bold">VISA</span>
                    <span className="px-2 py-0.5 rounded bg-surface border text-[10px] font-bold">MASTER</span>
                    <span className="px-2 py-0.5 rounded bg-surface border text-[10px] font-bold">ELO</span>
                    <span className="px-2 py-0.5 rounded bg-surface border text-[10px] font-bold">AMEX</span>
                  </div>
                </div>

                {/* Tabela estilizada de parcelas */}
                <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto scrollbar-luxury">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface sticky top-0 border-b border-border font-semibold text-navy-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Opção</th>
                        <th className="py-2.5 px-3">Parcela</th>
                        <th className="py-2.5 px-3">Valor da Parcela</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {listaParcelas.map((parc) => {
                        const isSelected = parcelaSelecionada === parc.parcela;
                        return (
                          <tr
                            key={parc.parcela}
                            onClick={() => setParcelaSelecionada(parc.parcela)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-gold/15 font-semibold text-navy-deep' : 'hover:bg-surface/50 text-slate-700'
                            }`}
                          >
                            <td className="py-2 px-3">
                              <input
                                type="radio"
                                name="parcelas"
                                checked={isSelected}
                                onChange={() => setParcelaSelecionada(parc.parcela)}
                                className="accent-gold h-4 w-4"
                              />
                            </td>
                            <td className="py-2 px-3 font-medium">
                              {parc.parcela}x {parc.parcela === 1 ? '(À vista)' : ''}
                            </td>
                            <td className="py-2 px-3 font-serif text-sm text-navy-deep">
                              R$ {parc.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              R$ {parc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-emerald-600 ml-1.5 uppercase font-semibold">Sem Juros</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DETALHE: CARTÃO DE DÉBITO */}
            {formaSelecionada === 'cartao_debito' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-serif text-lg text-navy-deep">Cartão de Débito (À Vista)</h3>
                  <span className="badge-gold">PinPad / POS</span>
                </div>

                <div className="p-5 rounded-lg bg-surface border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-sans text-navy-muted">Valor a ser cobrado no débito:</span>
                    <span className="font-serif text-2xl text-navy-deep font-bold">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Solicite ao cliente que insira ou aproxime o cartão de débito na maquininha e digite a senha de 4 a 6 dígitos.
                  </p>
                  <div className="pt-2 border-t border-border flex items-center gap-2 text-xs text-slate-500">
                    <span>Bandeiras autorizadas:</span>
                    <span className="font-semibold text-navy-deep">Elo Débito, Visa Electron, Maestro, Banricompras</span>
                  </div>
                </div>
              </div>
            )}

            {/* DETALHE: BOLETO BANCÁRIO */}
            {formaSelecionada === 'boleto' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-serif text-lg text-navy-deep">Boleto Bancário</h3>
                  <span className="badge-gold">Vencimento: +3 dias</span>
                </div>

                <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
                  <div>
                    <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-navy-muted block mb-1">
                      Linha Digitável
                    </label>
                    <div className="p-2 rounded bg-white border border-border flex items-center justify-between">
                      <span className="font-mono text-xs text-navy-deep font-semibold truncate max-w-[340px]">
                        {opcoes?.boleto?.linha_digitavel || '00190.00009 01234.567890 12345.678901 1 987600000' + total.toFixed(2).replace('.', '')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopiarChave(opcoes?.boleto?.linha_digitavel || '00190.00009 01234.567890 12345.678901 1 987600000' + total.toFixed(2).replace('.', ''))}
                        className="text-xs text-gold hover:text-navy-deep font-semibold transition-colors px-2 py-1 bg-gold/10 hover:bg-gold/20 rounded"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    O boleto pode ser pago em qualquer agência bancária ou internet banking até o vencimento.
                  </p>
                </div>
              </div>
            )}

            {/* ── Botões de Ação do Modal ──────────────────────────────── */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-md border border-border text-navy-deep font-sans text-xs font-semibold hover:bg-surface transition-colors"
              >
                Voltar (ESC)
              </button>

              <button
                type="button"
                onClick={handleFinalizar}
                disabled={isLoading}
                className="btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover flex-1 max-w-xs py-3 text-sm shadow-luxury flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-gold" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Processando Pagamento...</span>
                  </>
                ) : (
                  <>
                    <span className="text-gold">✓</span>
                    <span>Confirmar Pagamento e Emitir Cupom</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

