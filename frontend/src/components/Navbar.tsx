import React from 'react';
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title: string;
  onRefresh?: () => void;
  loading?: boolean;
  onOpenMobileMenu?: () => void;
  isOnline?: boolean;
  canInstallApp?: boolean;
  onInstallApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onRefresh,
  loading = false,
  onOpenMobileMenu,
  isOnline = true,
  canInstallApp = false,
  onInstallApp,
}) => {
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="min-h-16 pt-[env(safe-area-inset-top)] bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0 shadow-xs print:hidden">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 py-2">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-950 text-lg shadow-sm shrink-0 active:scale-95 transition-transform cursor-pointer touch-manipulation"
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

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {canInstallApp && onInstallApp && (
          <button
            type="button"
            onClick={onInstallApp}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer touch-manipulation"
            title="Instalar Omega Tesorería en este dispositivo"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instalar App</span>
            <span className="sm:hidden">Instalar</span>
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || !isOnline}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-40 touch-manipulation"
            title="Actualizar datos"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        )}

        {/* Network status pill */}
        {isOnline ? (
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistema Activo</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-700">
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Sin conexión</span>
          </div>
        )}

        <div className="hidden sm:block text-right border-l pl-3 sm:pl-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user?.nombre}</p>
          <p className="text-[11px] text-amber-700 font-medium">{user?.rol}</p>
        </div>
      </div>
    </header>
  );
};
