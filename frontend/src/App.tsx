import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { usePwa } from './hooks/usePwa';
import { LoginView } from './pages/LoginView';
import { InicioView } from './pages/InicioView';
import { DashboardView } from './pages/DashboardView';
import { DeudasView } from './pages/DeudasView';
import { EventosView } from './pages/EventosView';
import { CajasView } from './pages/CajasView';
import { ConteoEfectivoView } from './pages/ConteoEfectivoView';
import { OperacionesView } from './pages/OperacionesView';
import { ReportesView } from './pages/ReportesView';
import { UsuariosView } from './pages/UsuariosView';
import { RespaldosView } from './pages/RespaldosView';
import { VentasView } from './pages/VentasView';
import { AreasView } from './pages/AreasView';
import { InventariosView } from './pages/InventariosView';
import { PresupuestosView } from './pages/PresupuestosView';
import { Caja, DashboardSummary } from './types';
import { api } from './services/api';
import { Lock, WifiOff, RefreshCw, Share, X, Download } from 'lucide-react';

const ORDERED_TABS: ActiveTab[] = [
  'inicio',
  'dashboard',
  'deudas',
  'eventos',
  'ventas',
  'cajas',
  'conteo',
  'operaciones',
  'presupuestos',
  'areas',
  'inventarios',
  'reportes',
  'usuarios',
];

const MainLayout: React.FC = () => {
  const { user, canAccessModule, logout } = useAuth();
  const canAccessTab = (tab: ActiveTab) =>
    tab === 'inventarios'
      ? canAccessModule('inventarios') || canAccessModule('inventarios_ver_todos')
      : tab === 'presupuestos'
      ? canAccessModule('presupuestos') || canAccessModule('presupuestos_ver_todos') || canAccessModule('presupuestos_administrar') || canAccessModule('presupuestos_consultar_mi_area') || canAccessModule('presupuestos_consultar_todos')
      : tab === 'deudas'
      ? canAccessModule('deudas_consultar_propias') || canAccessModule('deudas_consultar_todos') || canAccessModule('deudas_consultar_detalle') || canAccessModule('deudas_actividades_crear') || canAccessModule('deudas_actividades_editar') || canAccessModule('deudas_actividades_asignar') || canAccessModule('deudas_pagos_registrar') || canAccessModule('deudas_pagos_revertir') || canAccessModule('deudas_pagos_historial') || canAccessModule('deudas_movimientos_bancarios')
      : tab === 'eventos'
      ? canAccessModule('eventos_consultar') || canAccessModule('eventos_crear') || canAccessModule('eventos_editar') || canAccessModule('eventos_cancelar') || canAccessModule('eventos_eliminar')
      : canAccessModule(tab);
  const availableTabs = ORDERED_TABS.filter((t) => canAccessTab(t));
  const firstAvailableTab = availableTabs[0] || null;

  const [activeTab, setActiveTab] = useState<ActiveTab | null>(() => firstAvailableTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedCajaIdForConteo, setSelectedCajaIdForConteo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const pwa = usePwa();

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
      if (!activeTab || !canAccessTab(activeTab)) {
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
    inicio: 'Inicio de Grupo Omega',
    dashboard: 'Panel General de Tesorería',
    deudas: 'Módulo de Deudas y Actividades',
    eventos: 'Eventos de Omega',
    ventas: 'Ventas y Pedidos',
    cajas: 'Administración de Cajas',
    conteo: 'Conteo Físico de Efectivo',
    operaciones: 'Movimientos por Cada Caja',
    presupuestos: 'Presupuestos por Área',
    areas: 'Administración de Áreas',
    inventarios: 'Control de Inventarios',
    reportes: 'Reportes y Exportación',
    usuarios: 'Administración de Usuarios y Permisos',
  };

  const currentTab = (activeTab && canAccessTab(activeTab) ? activeTab : firstAvailableTab) as ActiveTab;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 font-sans print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar fija en desktop/tablet y drawer en móvil */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={(tab) => {
          if (canAccessTab(tab)) {
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
          isOnline={pwa.isOnline}
          canInstallApp={pwa.canInstall}
          onInstallApp={pwa.promptInstall}
        />

        {/* Banner de pérdida de conexión */}
        {!pwa.isOnline && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 print:hidden">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Sin conexión a internet. Las consultas y registros requieren conexión con el servidor.
            </span>
          </div>
        )}

        {/* Banner de actualización automática de PWA */}
        {pwa.updateAvailable && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
            <div className="flex items-center gap-2 text-amber-950 font-semibold">
              <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Nueva versión de Omega Tesorería disponible.</span>
            </div>
            <button
              type="button"
              onClick={pwa.applyUpdate}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Actualizar ahora
            </button>
          </div>
        )}

        {/* Guía discreta de instalación en iOS Safari */}
        {pwa.isIosSafari && !pwa.installDismissed && (
          <div className="md:hidden bg-slate-900 text-slate-100 px-3 py-2 text-[11px] flex items-center justify-between gap-2 shrink-0 print:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <Share className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                Instala Omega: toca <strong>Compartir</strong> y elige <strong>Agregar a inicio</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={pwa.dismissInstallBanner}
              aria-label="Cerrar aviso de instalación"
              className="p-1 text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner discreto de instalación en Android cuando no está instalada */}
        {pwa.canInstall && !pwa.installDismissed && (
          <div className="md:hidden bg-slate-900 text-slate-100 px-3 py-2 text-[11px] flex items-center justify-between gap-2 shrink-0 print:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <Download className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Instala Omega Tesorería como app en tu teléfono.</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={pwa.promptInstall}
                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-md text-[11px]"
              >
                Instalar
              </button>
              <button
                type="button"
                onClick={pwa.dismissInstallBanner}
                aria-label="Cerrar"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto w-full max-w-7xl mx-auto print:p-0 print:overflow-visible print:max-w-none">
          {currentTab === 'inicio' && canAccessTab('inicio') && (
            <InicioView
              setActiveTab={(tab) => {
                if (canAccessTab(tab)) setActiveTab(tab);
              }}
            />
          )}

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

          {currentTab === 'deudas' && canAccessTab('deudas') && (
            <DeudasView
              cajas={cajas}
              onBalanceChanged={loadData}
            />
          )}

          {currentTab === 'eventos' && canAccessTab('eventos') && (
            <EventosView />
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

          {currentTab === 'presupuestos' && canAccessTab('presupuestos') && (
            <PresupuestosView
              cajas={cajas}
              onBalanceChanged={loadData}
            />
          )}

          {currentTab === 'areas' && canAccessModule('areas') && <AreasView />}

          {currentTab === 'inventarios' && canAccessTab('inventarios') && <InventariosView />}

          {currentTab === 'reportes' && canAccessModule('reportes') && (
            <ReportesView
              summary={summary}
              cajas={cajas}
            />
          )}

          {currentTab === 'usuarios' && canAccessModule('usuarios') && <UsuariosView />}
        </main>

        {/* Barra de navegación inferior para teléfonos (< md) */}
        <MobileBottomNav
          activeTab={currentTab}
          availableTabs={availableTabs}
          onSelectTab={(tab) => {
            if (canAccessTab(tab)) setActiveTab(tab);
          }}
          onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
        />
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
