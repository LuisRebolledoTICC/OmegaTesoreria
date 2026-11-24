import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Wallet,
  Printer,
  AlertCircle
} from 'lucide-react';
import { Caja, DashboardSummary } from '../types';
import { api } from '../services/api';

interface ReportesViewProps {
  summary: DashboardSummary | null;
  cajas: Caja[];
}

export const ReportesView: React.FC<ReportesViewProps> = ({ summary, cajas }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleDownloadExcel = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadExcelReport();
    } catch (err: any) {
      setError(err.message || 'Error al descargar el archivo Excel.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Banner (oculto al imprimir) */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Reportes Financieros y Exportación</span>
          </h2>
          <p className="text-xs text-slate-500">
            Descarga de informes consolidados en Excel (.xlsx) e impresión de estados de tesorería.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir Vista (PDF)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generando...' : 'Descargar Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="print:hidden p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reporte Consolidado Impreso / Visible */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-200 pb-4 text-center">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">GRUPO APOSTÓLICO OMEGA</h1>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-600 mt-0.5">
            Estado de Posición Financiera y Arqueo de Tesorería
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Fecha de emisión: {new Date().toLocaleString('es-MX')} • Moneda oficial: Pesos Mexicanos (MXN)
          </p>
        </div>

        {/* Resumen Global */}
        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 print:gap-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Patrimonio Total</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatMoney(summary?.saldoTotal || 0)}</p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="text-xs text-emerald-800 uppercase font-semibold">Total Ingresos Históricos</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{formatMoney(summary?.totalEntradas || 0)}</p>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <span className="text-xs text-rose-800 uppercase font-semibold">Total Egresos Históricos</span>
            <p className="text-2xl font-extrabold text-rose-700 mt-1">{formatMoney(summary?.totalSalidas || 0)}</p>
          </div>
        </div>

        {/* Tabla Detallada de Cajas */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>Desglose Consolidado por Caja</span>
          </h3>

          {/* Vista Móvil en Tarjetas (< md, oculta al imprimir) */}
          <div className="md:hidden print:hidden space-y-3">
            {cajas.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-400">#{c.id}</span>
                      <span className="font-bold text-sm text-slate-900">{c.nombre}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {c.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{c.finalidad}</p>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap shrink-0">
                    {formatMoney(c.saldoActual)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Último Conteo:</span>
                  <span className="font-medium text-slate-700">
                    {c.ultimoConteoFecha ? new Date(c.ultimoConteoFecha).toLocaleDateString('es-MX') : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}

            <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total General de Tesorería</span>
              <span className="text-base font-black text-amber-400">
                {formatMoney(cajas.filter(c => c.activa).reduce((acc, curr) => acc + curr.saldoActual, 0))}
              </span>
            </div>
          </div>

          {/* Vista Desktop/Tablet y Modo Impresión en Tabla */}
          <div className="hidden md:block print:block overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Nombre de la Caja</th>
                  <th className="p-3">Finalidad de los Fondos</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Último Conteo</th>
                  <th className="p-3 text-right">Saldo Actual (MXN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cajas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-500">#{c.id}</td>
                    <td className="p-3 font-bold text-slate-900">{c.nombre}</td>
                    <td className="p-3 text-slate-600">{c.finalidad}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {c.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {c.ultimoConteoFecha ? new Date(c.ultimoConteoFecha).toLocaleDateString('es-MX') : 'Pendiente'}
                    </td>
                    <td className="p-3 text-right font-extrabold text-slate-900">{formatMoney(c.saldoActual)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-slate-700 uppercase">
                    Total General de Tesorería:
                  </td>
                  <td className="p-3 text-right text-base text-slate-950 font-black">
                    {formatMoney(cajas.filter(c => c.activa).reduce((acc, curr) => acc + curr.saldoActual, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Firmas de Responsabilidad */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 print-avoid-break">
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-800">Tesorero Responsable</p>
            <p className="text-[11px] text-slate-500">Grupo Apostólico Omega</p>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold text-slate-800">Visto Bueno / Auditoría</p>
            <p className="text-[11px] text-slate-500">Consejo de Administración</p>
          </div>
        </div>
      </div>
    </div>
  );
};
