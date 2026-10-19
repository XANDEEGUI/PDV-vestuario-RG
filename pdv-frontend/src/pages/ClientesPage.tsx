import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { ClientFormModal } from '../components/ClientFormModal';
import { DeleteClientModal } from '../components/DeleteClientModal';
import { formatarCpf, formatarTelefone } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { Cliente } from '../types';
import toast from 'react-hot-toast';

export default function ClientesPage() {
  const { usuario } = useAuth();
  const isGerente = usuario?.cargo === 'gerente';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clienteExcluindo, setClienteExcluindo] = useState<Cliente | null>(null);

  // ── Carregar Clientes da API ─────────────────────────────────────────
  const carregarClientes = useCallback(async (termo?: string) => {
    try {
      setIsLoading(true);
      const url = termo ? `/clientes?busca=${encodeURIComponent(termo)}` : '/clientes';
      const { data } = await api.get<Cliente[]>(url);
      setClientes(data);
    } catch {
      toast.error('Erro ao carregar lista de clientes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarClientes(busca.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, carregarClientes]);

  // Handlers para ações
  const handleNovoCliente = () => {
    setClienteEditando(null);
    setIsFormModalOpen(true);
  };

  const handleEditar = (cli: Cliente) => {
    setClienteEditando(cli);
    setIsFormModalOpen(true);
  };

  const handleExcluir = (cli: Cliente) => {
    setClienteExcluindo(cli);
    setIsDeleteModalOpen(true);
  };

  // Métricas
  const totalClientes = clientes.length;
  const clientesComCpf = clientes.filter((c) => !!c.cpf).length;
  const clientesComTelefone = clientes.filter((c) => !!c.telefone).length;

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans select-none">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── Cabeçalho da Página ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-sans font-semibold tracking-[0.3em] uppercase text-gold">
                Base de Fidelidade
              </span>
              <span className="badge-gold !text-[9px]">Atendimento Boutique</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-navy-deep">
              Clientes & Relacionamento
            </h1>
            <p className="text-xs text-navy-muted font-sans mt-0.5">
              Gestão da carteira de clientes para identificação rápida no caixa PDV e emissão fiscal.
            </p>
          </div>

          {/* Botão Novo Cliente */}
          <button
            type="button"
            onClick={handleNovoCliente}
            className="btn-primary !bg-navy-deep !text-white hover:!bg-navy-hover border border-gold/40 shadow-luxury py-3 px-5 text-xs font-semibold flex items-center justify-center gap-2 group"
          >
            <span className="text-gold group-hover:scale-125 transition-transform">✦</span>
            <span>Cadastrar Novo Cliente</span>
          </button>
        </div>

        {/* ── Cards de Métricas ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Total */}
          <div className="card-luxury p-4 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Total de Clientes
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-2xl text-navy-deep font-bold">
                {totalClientes}
              </span>
              <span className="text-xs text-slate-400">cadastrados</span>
            </div>
          </div>

          {/* Com CPF */}
          <div className="card-luxury p-4 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Identificados com CPF
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-2xl text-gold font-bold">
                {clientesComCpf}
              </span>
              <span className="text-xs text-slate-400">aptos p/ nota fiscal</span>
            </div>
          </div>

          {/* Com Contato */}
          <div className="card-luxury p-4 flex flex-col justify-between">
            <span className="text-[10px] font-sans uppercase tracking-widest text-navy-muted font-semibold">
              Contatos Registrados
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-serif text-2xl text-emerald-700 font-bold">
                {clientesComTelefone}
              </span>
              <span className="text-xs text-slate-400">WhatsApp / Fone</span>
            </div>
          </div>

        </div>

        {/* ── Barra de Pesquisa por Nome ou CPF ──────────────────────── */}
        <div className="card-luxury p-4 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-lg">
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
              placeholder="Buscar por Nome do Cliente ou CPF..."
              className="input-luxury pl-10 py-2.5 text-xs"
            />
          </div>

          <span className="text-xs text-navy-muted hidden sm:inline">
            {clientes.length} {clientes.length === 1 ? 'cliente listado' : 'clientes listados'}
          </span>
        </div>

        {/* ── Tabela de Clientes ─────────────────────────────────────── */}
        <div className="card-luxury overflow-hidden">
          <div className="overflow-x-auto scrollbar-luxury">
            <table className="table-luxury">
              <thead>
                <tr className="bg-surface/70">
                  <th className="w-16">ID</th>
                  <th>Nome do Cliente</th>
                  <th>CPF</th>
                  <th>Telefone / Contato</th>
                  <th className="text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {clientes.map((cliente) => {
                  const digitosTel = cliente.telefone?.replace(/\D/g, '') || '';
                  const isCelular = digitosTel.length === 11;

                  return (
                    <tr key={cliente.id_cliente} className="hover:bg-surface/50 transition-colors">

                      {/* ID */}
                      <td className="font-mono text-xs text-slate-400">
                        #{String(cliente.id_cliente).padStart(3, '0')}
                      </td>

                      {/* Nome do Cliente */}
                      <td className="font-semibold text-navy-deep text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gold/15 text-gold border border-gold/30 flex items-center justify-center font-serif text-xs font-bold">
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <span>{cliente.nome}</span>
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="font-mono text-xs">
                        {cliente.cpf ? (
                          <span className="px-2 py-0.5 rounded bg-surface border border-border text-navy-deep font-medium">
                            {formatarCpf(cliente.cpf)}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">Não informado</span>
                        )}
                      </td>

                      {/* Telefone */}
                      <td className="font-mono text-xs">
                        {cliente.telefone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">
                              {formatarTelefone(cliente.telefone)}
                            </span>
                            {isCelular && (
                              <a
                                href={`https://wa.me/55${digitosTel}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Abrir conversa no WhatsApp"
                                className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors font-sans font-semibold"
                              >
                                WhatsApp ↗
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditar(cliente)}
                            className="p-1.5 rounded hover:bg-surface text-navy-muted hover:text-navy-deep transition-colors"
                            title="Editar cliente"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Exclusão visível apenas para Gerente */}
                          {isGerente && (
                            <button
                              type="button"
                              onClick={() => handleExcluir(cliente)}
                              className="p-1.5 rounded hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors"
                              title="Excluir cliente (Gerente)"
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

                {clientes.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <p className="font-serif text-base text-navy-muted">
                        Nenhum cliente cadastrado ou encontrado
                      </p>
                      <p className="text-xs mt-1">
                        Utilize o botão acima para cadastrar o primeiro cliente na base.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── Modal de Cadastro e Edição de Cliente ───────────────────── */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        clienteParaEditar={clienteEditando}
        onSalvo={() => carregarClientes(busca.trim())}
      />

      {/* ── Modal de Confirmação de Exclusão (Gerente) ──────────────── */}
      <DeleteClientModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        cliente={clienteExcluindo}
        onExcluido={() => carregarClientes(busca.trim())}
      />

    </div>
  );
}
