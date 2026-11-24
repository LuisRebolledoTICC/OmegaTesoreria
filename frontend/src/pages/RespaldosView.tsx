import React, { useState, useEffect } from 'react';
import { Database, Download, RotateCcw, Plus, HardDrive, ShieldCheck, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import { RespaldoInfo } from '../types';
import { api } from '../services/api';

export const RespaldosView: React.FC = () => {
  const [respaldos, setRespaldos] = useState<RespaldoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRespaldos = async () => {
    try {
      setLoading(true);
      const list = await api.getRespaldos();
      setRespaldos(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRespaldos();
  }, []);

  const handleCrearRespaldo = async () => {
    setCreando(true);
    setMessage(null);
    try {
      const nuevo = await api.crearRespaldo();
      setMessage({
        type: 'success',
        text: `Copia de seguridad generada con éxito: ${nuevo.nombreArchivo}`,
      });
      loadRespaldos();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al generar la copia de seguridad.',
      });
    } finally {
      setCreando(false);
    }
  };

  const handleRestaurar = async (nombreArchivo: string) => {
    const confirm = window.confirm(
      `ATENCIÓN: ¿Estás seguro de que deseas restaurar la base de datos desde "${nombreArchivo}"?\n\n` +
      `Se creará automáticamente una copia de seguridad preventiva antes de proceder.`
    );
    if (!confirm) return;

    setRestaurando(nombreArchivo);
    setMessage(null);
    try {
      const res = await api.restaurarRespaldo(nombreArchivo);
      setMessage({
        type: 'success',
        text: res.message || 'Base de datos restaurada correctamente.',
      });
      loadRespaldos();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al restaurar la base de datos.',
      });
    } finally {
      setRestaurando(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-600" />
            <span>Respaldos y Seguridad de Base de Datos</span>
          </h2>
          <p className="text-xs text-slate-500">
            Copias de seguridad del archivo SQLite local y procedimiento de restauración controlada.
          </p>
        </div>

        <button
          onClick={handleCrearRespaldo}
          disabled={creando}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{creando ? 'Creando Respaldo...' : 'Crear Respaldo Ahora'}</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Explicación de la Base de Datos Local */}
      <div className="p-4 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <HardDrive className="w-4 h-4" />
          <span>Información de la Base de Datos Embebida (SQLite)</span>
        </div>
        <p className="text-slate-300">
          La base de datos del sistema es un archivo local denominado <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">tesoreria.db</code> ubicado en la carpeta <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">database/</code>.
        </p>
        <p className="text-slate-400">
          No requiere ningún servidor de base de datos externo en ejecución. Cada copia de seguridad es una fotografía completa que incluye todos los usuarios, cajas, conteos, historial de auditoría y movimientos financieros.
        </p>
      </div>

      {/* Lista de Respaldos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Copias de Seguridad Disponibles en Disco</h3>
          <span className="text-xs text-slate-500">{respaldos.length} archivos guardados</span>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3">Nombre del Archivo</th>
              <th className="p-3">Fecha y Hora de Creación</th>
              <th className="p-3">Tamaño</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Consultando copias de seguridad...
                </td>
              </tr>
            ) : respaldos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No se han generado respaldos todavía. Haz clic en "Crear Respaldo Ahora".
                </td>
              </tr>
            ) : (
              respaldos.map((r) => (
                <tr key={r.nombreArchivo} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-900 flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-amber-600" />
                    <span>{r.nombreArchivo}</span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {new Date(r.fechaCreacion).toLocaleString('es-MX')}
                  </td>
                  <td className="p-3 font-semibold text-slate-700">{formatBytes(r.tamanoBytes)}</td>
                  <td className="p-3 text-right space-x-2">
                    <a
                      href={api.getDownloadBackupUrl(r.nombreArchivo)}
                      download={r.nombreArchivo}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded transition"
                      title="Descargar copia a tu computadora"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>

                    <button
                      onClick={() => handleRestaurar(r.nombreArchivo)}
                      disabled={restaurando === r.nombreArchivo}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold rounded transition"
                      title="Restaurar el estado de la base de datos a este punto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{restaurando === r.nombreArchivo ? 'Restaurando...' : 'Restaurar'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
