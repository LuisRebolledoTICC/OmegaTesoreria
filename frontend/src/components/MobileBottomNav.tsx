import React from 'react';
import {
  Home,
  LayoutDashboard,
  Receipt,
  Calendar,
  ShoppingBag,
  Wallet,
  Calculator,
  ArrowLeftRight,
  PiggyBank,
  Building2,
  Package,
  FileSpreadsheet,
  Users,
  Menu
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  availableTabs: ActiveTab[];
  onSelectTab: (tab: ActiveTab) => void;
  onOpenMoreMenu: () => void;
}

const MOBILE_PRIORITY_ORDER: ActiveTab[] = [
  'inicio',
  'deudas',
  'ventas',
  'cajas',
  'operaciones',
  'dashboard',
  'eventos',
  'presupuestos',
  'conteo',
  'areas',
  'inventarios',
  'reportes',
  'usuarios',
];

const TAB_META: Record<ActiveTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  inicio: { label: 'Inicio', icon: Home },
  dashboard: { label: 'Panel', icon: LayoutDashboard },
  deudas: { label: 'Deudas', icon: Receipt },
  eventos: { label: 'Eventos', icon: Calendar },
  ventas: { label: 'Ventas', icon: ShoppingBag },
  cajas: { label: 'Cajas', icon: Wallet },
  conteo: { label: 'Conteo', icon: Calculator },
  operaciones: { label: 'Movim.', icon: ArrowLeftRight },
  presupuestos: { label: 'Presup.', icon: PiggyBank },
  areas: { label: 'Áreas', icon: Building2 },
  inventarios: { label: 'Invent.', icon: Package },
  reportes: { label: 'Reportes', icon: FileSpreadsheet },
  usuarios: { label: 'Usuarios', icon: Users },
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  availableTabs,
  onSelectTab,
  onOpenMoreMenu,
}) => {
  if (availableTabs.length === 0) return null;

  const primaryTabs = MOBILE_PRIORITY_ORDER.filter((t) => availableTabs.includes(t)).slice(0, 4);
  const isMoreActive = !primaryTabs.includes(activeTab);

  return (
    <nav
      aria-label="Navegación móvil"
      className="md:hidden print:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.18)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around px-1">
        {primaryTabs.map((tab) => {
          const meta = TAB_META[tab];
          const Icon = meta.icon;
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`flex-1 min-h-[56px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-manipulation ${
                isActive ? 'text-amber-400' : 'text-slate-400 active:text-slate-200'
              }`}
            >
              <div
                className={`px-3 py-1 rounded-full transition-colors ${
                  isActive ? 'bg-amber-500/20' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] leading-tight truncate max-w-[64px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {meta.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`flex-1 min-h-[56px] py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-manipulation ${
            isMoreActive ? 'text-amber-400' : 'text-slate-400 active:text-slate-200'
          }`}
          aria-label="Abrir menú completo"
        >
          <div
            className={`px-3 py-1 rounded-full transition-colors ${
              isMoreActive ? 'bg-amber-500/20' : ''
            }`}
          >
            <Menu className="w-5 h-5" />
          </div>
          <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-bold' : 'font-medium'}`}>
            Más
          </span>
        </button>
      </div>
    </nav>
  );
};
