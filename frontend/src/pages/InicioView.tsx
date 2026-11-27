import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowRight,
  UserCheck,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EventoOmega, UsuarioDeudaDetalle } from '../types';
import { ActiveTab } from '../components/Sidebar';
import { PerfilModal } from '../components/PerfilModal';

interface InicioViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ setActiveTab }) => {
  const { user, canAccessModule } = useAuth();
  const [misDeudas, setMisDeudas] = useState<UsuarioDeudaDetalle | null>(null);
  const [proximosEventos, setProximosEventos] = useState<EventoOmega[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPerfil, setShowPerfil] = useState(false);

  const canVerDeudas =
    canAccessModule('deudas_consultar_propias') ||
    canAccessModule('deudas_consultar_todos');

  const canVerEventos =
    canAccessModule('eventos_consultar') ||
    canAccessModule('inicio');

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  useEffect(() => {
    const loadInicio = async () => {
      setLoading(true);
      try {
        const [deudaRes, eventosRes] = await Promise.all([
          api.getMisDeudas().catch(() => null),
          api.getProximosEventos().catch(() => []),
        ]);
        if (deudaRes) setMisDeudas(deudaRes);
        if (eventosRes) setProximosEventos(eventosRes);
      } finally {
        setLoading(false);
      }
    };
    loadInicio();
  }, []);

  const deudaTotal = misDeudas?.resumen.deudaTotal ?? 0;
  const pendientesCount = misDeudas?.resumen.actividadesPendientes ?? 0;
  const estaAlDia = deudaTotal <= 0;

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal Personal de Grupo Omega</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ¡Bienvenido(a), {user?.nombre || user?.userName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Consulta el estado actual de tus actividades y deudas personales, revisa los próximos eventos de Omega y accede rápidamente a tus módulos.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-2xl shadow-md">
              Ω
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas principales: Deuda Personal + Próximos Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estado de Deuda Personal */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <span>Mi Estado de Deuda</span>
              </h2>
              {!loading && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    estaAlDia
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {estaAlDia ? 'Al día' : `${pendientesCount} pendiente(s)`}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Cargando tu estado de deuda...</div>
            ) : estaAlDia ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-lg font-black text-emerald-800">Está al día</p>
                <p className="text-xs text-emerald-700">
                  No tienes actividades pendientes de pago en este momento.
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-rose-700">Deuda Total Actual</span>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-3xl font-black text-rose-900">{formatMoney(deudaTotal)}</p>
                <p className="text-xs text-rose-700">
                  Tienes <strong>{pendientesCount}</strong> actividad(es) pendiente(s) de pago.
                </p>
              </div>
            )}
          </div>

          {canVerDeudas && (
            <button
              type="button"
              onClick={() => setActiveTab('deudas')}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Ver detalle de mis deudas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Próximos Eventos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Próximos Eventos de Omega</span>
              </h2>
              {canVerEventos && (
                <button
                  type="button"
                  onClick={() => setActiveTab('eventos')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Cargando próximos eventos...</div>
            ) : proximosEventos.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No hay próximos eventos programados</p>
                <p className="text-xs text-slate-500">Cuando se publiquen nuevas actividades o eventos aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {proximosEventos.map((ev) => {
                  const fecha = new Date(ev.fechaHora);
                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">{ev.nombre}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                            <Clock className="w-3.5 h-3.5" />
                            {fecha.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
                            {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {ev.ubicacion && (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              {ev.ubicacion}
                            </span>
                          )}
                        </div>
                        {ev.descripcion && (
                          <p className="text-xs text-slate-500">{ev.descripcion}</p>
                        )}
                      </div>
                      <span className="self-start sm:self-center shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Próximo
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Área Personal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Área Personal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {canVerDeudas && (
            <button
              type="button"
              onClick={() => setActiveTab('deudas')}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Mis Deudas y Actividades</p>
                  <p className="text-xs text-slate-500">Consulta tu historial de actividades y pagos</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {canVerEventos && (
            <button
              type="button"
              onClick={() => setActiveTab('eventos')}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Calendario de Eventos</p>
                  <p className="text-xs text-slate-500">Consulta todos los eventos de Omega</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPerfil(true)}
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition text-left flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Mi Perfil Personal</p>
                <p className="text-xs text-slate-500">Revisa o actualiza tu nombre y contraseña</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {showPerfil && <PerfilModal onClose={() => setShowPerfil(false)} />}
    </div>
  );
};
