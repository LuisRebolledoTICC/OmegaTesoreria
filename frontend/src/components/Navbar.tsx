import React from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ title, onRefresh, loading = false }) => {
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 capitalize">{currentDate}</p>
      </div>

      <div className="flex items-center space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        )}

        {/* Network & Local Host status pill */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-800">
          <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Red Local Activa</span>
        </div>

        <div className="text-right border-l pl-4 border-slate-200">
          <p className="text-xs font-semibold text-slate-800">{user?.nombre}</p>
          <p className="text-[11px] text-amber-700 font-medium">{user?.rol}</p>
        </div>
      </div>
    </header>
  );
};
