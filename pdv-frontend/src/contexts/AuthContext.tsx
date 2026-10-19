import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Usuario } from '../types';

// ── Tipos do contexto ─────────────────────────────────────────────────────────
interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers de persistência ───────────────────────────────────────────────────
const STORAGE_TOKEN   = 'token';
const STORAGE_USUARIO = 'usuario';

function loadFromStorage(): AuthState {
  try {
    const token   = localStorage.getItem(STORAGE_TOKEN);
    const raw     = localStorage.getItem(STORAGE_USUARIO);
    const usuario = raw ? (JSON.parse(raw) as Usuario) : null;
    return { token, usuario, isAuthenticated: !!token && !!usuario };
  } catch {
    return { token: null, usuario: null, isAuthenticated: false };
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  // Sincroniza com outros tabs
  useEffect(() => {
    const handler = () => setState(loadFromStorage());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const login = useCallback((token: string, usuario: Usuario) => {
    localStorage.setItem(STORAGE_TOKEN,   token);
    localStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario));
    setState({ token, usuario, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USUARIO);
    setState({ token: null, usuario: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

