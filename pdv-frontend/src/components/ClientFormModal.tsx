import { useState, useEffect } from 'react';
import type { Cliente } from '../types';
import { aplicarMascaraCpf, aplicarMascaraTelefone } from '../utils/formatters';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteParaEditar?: Cliente | null;
  onSalvo: () => void;
}

export function ClientFormModal({
  isOpen,
  onClose,
  clienteParaEditar,
  onSalvo,
}: ClientFormModalProps) {
  const isEditing = !!clienteParaEditar;

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erroCpf, setErroCpf] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clienteParaEditar) {
      setNome(clienteParaEditar.nome || '');
      setCpf(clienteParaEditar.cpf ? aplicarMascaraCpf(clienteParaEditar.cpf) : '');
      setTelefone(clienteParaEditar.telefone ? aplicarMascaraTelefone(clienteParaEditar.telefone) : '');
    } else {
      setNome('');
      setCpf('');
      setTelefone('');
    }
    setErroCpf(null);
  }, [clienteParaEditar, isOpen]);

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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = aplicarMascaraCpf(e.target.value);
    setCpf(formatado);
    if (erroCpf) setErroCpf(null);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = aplicarMascaraTelefone(e.target.value);
    setTelefone(formatado);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('O nome do cliente é obrigatório.');
      return;
    }

    const apenasDigitosCpf = cpf.replace(/\D/g, '') || null;
    const apenasDigitosTelefone = telefone.replace(/\D/g, '') || null;

    const payload = {
      nome: nome.trim(),
      cpf: apenasDigitosCpf,
      telefone: apenasDigitosTelefone,
    };

    try {
      setIsSubmitting(true);
      setErroCpf(null);

      if (isEditing) {
        await api.put(`/clientes/${clienteParaEditar.id_cliente}`, payload);
        toast.success('Dados do cliente atualizados com sucesso!');
      } else {
        await api.post('/clientes', payload);
        toast.success('Cliente cadastrado com sucesso!');
      }

      onSalvo();
      onClose();
    } catch (err: unknown) {
      const dataErro = (err as { response?: { status?: number; data?: { erro?: string } } })?.response?.data?.erro;
      const status = (err as { response?: { status?: number } })?.response?.status;

      // Tratamento específico de CPF Duplicado (HTTP 400 ou 409)
      if (dataErro === 'CPF já cadastrado' || (dataErro && dataErro.toLowerCase().includes('cpf'))) {
        setErroCpf(dataErro);
        toast.error(`Atenção: ${dataErro}! Verifique o documento digitado.`);
      } else {
        toast.error(dataErro || `Erro ${status || ''} ao processar cadastro do cliente.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-luxury-lg border border-gold/30 w-full max-w-lg overflow-hidden animate-fadeIn text-navy-deep">

        {/* ── Topo do Modal ──────────────────────────────────────────── */}
        <div className="bg-navy-deep px-6 py-5 border-b border-gold/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold">
                Relacionamento & Fidelidade
              </p>
              <h2 className="font-serif text-xl text-white">
                {isEditing ? `Editar Cliente #${clienteParaEditar.id_cliente}` : 'Cadastrar Novo Cliente'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Formulário ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Nome do Cliente */}
          <div>
            <label className="label-luxury">
              Nome Completo <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Clara Sampaio, Roberto Albuquerque..."
              className="input-luxury"
              maxLength={100}
              autoFocus
            />
          </div>

          {/* CPF com Validação e Alerta de Duplicidade */}
          <div>
            <label className="label-luxury flex items-center justify-between">
              <span>CPF (Opcional para Nota / Fidelidade)</span>
              {erroCpf && (
                <span className="text-[10px] text-danger font-bold lowercase tracking-normal">
                  ⚠ {erroCpf}
                </span>
              )}
            </label>
            <input
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`input-luxury font-mono text-xs ${
                erroCpf ? 'border-danger focus:ring-danger/40 bg-red-50/30' : ''
              }`}
            />
            {erroCpf ? (
              <p className="text-[11px] text-danger mt-1 font-medium">
                Este CPF já se encontra associado a outro cliente no sistema.
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">
                Utilizado para identificação rápida no caixa PDV e emissão de cupom fiscal.
              </p>
            )}
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="label-luxury">Telefone / WhatsApp</label>
            <input
              type="text"
              value={telefone}
              onChange={handleTelefoneChange}
              placeholder="(00) 00000-0000"
              maxLength={15}
              className="input-luxury font-mono text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Informe DDD + Número (ex: fixo ou celular).
            </p>
          </div>

          {/* ── Botões de Ação ────────────────────────────────────────── */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
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
              disabled={isSubmitting}
              className="btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover py-2.5 px-6 text-xs font-semibold shadow-luxury flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-gold" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span className="text-gold">✦</span>
                  <span>{isEditing ? 'Atualizar Cliente' : 'Salvar Cadastro'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

