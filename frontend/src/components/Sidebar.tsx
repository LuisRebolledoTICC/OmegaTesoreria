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
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'cajas'
  | 'conteo'
  | 'operaciones'
  | 'reportes'
  | 'usuarios'
  | 'respaldos';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedCajaIdForConteo?: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, isAdmin, canOperate } = useAuth();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'cajas' as ActiveTab, label: 'Cajas de Tesorería', icon: Wallet, show: true },
    { id: 'conteo' as ActiveTab, label: 'Conteo de Efectivo', icon: Calculator, show: canOperate },
    { id: 'operaciones' as ActiveTab, label: 'Movimientos por Caja', icon: ArrowLeftRight, show: true },
    { id: 'reportes' as ActiveTab, label: 'Reportes y Excel', icon: FileSpreadsheet, show: true },
    { id: 'usuarios' as ActiveTab, label: 'Usuarios y Roles', icon: Users, show: isAdmin },
    { id: 'respaldos' as ActiveTab, label: 'Respaldos y BD', icon: Database, show: isAdmin },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md">
          Ω
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-wide leading-tight">GRUPO OMEGA</h1>
          <p className="text-xs text-amber-400 font-medium tracking-wider uppercase">Sistema de Tesorería</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.show).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
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
              <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
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
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center">
          v1.0 Local • Moneda: MXN
        </p>
      </div>
    </aside>
  );
};
