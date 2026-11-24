import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  ChevronRight
} from 'lucide-react';
import { DashboardSummary } from '../types';
import { ActiveTab } from '../components/Sidebar';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigateToConteo: (cajaId: number) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  onNavigateToConteo,
  setActiveTab,
}) => {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
        <span className="ml-3 text-slate-600 font-medium">Cargando consolidado de tesorería...</span>
      </div>
    );
  }

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Banner: Saldo Consolidado */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
              <span>PATRIMONIO TOTAL CONSOLIDADO</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              {formatMoney(summary.saldoTotal)} <span className="text-lg font-medium text-slate-400">MXN</span>
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Suma real unificada de las {summary.cajasActivas} cajas activas de tesorería.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('operaciones')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow transition flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Nuevo Movimiento</span>
            </button>
            <button
              onClick={() => setActiveTab('reportes')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-sm border border-slate-700 transition"
            >
              Exportar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Ingresos</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(summary.totalEntradas)}</p>
          <p className="text-xs text-slate-600 mt-1">Aportaciones y donaciones</p>
        </div>

        {/* Salidas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Egresos</span>
            <div className="p-2 bg-rose-50 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(summary.totalSalidas)}</p>
          <p className="text-xs text-slate-600 mt-1">Gastos operativos y eventos</p>
        </div>

        {/* Transferencias */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Traspasos Internos</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(summary.totalTransferencias)}</p>
          <p className="text-xs text-slate-600 mt-1">Impacto neto en patrimonio: $0.00</p>
        </div>

        {/* Verificaciones */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Verificaciones</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {summary.cajasPendientesVerificacion === 0 ? 'Al día' : `${summary.cajasPendientesVerificacion} cajas`}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {summary.ultimoConteoGeneral
              ? `Último conteo: ${new Date(summary.ultimoConteoGeneral).toLocaleDateString('es-MX')}`
              : 'Sin conteos registrados'}
          </p>
        </div>
      </div>

      {/* Visualización de Cajas Individuales */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            <span>Distribución de Cajas de Tesorería</span>
          </h3>
          <button
            onClick={() => setActiveTab('cajas')}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
          >
            <span>Administrar Cajas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.cajas.map((caja) => (
            <div
              key={caja.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-900 text-base">{caja.nombre}</h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      caja.estadoVerificacion === 'Verificado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {caja.estadoVerificacion === 'Verificado' ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    )}
                    {caja.estadoVerificacion}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{caja.descripcion}</p>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Saldo Disponible</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{formatMoney(caja.saldoActual)}</p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600">
                  {caja.ultimoConteoFecha
                    ? `Verif: ${new Date(caja.ultimoConteoFecha).toLocaleDateString('es-MX')}`
                    : 'Sin conteo'}
                </span>
                <button
                  onClick={() => onNavigateToConteo(caja.id)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-semibold text-xs flex items-center space-x-1 border border-amber-200 transition"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Contar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfica de Distribución Proporcional */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Composición Porcentual del Fondo Económico
        </h3>

        {/* Barra segmentada */}
        <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 mb-4 shadow-inner">
          {summary.distribucionCajas.map((item, idx) => {
            const colors = [
              'bg-amber-500',
              'bg-blue-500',
              'bg-emerald-500',
              'bg-purple-500',
              'bg-rose-500',
              'bg-cyan-500'
            ];
            const color = colors[idx % colors.length];
            return (
              <div
                key={item.nombre}
                style={{ width: `${Math.max(item.porcentaje, 2)}%` }}
                className={`${color} h-full transition-all duration-500 relative group cursor-pointer`}
                title={`${item.nombre}: ${formatMoney(item.saldo)} (${item.porcentaje}%)`}
              />
            );
          })}
        </div>

        {/* Leyenda de la distribución */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {summary.distribucionCajas.map((item, idx) => {
            const colors = [
              'bg-amber-500',
              'bg-blue-500',
              'bg-emerald-500',
              'bg-purple-500',
              'bg-rose-500',
              'bg-cyan-500'
            ];
            const color = colors[idx % colors.length];
            return (
              <div key={item.nombre} className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${color} shrink-0`} />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 truncate">{item.nombre}</p>
                  <p className="text-slate-600">
                    {formatMoney(item.saldo)} ({item.porcentaje}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimas Operaciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Últimas Operaciones Registradas</h3>
          <button
            onClick={() => setActiveTab('operaciones')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            Ver todos los movimientos
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {summary.ultimasOperaciones.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-sm">
              No se han registrado operaciones recientes.
            </div>
          ) : (
            summary.ultimasOperaciones.map((op) => (
              <div key={op.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`p-2.5 rounded-lg text-xs font-bold ${
                      op.tipoOperacion === 'ENTRADA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : op.tipoOperacion === 'SALIDA'
                        ? 'bg-rose-100 text-rose-800'
                        : op.tipoOperacion === 'TRANSFERENCIA'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {op.tipoOperacion}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{op.concepto}</p>
                    <p className="text-xs text-slate-600">
                      {op.tipoOperacion === 'TRANSFERENCIA'
                        ? `${op.cajaOrigenNombre} ➔ ${op.cajaDestinoNombre}`
                        : (op.cajaDestinoNombre || op.cajaOrigenNombre || 'Caja')} • {new Date(op.fechaOperacion).toLocaleString('es-MX')} • Por {op.usuarioNombre}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold text-base ${
                      op.tipoOperacion === 'ENTRADA'
                        ? 'text-emerald-600'
                        : op.tipoOperacion === 'SALIDA'
                        ? 'text-rose-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {op.tipoOperacion === 'ENTRADA' ? '+' : op.tipoOperacion === 'SALIDA' ? '-' : ''}
                    {formatMoney(op.importe)}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                      op.estado === 'CONFIRMADA' ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700 line-through'
                    }`}
                  >
                    {op.estado}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
