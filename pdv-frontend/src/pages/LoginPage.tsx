import { useState, useCallback, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { LoginResponse } from '../types';

// ── Ícones inline SVG (sem dependência extra) ────────────────────────
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function IconLoader() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ── Componente Principal ─────────────────────────────────────────────
export default function LoginPage() {
  const navigate              = useNavigate();
  const { login, isAuthenticated, usuario } = useAuth();

  const [email,       setEmail]       = useState('');
  const [senha,       setSenha]       = useState('');
  const [showSenha,   setShowSenha]   = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);

  // ── Redireciona se já autenticado (ex.: voltar ao /login com token válido) ──
  useEffect(() => {
    if (isAuthenticated && usuario) {
      const dest = usuario.cargo === 'gerente' ? '/produtos' : '/pdv';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, usuario, navigate]);

  // ── Flag para disparar o redirect somente após login bem-sucedido ──
  const pendingCargo = useRef<string | null>(null);

  useEffect(() => {
    if (pendingCargo.current && isAuthenticated && usuario) {
      const dest = pendingCargo.current === 'gerente' ? '/produtos' : '/pdv';
      pendingCargo.current = null;
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, usuario, navigate]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!email.trim() || !senha) {
        toast.error('Preencha e-mail e senha para continuar.');
        return;
      }

      setIsLoading(true);

      try {
        const { data } = await api.post<LoginResponse>('/login', {
          email: email.trim().toLowerCase(),
          senha,
        });

        // Marca o cargo pendente ANTES de chamar login(),
        // para que o useEffect acima possa navegar assim que o Context atualizar
        pendingCargo.current = data.usuario.cargo;

        login(data.token, data.usuario);

        toast.success(`Bem-vindo(a), ${data.usuario.nome.split(' ')[0]}!`);

        // navigate() direto como fallback imediato
        const dest = data.usuario.cargo === 'gerente' ? '/produtos' : '/pdv';
        navigate(dest, { replace: true });

      } catch (err: unknown) {
        pendingCargo.current = null;
        const msg =
          (err as { response?: { data?: { erro?: string } } })
            ?.response?.data?.erro ?? 'Credenciais inválidas. Tente novamente.';
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [email, senha, login, navigate],
  );

  return (
    <div className="min-h-screen flex">

      {/* ── Painel Esquerdo: Identidade Visual ────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #0A1128 0%, #14213D 60%, #0A1128 100%)' }}
      >
        {/* Textura decorativa */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #C5A059 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ornamento dourado superior */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-px bg-gold" />
            <span className="text-gold/70 text-[10px] tracking-[0.3em] uppercase font-sans font-medium">
              Luxury Boutique
            </span>
            <div className="w-8 h-px bg-gold" />
          </div>
        </div>

        {/* Conteúdo central */}
        <div className="relative z-10 px-12 pb-4">
          <div className="mb-6">
            <div className="w-16 h-px bg-gold mb-8" />
            <h1
              className="text-serif-display text-white leading-[1.1]"
              style={{ fontSize: '3.2rem', fontFamily: "'Playfair Display', serif" }}
            >
              Boutique<br />
              <em className="text-gold not-italic">Management</em><br />
              System
            </h1>
            <div className="w-16 h-px bg-gold/40 mt-8" />
          </div>

          <p className="text-white/40 font-sans text-sm leading-relaxed max-w-xs mt-6">
            Sistema integrado de ponto de venda, gestão de estoque e
            relacionamento com clientes para boutiques de moda de luxo.
          </p>
        </div>

        {/* Rodapé do painel esquerdo */}
        <div className="relative z-10 p-12">
          <p className="text-white/20 text-[10px] font-sans tracking-widest uppercase">
            © {new Date().getFullYear()} Vestuário Senai · Todos os direitos reservados
          </p>
        </div>

        {/* Elemento decorativo circular */}
        <div
          className="absolute -right-32 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ border: '80px solid #C5A059' }}
        />
        <div
          className="absolute -right-48 top-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.03]"
          style={{ border: '80px solid #C5A059' }}
        />
      </div>

      {/* ── Painel Direito: Formulário de Login ───────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-canvas px-8 py-12">

        {/* Logo mobile */}
        <div className="lg:hidden text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-6 h-px bg-gold" />
            <span className="text-gold/70 text-[10px] tracking-[0.3em] uppercase font-sans font-medium">
              Luxury Boutique
            </span>
            <div className="w-6 h-px bg-gold" />
          </div>
          <h1
            className="text-navy-deep text-serif-display"
            style={{ fontSize: '2rem', fontFamily: "'Playfair Display', serif" }}
          >
            Boutique Management System
          </h1>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Cabeçalho do formulário */}
          <div className="mb-10">
            <p className="text-[10px] font-sans font-semibold tracking-[0.3em] uppercase text-gold mb-3">
              Acesso ao sistema
            </p>
            <h2
              className="text-serif-display text-navy-deep"
              style={{ fontSize: '1.9rem', fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}
            >
              Bem-vindo(a) de volta
            </h2>
            <p className="text-sm text-navy-muted font-sans mt-2">
              Insira suas credenciais para acessar o painel.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Campo E-mail */}
            <div>
              <label htmlFor="email" className="label-luxury">
                E-mail
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-muted/50 pointer-events-none">
                  <IconMail />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="input-luxury pl-11"
                  required
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="senha" className="label-luxury">
                Senha
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-muted/50 pointer-events-none">
                  <IconLock />
                </span>
                <input
                  id="senha"
                  type={showSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={isLoading}
                  className="input-luxury pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-muted/50 hover:text-navy-deep transition-colors duration-150"
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconEye open={showSenha} />
                </button>
              </div>
            </div>

            {/* Divisor ouro */}
            <div className="pt-2">
              <div className="divider-gold !my-0" />
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {isLoading ? (
                <>
                  <IconLoader />
                  <span>Autenticando…</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
              )}
            </button>

          </form>

          {/* Indicadores de cargo (informativo, remove em produção) */}
          <div className="mt-10 p-4 rounded-md bg-surface border border-border">
            <p className="text-[10px] font-sans font-semibold tracking-widest uppercase text-navy-muted mb-3">
              Perfis de acesso
            </p>
            <div className="space-y-1.5">
              {[
                { cargo: 'Gerente',  destino: '/produtos', desc: 'Dashboard de gestão' },
                { cargo: 'Vendedor', destino: '/pdv',      desc: 'Caixa do PDV' },
                { cargo: 'Caixa',   destino: '/pdv',      desc: 'Caixa do PDV' },
              ].map(({ cargo, destino, desc }) => (
                <div key={cargo} className="flex items-center justify-between text-xs font-sans">
                  <span className="font-medium text-navy-deep">{cargo}</span>
                  <span className="text-navy-muted">
                    {desc}{' '}
                    <code className="text-gold/80 bg-gold/10 px-1 rounded text-[10px]">
                      {destino}
                    </code>
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

