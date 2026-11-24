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
import { Caja, DashboardSummary } from './types';
import { api } from './services/api';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
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

  if (!user) {
    return <LoginView />;
  }

  const handleNavigateToConteo = (cajaId: number) => {
    setSelectedCajaIdForConteo(cajaId);
    setActiveTab('conteo');
  };

  const titles: Record<ActiveTab, string> = {
    dashboard: 'Panel General de Tesorería',
    cajas: 'Administración de Cajas',
    conteo: 'Conteo Físico de Efectivo',
    operaciones: 'Movimientos por Cada Caja',
    reportes: 'Reportes y Exportación',
    usuarios: 'Administración de Usuarios y Permisos',
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar fijo */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCajaIdForConteo={selectedCajaIdForConteo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          title={titles[activeTab]}
          onRefresh={loadData}
          loading={loading}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              loading={loading}
              onNavigateToConteo={handleNavigateToConteo}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'cajas' && (
            <CajasView
              cajas={cajas}
              onRefresh={loadData}
              onNavigateToConteo={handleNavigateToConteo}
            />
          )}

          {activeTab === 'conteo' && (
            <ConteoEfectivoView
              cajas={cajas}
              selectedCajaId={selectedCajaIdForConteo}
              onConteoGuardado={loadData}
            />
          )}

          {activeTab === 'operaciones' && (
            <OperacionesView
              cajas={cajas}
              onOperationCompleted={loadData}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesView
              summary={summary}
              cajas={cajas}
            />
          )}

          {activeTab === 'usuarios' && <UsuariosView />}
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
