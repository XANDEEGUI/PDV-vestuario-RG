import type { Venda, ItemVenda } from '../types';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  venda: Venda | null;
  itens: ItemVenda[];
  formaPagamentoNome?: string;
  detalhesPagamento?: string;
}

export function SaleReceiptModal({
  isOpen,
  onClose,
  venda,
  itens,
  formaPagamentoNome,
  detalhesPagamento,
}: SaleReceiptModalProps) {
  if (!isOpen || !venda) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-luxury-lg border border-gold/40 w-full max-w-lg overflow-hidden animate-fadeIn text-navy-deep">

        {/* ── Banner Superior ────────────────────────────────────────── */}
        <div className="bg-navy-deep text-center p-6 border-b border-gold/30 relative">
          <div className="w-12 h-12 mx-auto rounded-full bg-gold/20 border border-gold flex items-center justify-center text-gold mb-3 text-xl">
            ✓
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-sans text-gold font-semibold">
            Venda Concluída
          </p>
          <h2 className="font-serif text-2xl text-white">
            Boutique Vestuário
          </h2>
          <p className="text-xs text-slate-300 font-sans mt-1">
            Comprovante Não Fiscal de Venda #{String(venda.id_venda).padStart(5, '0')}
          </p>
        </div>

        {/* ── Detalhes do Recibo ──────────────────────────────────────── */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-luxury font-sans text-xs">

          {/* Dados Gerais */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-border text-slate-600">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-navy-muted">Data e Hora:</span>
              <span className="text-navy-deep font-medium">
                {new Date().toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-navy-muted">Status:</span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                {venda.status}
              </span>
            </div>
            {venda.nome_cliente && (
              <div className="col-span-2">
                <span className="block text-[10px] uppercase font-semibold text-navy-muted">Cliente:</span>
                <span className="text-navy-deep font-medium">{venda.nome_cliente}</span>
              </div>
            )}
          </div>

          {/* Tabela de Itens */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-muted mb-2">
              Itens Adquiridos
            </p>
            <div className="border border-border rounded divide-y divide-border/60">
              {itens.map((item, idx) => (
                <div key={idx} className="p-2 flex items-center justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-medium text-navy-deep">
                      {item.nome_produto || `Produto #${item.id_produto}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.quantidade}x un. × R$ {Number(item.preco_unitario).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-serif font-medium text-navy-deep">
                    R$ {Number(item.subtotal).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>R$ {Number(venda.subtotal).toFixed(2)}</span>
            </div>
            {Number(venda.desconto) > 0 && (
              <div className="flex justify-between text-danger font-medium">
                <span>Desconto Aplicado:</span>
                <span>- R$ {Number(venda.desconto).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-serif font-bold text-navy-deep pt-1 border-t border-border">
              <span>Total Pago:</span>
              <span className="text-gold">R$ {Number(venda.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="p-3 bg-surface rounded border border-border">
            <span className="block text-[10px] uppercase tracking-wider text-navy-muted font-semibold">
              Forma de Pagamento
            </span>
            <p className="font-sans font-semibold text-navy-deep text-sm capitalize">
              {formaPagamentoNome || 'Aprovado'}
            </p>
            {detalhesPagamento && (
              <p className="text-[11px] text-slate-500 mt-0.5">{detalhesPagamento}</p>
            )}
          </div>

        </div>

        {/* ── Botões de Ação ──────────────────────────────────────────── */}
        <div className="p-4 bg-canvas border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded border border-border text-xs font-sans font-semibold text-navy-deep hover:bg-white transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir Cupom
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary !bg-gold !text-navy-deep hover:!bg-gold-light py-2.5 px-5 text-xs font-bold"
          >
            Iniciar Nova Venda (F2)
          </button>
        </div>

      </div>
    </div>
  );
}

