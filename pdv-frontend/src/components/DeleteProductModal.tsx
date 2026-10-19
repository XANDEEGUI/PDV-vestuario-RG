import { useState } from 'react';
import type { Produto } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto | null;
  onExcluido: () => void;
}

export function DeleteProductModal({
  isOpen,
  onClose,
  produto,
  onExcluido,
}: DeleteProductModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !produto) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/produtos/${produto.id_produto}`);
      toast.success(`Peça "${produto.nome}" inativada do catálogo.`);
      onExcluido();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao excluir produto.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-luxury-lg border border-danger/30 w-full max-w-md overflow-hidden animate-fadeIn text-navy-deep">

        <div className="bg-danger/10 p-6 border-b border-danger/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-danger/20 text-danger flex items-center justify-center text-xl font-bold">
            ⚠
          </div>
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-danger">
              Ação de Gerência
            </p>
            <h3 className="font-serif text-lg text-navy-deep">
              Remover Peça do Acervo
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-3 text-xs font-sans text-slate-600">
          <p>
            Tem certeza de que deseja inativar a peça{' '}
            <strong className="text-navy-deep">"{produto.nome}"</strong>?
          </p>
          <div className="p-3 bg-surface rounded border border-border space-y-1">
            <p><span className="text-navy-muted">Código:</span> {produto.codigo_barras || 'Sem código'}</p>
            <p><span className="text-navy-muted">Grade:</span> {produto.cor || '—'} / {produto.tamanho || '—'}</p>
            <p><span className="text-navy-muted">Estoque atual:</span> {produto.quantidade_estoque} un.</p>
          </div>
          <p className="text-[11px] text-slate-500">
            A exclusão realiza o <em>soft delete</em> no sistema, mantendo a integridade dos históricos de vendas anteriores.
          </p>
        </div>

        <div className="p-4 bg-canvas border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded border border-border text-xs font-semibold text-navy-deep hover:bg-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded bg-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs flex items-center gap-2"
          >
            {isDeleting ? 'Removendo...' : 'Confirmar Inativação'}
          </button>
        </div>

      </div>
    </div>
  );
}

