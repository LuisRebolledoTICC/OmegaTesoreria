import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calculator,
  ArrowLeftRight,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'ventas'
  | 'cajas'
  | 'conteo'
  | 'operaciones'
  | 'reportes'
  | 'usuarios';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedCajaIdForConteo?: number | null;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
}) => {
  const { user, logout, canAccessModule } = useAuth();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('omega_sidebar_collapsed');
    return saved === 'true';
  });
  const [tooltip, setTooltip] = useState<{ label: string; subLabel?: string; top: number } | null>(null);

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = externalSetIsCollapsed !== undefined ? externalSetIsCollapsed : setInternalIsCollapsed;

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    setTooltip(null);
    localStorage.setItem('omega_sidebar_collapsed', String(nextState));
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setTooltip(null);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, show: canAccessModule('dashboard') },
    { id: 'ventas' as ActiveTab, label: 'Ventas y Pedidos', icon: ShoppingBag, show: canAccessModule('ventas') },
    { id: 'cajas' as ActiveTab, label: 'Cajas de Tesorería', icon: Wallet, show: canAccessModule('cajas') },
    { id: 'conteo' as ActiveTab, label: 'Conteo de Efectivo', icon: Calculator, show: canAccessModule('conteo') },
    { id: 'operaciones' as ActiveTab, label: 'Movimientos por Caja', icon: ArrowLeftRight, show: canAccessModule('operaciones') },
    { id: 'reportes' as ActiveTab, label: 'Reportes y Excel', icon: FileSpreadsheet, show: canAccessModule('reportes') },
    { id: 'usuarios' as ActiveTab, label: 'Usuarios y Permisos', icon: Users, show: canAccessModule('usuarios') },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  const showFloatingTooltip = (e: React.MouseEvent<HTMLElement>, label: string, subLabel?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      label,
      subLabel,
      top: rect.top + rect.height / 2,
    });
  };

  return (
    <>
      {/* Desktop & Tablet Sidebar (md y superior) */}
      <aside
        className={`hidden md:flex print:hidden flex-col h-dvh shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* 1. Brand Header (Omega Toggle) - Fijo arriba */}
        <div
          className={`shrink-0 p-4 border-b border-slate-800 flex items-center ${
            isCollapsed ? 'justify-center' : 'space-x-3'
          } transition-all`}
        >
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir barra lateral (Ω)' : 'Contraer barra lateral (Ω)'}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer"
          >
            Ω
          </button>
          {!isCollapsed && (
            <div className="overflow-hidden transition-all duration-200 min-w-0">
              <h1 className="text-base font-bold text-white tracking-wide leading-tight truncate">GRUPO OMEGA</h1>
              <p className="text-[11px] text-amber-400 font-medium tracking-wider uppercase truncate">
                Sistema de Tesorería
              </p>
            </div>
          )}
        </div>

        {/* 2. Navigation Modules - Ocupa el espacio disponible con scroll interno propio */}
        <nav
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${
            isCollapsed ? 'py-3 px-2 flex flex-col items-center space-y-2' : 'p-3 space-y-1'
          }`}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  onMouseEnter={(e) => showFloatingTooltip(e, item.label)}
                  onMouseLeave={() => setTooltip(null)}
                  aria-label={item.label}
                  className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md ring-2 ring-amber-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-300'}`} />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. User Profile & Logout - Siempre anclado al fondo */}
        <div
          className={`shrink-0 border-t border-slate-800 bg-slate-950/60 ${
            isCollapsed ? 'py-3 px-2 flex flex-col items-center space-y-2.5' : 'p-4'
          }`}
        >
          {isCollapsed ? (
            <>
              <div
                onMouseEnter={(e) => showFloatingTooltip(e, user?.nombre || 'Usuario', user?.rol)}
                onMouseLeave={() => setTooltip(null)}
                className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner cursor-default"
              >
                {user?.nombre.charAt(0) || 'U'}
              </div>
              <button
                type="button"
                onClick={logout}
                onMouseEnter={(e) => showFloatingTooltip(e, 'Cerrar sesión')}
                onMouseLeave={() => setTooltip(null)}
                aria-label="Cerrar sesión"
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                    {user?.nombre.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
                    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 max-w-full truncate">
                      <ShieldCheck className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{user?.rol}</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                v1.0 • Moneda: MXN
              </p>
            </>
          )}
        </div>
      </aside>

      {/* Fixed Floating Tooltip for Collapsed Desktop Sidebar (never clipped by overflow-y-auto) */}
      {isCollapsed && tooltip && (
        <div
          style={{ top: tooltip.top, left: '84px' }}
          className="hidden md:block fixed -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none z-50"
        >
          <p>{tooltip.label}</p>
          {tooltip.subLabel && <p className="text-[10px] text-amber-300 font-medium">{tooltip.subLabel}</p>}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Over Drawer (< md) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col h-dvh border-r border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden print:hidden select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 1. Brand Header (Omega closes drawer on mobile) */}
        <div className="shrink-0 p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            title="Cerrar menú (Ω)"
            className="flex items-center space-x-3 text-left min-w-0 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md group-active:scale-95 transition-transform shrink-0">
              Ω
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white tracking-wide leading-tight truncate">GRUPO OMEGA</h1>
              <p className="text-[11px] text-amber-400 font-medium tracking-wider uppercase truncate">
                Sistema de Tesorería
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Mobile Navigation Modules */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. Mobile User Profile & Logout - Anclado al fondo */}
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase shrink-0">
              {user?.nombre.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.nombre}</p>
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                <ShieldCheck className="w-3 h-3 mr-1 shrink-0" />
                {user?.rol}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (setIsMobileOpen) setIsMobileOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-slate-800 hover:bg-red-950/60 text-slate-200 hover:text-red-300 border border-slate-700 hover:border-red-800/50 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
