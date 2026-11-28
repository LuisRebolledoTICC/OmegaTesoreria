import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  Wallet,
  Calculator,
  ArrowLeftRight,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  Building2,
  Package,
  PiggyBank,
  Receipt,
  Calendar,
  X,
  UserCog,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PerfilModal } from './PerfilModal';

export type ActiveTab =
  | 'inicio'
  | 'dashboard'
  | 'deudas'
  | 'eventos'
  | 'ventas'
  | 'cajas'
  | 'conteo'
  | 'operaciones'
  | 'presupuestos'
  | 'areas'
  | 'inventarios'
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

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

  const canSeeDeudas =
    canAccessModule('deudas_consultar_propias') ||
    canAccessModule('deudas_consultar_todos') ||
    canAccessModule('deudas_consultar_detalle') ||
    canAccessModule('deudas_actividades_crear') ||
    canAccessModule('deudas_actividades_editar') ||
    canAccessModule('deudas_actividades_asignar') ||
    canAccessModule('deudas_pagos_registrar') ||
    canAccessModule('deudas_pagos_revertir') ||
    canAccessModule('deudas_pagos_historial') ||
    canAccessModule('deudas_movimientos_bancarios');

  const canSeeEventos =
    canAccessModule('eventos_consultar') ||
    canAccessModule('eventos_crear') ||
    canAccessModule('eventos_editar') ||
    canAccessModule('eventos_cancelar') ||
    canAccessModule('eventos_eliminar');

  const navItems = [
    { id: 'inicio' as ActiveTab, label: 'Inicio Omega', icon: Home, show: canAccessModule('inicio') },
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, show: canAccessModule('dashboard') },
    { id: 'deudas' as ActiveTab, label: 'Deudas', icon: Receipt, show: canSeeDeudas },
    { id: 'eventos' as ActiveTab, label: 'Eventos', icon: Calendar, show: canSeeEventos },
    { id: 'ventas' as ActiveTab, label: 'Ventas y Pedidos', icon: ShoppingBag, show: canAccessModule('ventas') },
    { id: 'cajas' as ActiveTab, label: 'Cajas de Tesorería', icon: Wallet, show: canAccessModule('cajas') },
    { id: 'conteo' as ActiveTab, label: 'Conteo de Efectivo', icon: Calculator, show: canAccessModule('conteo') },
    { id: 'operaciones' as ActiveTab, label: 'Movimientos por Caja', icon: ArrowLeftRight, show: canAccessModule('operaciones') },
    { id: 'presupuestos' as ActiveTab, label: 'Presupuestos', icon: PiggyBank, show: canAccessModule('presupuestos') || canAccessModule('presupuestos_ver_todos') || canAccessModule('presupuestos_administrar') || canAccessModule('presupuestos_consultar_mi_area') || canAccessModule('presupuestos_consultar_todos') },
    { id: 'areas' as ActiveTab, label: 'Áreas', icon: Building2, show: canAccessModule('areas') },
    { id: 'inventarios' as ActiveTab, label: 'Inventarios', icon: Package, show: canAccessModule('inventarios') || canAccessModule('inventarios_ver_todos') },
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
          ref={userMenuRef}
          className={`relative shrink-0 border-t border-slate-800 bg-slate-950/60 ${
            isCollapsed ? 'py-3 px-2 flex flex-col items-center space-y-2.5' : 'p-4'
          }`}
        >
          {showUserMenu && (
            <div
              className={`absolute bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 min-w-[180px] ${
                isCollapsed ? 'left-2' : 'left-4 right-4'
              }`}
            >
              <div className="px-3 py-2 border-b border-slate-700/80">
                <p className="text-xs font-bold text-white truncate">{user?.nombre}</p>
                <p className="text-[11px] text-slate-400 truncate">@{user?.userName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  setShowPerfilModal(true);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/80 hover:text-amber-300 transition cursor-pointer"
              >
                <UserCog className="w-4 h-4 text-amber-400" />
                <span>Mi Perfil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/60 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

          {isCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                onMouseEnter={(e) => showFloatingTooltip(e, user?.nombre || 'Usuario', `${user?.rol} • Clic para perfil`)}
                onMouseLeave={() => setTooltip(null)}
                aria-label="Menú de usuario"
                className="w-9 h-9 rounded-full bg-slate-700 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner transition cursor-pointer"
              >
                {user?.nombre.charAt(0) || 'U'}
              </button>
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
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  title="Abrir menú de perfil"
                  className="flex items-center space-x-2.5 min-w-0 flex-1 text-left p-1 -m-1 rounded-lg hover:bg-slate-800/70 transition cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 transition">
                    {user?.nombre.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1">
                      <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
                      <ChevronUp className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                    </div>
                    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 max-w-full truncate">
                      <ShieldCheck className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{user?.rol}</span>
                    </span>
                  </div>
                </button>
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

      {/* Mobile Backdrop: cubre toda la pantalla (incluido Navbar y MobileBottomNav) y bloquea eventos al fondo */}
      {isMobileOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (setIsMobileOpen) setIsMobileOpen(false);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-[1px] z-40 md:hidden touch-none overscroll-none select-none"
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Over Drawer (< md) */}
      <aside
        aria-hidden={!isMobileOpen}
        {...(!isMobileOpen ? { inert: true } : {})}
        onClick={(e) => e.stopPropagation()}
        className={`fixed inset-y-0 left-0 z-[45] w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col h-dvh border-r border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden print:hidden select-none overscroll-contain ${
          isMobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
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
        <div className="relative shrink-0 p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          {showMobileUserMenu && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl py-1.5 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setShowMobileUserMenu(false);
                  if (setIsMobileOpen) setIsMobileOpen(false);
                  setShowPerfilModal(true);
                }}
                className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
              >
                <UserCog className="w-4 h-4 text-amber-400" />
                <span>Mi Perfil (Editar datos / contraseña)</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMobileUserMenu((prev) => !prev)}
            className="w-full flex items-center space-x-3 min-w-0 text-left p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/70 transition"
          >
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
            <ChevronUp className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showMobileUserMenu ? 'rotate-180' : ''}`} />
          </button>
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

      <PerfilModal isOpen={showPerfilModal} onClose={() => setShowPerfilModal(false)} />
    </>
  );
};
