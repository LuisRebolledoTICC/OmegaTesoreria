import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calculator,
  ArrowLeftRight,
  History,
  FileSpreadsheet,
  Users,
  Database,
  ShieldCheck,
  LogOut,
  ShoppingBag
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed,
}) => {
  const { user, logout, canAccessModule } = useAuth();
  const [internalIsCollapsed, setInternalIsCollapsed] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('omega_sidebar_collapsed');
    return saved === 'true';
  });

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = externalSetIsCollapsed !== undefined ? externalSetIsCollapsed : setInternalIsCollapsed;

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('omega_sidebar_collapsed', String(nextState));
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

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-800 transition-all duration-300 ease-in-out select-none`}
    >
      {/* Brand Header */}
      <div
        className={`p-4 border-b border-slate-800 flex items-center ${
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
          <div className="overflow-hidden transition-all duration-200">
            <h1 className="text-base font-bold text-white tracking-wide leading-tight truncate">GRUPO OMEGA</h1>
            <p className="text-[11px] text-amber-400 font-medium tracking-wider uppercase truncate">
              Sistema de Tesorería
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-1'} overflow-y-auto overflow-x-hidden`}>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (isCollapsed) {
              return (
                <div key={item.id} className="relative group flex justify-center">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md ring-2 ring-amber-400/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-300'}`} />
                  </button>
                  {/* Floating Tooltip */}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 top-1/2 -translate-y-1/2">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
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

      {/* User profile & Logout */}
      <div className={`border-t border-slate-800 bg-slate-950/60 ${isCollapsed ? 'p-3 flex flex-col items-center space-y-3' : 'p-4'}`}>
        {isCollapsed ? (
          <>
            <div
              className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner relative group"
              title={`${user?.nombre} (${user?.rol})`}
            >
              {user?.nombre.charAt(0) || 'U'}
              {/* Tooltip usuario */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 top-1/2 -translate-y-1/2">
                <p className="font-bold">{user?.nombre}</p>
                <p className="text-[10px] text-amber-300">{user?.rol}</p>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                  {user?.nombre.charAt(0) || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {user?.rol}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition shrink-0"
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
  );
};
