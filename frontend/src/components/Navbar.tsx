import React from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title: string;
  onRefresh?: () => void;
  loading?: boolean;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onRefresh,
  loading = false,
  onOpenMobileMenu,
}) => {
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 shadow-xs print:hidden">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-950 text-lg shadow-sm shrink-0 active:scale-95 transition-transform cursor-pointer"
            title="Abrir menú (Ω)"
            aria-label="Abrir menú de navegación"
          >
            Ω
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate">{title}</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 capitalize truncate">{currentDate}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Actualizar datos"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        )}

        {/* Network & Local Host status pill */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-800">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistema Activo</span>
        </div>

        <div className="hidden sm:block text-right border-l pl-3 sm:pl-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user?.nombre}</p>
          <p className="text-[11px] text-amber-700 font-medium">{user?.rol}</p>
        </div>
      </div>
    </header>
  );
};
