import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';

// ── Páginas ───────────────────────────────────────────────────────────────────
import LoginPage    from './pages/LoginPage';
import PdvPage      from './pages/PdvPage';
import ProdutosPage from './pages/ProdutosPage';
import ClientesPage from './pages/ClientesPage';
import HistoricoVendasPage from './pages/HistoricoVendasPage';

// ── Configuração de Toast Luxury ──────────────────────────────────────────────
const toastOptions = {
  duration: 3500,
  style: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize:   '13px',
    fontWeight: '500',
    background: '#0A1128',
    color:      '#FAF9F6',
    border:     '1px solid #C5A05930',
    borderRadius: '6px',
    padding:    '12px 16px',
    boxShadow:  '0 4px 24px rgba(10,17,40,0.25)',
  },
  success: {
    iconTheme: { primary: '#C5A059', secondary: '#0A1128' },
  },
  error: {
    iconTheme: { primary: '#DC2626', secondary: '#FAF9F6' },
    style: {
      background: '#0A1128',
      border: '1px solid #DC262630',
    },
  },
} as const;

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Pública ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Protegidas: qualquer usuário autenticado ── */}
          <Route element={<PrivateRoute />}>
            <Route path="/pdv"      element={<PdvPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
          </Route>

          {/* ── Protegidas: apenas gerente ── */}
          <Route element={<PrivateRoute allowedRoles={['gerente']} />}>
            <Route path="/produtos" element={<ProdutosPage />} />
          </Route>

          {/* ── Protegidas: apenas gerente e vendedor ── */}
          <Route element={<PrivateRoute allowedRoles={['gerente', 'vendedor']} />}>
            <Route path="/historico" element={<HistoricoVendasPage />} />
            <Route path="/historico-vendas" element={<HistoricoVendasPage />} />
          </Route>

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

      {/* ── Notificações globais ── */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={toastOptions}
      />
    </AuthProvider>
  );
}
