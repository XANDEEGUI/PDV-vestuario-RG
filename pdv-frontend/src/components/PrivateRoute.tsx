import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Cargo } from '../types';

interface PrivateRouteProps {
  /** Cargos permitidos. Se omitido, qualquer usuário autenticado pode acessar. */
  allowedRoles?: Cargo[];
}

/**
 * Rota protegida por autenticação JWT.
 *
 * Lê o estado do AuthContext (fonte primária) e,
 * como segurança extra, consulta o localStorage diretamente —
 * garantindo que uma race condition de render não cause redirect falso.
 */
export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, usuario } = useAuth();
  const location = useLocation();

  // ── Fallback: leitura direta do localStorage ──────────────────────────────
  // Evita que uma atualização de estado ainda não aplicada cause redirect falso.
  const tokenInStorage   = localStorage.getItem('token');
  const usuarioRaw       = localStorage.getItem('usuario');
  const usuarioInStorage = usuarioRaw
    ? (() => { try { return JSON.parse(usuarioRaw) as { cargo: Cargo }; } catch { return null; } })()
    : null;

  const effectivelyAuthenticated = isAuthenticated || !!tokenInStorage;
  const effectiveCargo = usuario?.cargo ?? usuarioInStorage?.cargo;

  // ── 1. Não autenticado → /login ───────────────────────────────────────────
  if (!effectivelyAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 2. Autenticado mas cargo não autorizado → fallback da role ────────────
  if (allowedRoles && effectiveCargo && !allowedRoles.includes(effectiveCargo)) {
    const fallback = effectiveCargo === 'gerente' ? '/produtos' : '/pdv';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
