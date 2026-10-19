import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function Navbar() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Sessão encerrada com segurança.');
    navigate('/login', { replace: true });
  };

  const isGerente = usuario?.cargo === 'gerente';
  const podeVerLucro = usuario?.cargo === 'gerente' || usuario?.cargo === 'vendedor';

  const navItems = [
    { to: '/pdv', label: 'Caixa PDV', badge: 'F2' },
    ...(isGerente ? [{ to: '/produtos', label: 'Gestão de Produtos', badge: 'Gerente' }] : []),
    { to: '/clientes', label: 'Clientes', badge: undefined },
    ...(podeVerLucro ? [{ to: '/historico', label: 'Histórico & Lucros', badge: 'Lucro' }] : []),
  ];

  return (
    <header className="bg-navy-deep text-white border-b border-gold/20 shadow-luxury sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo Editorial ────────────────────────────────────────── */}
          <div className="flex items-center gap-6">
            <Link to={isGerente ? '/produtos' : '/pdv'} className="group flex items-center gap-3">
              <div className="w-8 h-8 rounded border border-gold/40 flex items-center justify-center bg-navy-light group-hover:border-gold transition-colors duration-200">
                <span className="font-serif text-gold text-lg font-bold">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg tracking-wider text-white font-medium group-hover:text-gold transition-colors duration-200">
                  BOUTIQUE <span className="text-gold italic font-normal">PDV</span>
                </span>
                <span className="text-[9px] tracking-[0.25em] text-slate-400 uppercase font-sans">
                  Luxury Apparel
                </span>
              </div>
            </Link>

            {/* ── Menu de Navegação ──────────────────────────────────── */}
            <nav className="hidden md:flex items-center space-x-1 ml-4 border-l border-white/10 pl-5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-sans font-medium tracking-wide transition-all duration-150 flex items-center gap-2 ${
                      isActive
                        ? 'bg-gold/15 text-gold border border-gold/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive ? 'bg-gold/25 text-gold' : 'bg-white/10 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Perfil do Usuário e Logout ────────────────────────────── */}
          <div className="flex items-center gap-4">
            {usuario && (
              <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-serif text-sm font-semibold">
                  {usuario.nome.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-sans font-medium text-white truncate max-w-[140px]">
                    {usuario.nome}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      usuario.cargo === 'gerente' ? 'bg-gold' : 'bg-emerald-400'
                    }`} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gold/90 font-sans">
                      {usuario.cargo}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Sair */}
            <button
              onClick={handleLogout}
              title="Encerrar sessão"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-white/15 text-slate-300 hover:text-white hover:border-red-400/40 hover:bg-red-500/10 text-xs font-sans transition-all duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

