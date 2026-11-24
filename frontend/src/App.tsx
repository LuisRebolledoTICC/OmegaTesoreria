import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginView } from './pages/LoginView';
import { DashboardView } from './pages/DashboardView';
import { CajasView } from './pages/CajasView';
import { ConteoEfectivoView } from './pages/ConteoEfectivoView';
import { OperacionesView } from './pages/OperacionesView';
import { ReportesView } from './pages/ReportesView';
import { UsuariosView } from './pages/UsuariosView';
import { RespaldosView } from './pages/RespaldosView';
import { VentasView } from './pages/VentasView';
import { Caja, DashboardSummary } from './types';
import { api } from './services/api';
import { Lock } from 'lucide-react';

const ORDERED_TABS: ActiveTab[] = [
  'dashboard',
  'ventas',
  'cajas',
  'conteo',
  'operaciones',
  'reportes',
  'usuarios',
];

const MainLayout: React.FC = () => {
  const { user, canAccessModule, logout } = useAuth();
  const availableTabs = ORDERED_TABS.filter((t) => canAccessModule(t));
  const firstAvailableTab = availableTabs[0] || null;

  const [activeTab, setActiveTab] = useState<ActiveTab | null>(() => firstAvailableTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedCajaIdForConteo, setSelectedCajaIdForConteo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, cajasData] = await Promise.all([
        api.getDashboardSummary(),
        api.getCajas(true),
      ]);
      setSummary(sumData);
      setCajas(cajasData);
    } catch (err) {
      console.error('Error cargando datos principales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Redirigir automáticamente al primer módulo permitido si no hay pestaña o si se pierde acceso
  useEffect(() => {
    if (user) {
      if (!activeTab || !canAccessModule(activeTab)) {
        if (firstAvailableTab) {
          setActiveTab(firstAvailableTab);
        }
      }
    }
  }, [user, user?.modulosPermitidos, activeTab, firstAvailableTab]);

  if (!user) {
    return <LoginView />;
  }

  // Pantalla cuando el usuario no tiene ningún módulo disponible
  if (availableTabs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-200">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Sin módulos disponibles</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Tu cuenta (<span className="font-semibold text-slate-800">{user.userName}</span>) no tiene permisos asignados para acceder a ningún apartado del sistema. Contacta a un administrador para que habilite módulos a tu rol.
          </p>
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const handleNavigateToConteo = (cajaId: number) => {
    setSelectedCajaIdForConteo(cajaId);
    if (canAccessModule('conteo')) {
      setActiveTab('conteo');
    }
  };

  const titles: Record<ActiveTab, string> = {
    dashboard: 'Panel General de Tesorería',
    ventas: 'Ventas y Pedidos',
    cajas: 'Administración de Cajas',
    conteo: 'Conteo Físico de Efectivo',
    operaciones: 'Movimientos por Cada Caja',
    reportes: 'Reportes y Exportación',
    usuarios: 'Administración de Usuarios y Permisos',
  };

  const currentTab = (activeTab && canAccessModule(activeTab) ? activeTab : firstAvailableTab) as ActiveTab;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 font-sans print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar fija en desktop/tablet y drawer en móvil */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={(tab) => {
          if (canAccessModule(tab)) {
            setActiveTab(tab);
          }
        }}
        selectedCajaIdForConteo={selectedCajaIdForConteo}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden print:h-auto print:overflow-visible">
        <Navbar
          title={titles[currentTab]}
          onRefresh={loadData}
          loading={loading}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto w-full max-w-7xl mx-auto print:p-0 print:overflow-visible print:max-w-none">
          {currentTab === 'dashboard' && canAccessModule('dashboard') && (
            <DashboardView
              summary={summary}
              loading={loading}
              onNavigateToConteo={handleNavigateToConteo}
              setActiveTab={(tab) => {
                if (canAccessModule(tab)) setActiveTab(tab);
              }}
            />
          )}

          {currentTab === 'ventas' && canAccessModule('ventas') && (
            <VentasView
              cajas={cajas}
              onEntradaRealizada={loadData}
            />
          )}

          {currentTab === 'cajas' && canAccessModule('cajas') && (
            <CajasView
              cajas={cajas}
              onRefresh={loadData}
              onNavigateToConteo={handleNavigateToConteo}
            />
          )}

          {currentTab === 'conteo' && canAccessModule('conteo') && (
            <ConteoEfectivoView
              cajas={cajas}
              selectedCajaId={selectedCajaIdForConteo}
              onConteoGuardado={loadData}
            />
          )}

          {currentTab === 'operaciones' && canAccessModule('operaciones') && (
            <OperacionesView
              cajas={cajas}
              onOperationCompleted={loadData}
            />
          )}

          {currentTab === 'reportes' && canAccessModule('reportes') && (
            <ReportesView
              summary={summary}
              cajas={cajas}
            />
          )}

          {currentTab === 'usuarios' && canAccessModule('usuarios') && <UsuariosView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
