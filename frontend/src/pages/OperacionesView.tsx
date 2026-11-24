import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  Filter,
  RotateCcw,
  Search,
  AlertCircle,
  Coins
} from 'lucide-react';
import { Caja, Operacion } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface OperacionesViewProps {
  cajas: Caja[];
  onOperationCompleted: () => void;
}

export const OperacionesView: React.FC<OperacionesViewProps> = ({ cajas, onOperationCompleted }) => {
  const { user, isAdmin, canOperate } = useAuth();
  const [selectedCajaId, setSelectedCajaId] = useState<number | ''>('');
  const [operacionModal, setOperacionModal] = useState<'entrada' | 'salida' | 'transferencia' | null>(null);

  // Form states
  const [cajaOrigenId, setCajaOrigenId] = useState<number>(0);
  const [cajaDestinoId, setCajaDestinoId] = useState<number>(0);
  const [importe, setImporte] = useState<number>(0);
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reversion modal
  const [anulandoOpId, setAnulandoOpId] = useState<number | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Filters
  const [movimientos, setMovimientos] = useState<Operacion[]>([]);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const data = await api.getHistorial({
        cajaId: selectedCajaId ? Number(selectedCajaId) : undefined,
        tipo: filterTipo || undefined,
        usuario: filterSearch || undefined,
      });
      setMovimientos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovimientos();
  }, [selectedCajaId, filterTipo, filterSearch]);

  const cajaActivaSeleccionada = selectedCajaId ? cajas.find(c => c.id === selectedCajaId) : null;

  const openModal = (tipo: 'entrada' | 'salida' | 'transferencia') => {
    setOperacionModal(tipo);
    setError(null);
    setImporte(0);
    setConcepto('');
    setDescripcion('');
    setObservaciones('');

    const defaultCaja = selectedCajaId ? Number(selectedCajaId) : (cajas.find(c => c.activa)?.id || 0);
    const otherCaja = cajas.filter(c => c.activa && c.id !== defaultCaja)[0]?.id || defaultCaja;

    setCajaOrigenId(defaultCaja);
    setCajaDestinoId(tipo === 'transferencia' ? otherCaja : defaultCaja);
  };

  const handleSubmitOperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importe <= 0) {
      setError('El importe debe ser mayor a cero.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      if (operacionModal === 'entrada') {
        if (!concepto.trim()) throw new Error('El concepto es obligatorio.');
        await api.registrarEntrada({
          cajaId: cajaDestinoId,
          importe: Number(importe),
          concepto: concepto.trim(),
          descripcion: descripcion.trim() || concepto.trim(),
          observaciones: observaciones.trim() || undefined,
        });
      } else if (operacionModal === 'salida') {
        if (!concepto.trim()) throw new Error('El concepto es obligatorio.');
        await api.registrarSalida({
          cajaId: cajaOrigenId,
          importe: Number(importe),
          concepto: concepto.trim(),
          descripcion: descripcion.trim() || concepto.trim(),
          observaciones: observaciones.trim() || undefined,
        });
      } else if (operacionModal === 'transferencia') {
        if (cajaOrigenId === cajaDestinoId) {
          throw new Error('No se puede transferir a la misma caja.');
        }
        await api.registrarTransferencia({
          cajaOrigenId,
          cajaDestinoId,
          importe: Number(importe),
          observaciones: observaciones.trim() || undefined,
        });
      }

      setOperacionModal(null);
      onOperationCompleted();
      loadMovimientos();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anulandoOpId || !motivoAnulacion.trim()) return;
    try {
      await api.anularOperacion(anulandoOpId, motivoAnulacion.trim());
      setAnulandoOpId(null);
      setMotivoAnulacion('');
      onOperationCompleted();
      loadMovimientos();
    } catch (err: any) {
      alert(err.message || 'Error al anular la operación.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-600" />
            <span>Movimientos de Tesorería por Caja</span>
          </h2>
          <p className="text-xs text-slate-500">
            Consulta y registra entradas, retiros y transferencias de cada caja.
          </p>
        </div>

        {canOperate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openModal('entrada')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Nueva Entrada</span>
            </button>
            <button
              onClick={() => openModal('salida')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Nueva Salida</span>
            </button>
            <button
              onClick={() => openModal('transferencia')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Transferencia</span>
            </button>
          </div>
        )}
      </div>

      {/* Selector de Cajas por Pestañas / Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
          Selecciona una caja para ver sus movimientos:
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCajaId('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              selectedCajaId === ''
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Todas las Cajas</span>
          </button>

          {cajas.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCajaId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                selectedCajaId === c.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{c.nombre}</span>
              <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded ${selectedCajaId === c.id ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                {formatMoney(c.saldoActual)}
              </span>
            </button>
          ))}
        </div>

        {/* Tarjeta Informativa de la Caja Seleccionada */}
        {cajaActivaSeleccionada && (
          <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500 text-slate-950 font-bold rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{cajaActivaSeleccionada.nombre}</h4>
                <p className="text-slate-600">{cajaActivaSeleccionada.finalidad}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-500 uppercase font-semibold text-[10px]">Saldo en esta caja:</span>
                <p className="text-xl font-black text-slate-900">{formatMoney(cajaActivaSeleccionada.saldoActual)}</p>
              </div>

              {canOperate && (
                <div className="flex items-center space-x-1.5 border-l pl-3 border-amber-200">
                  <button
                    onClick={() => openModal('entrada')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                  >
                    <span>+ Entrada</span>
                  </button>
                  <button
                    onClick={() => openModal('salida')}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                  >
                    <span>- Salida</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filtros secundarios y Tabla de Movimientos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>
              {cajaActivaSeleccionada ? `Movimientos de "${cajaActivaSeleccionada.nombre}"` : 'Todos los Movimientos de Tesorería'}
            </span>
            <span className="text-slate-400 font-normal">({movimientos.length} registros)</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todos los tipos</option>
              <option value="ENTRADA">Entradas (+)</option>
              <option value="SALIDA">Salidas (-)</option>
              <option value="TRANSFERENCIA">Transferencias</option>
              <option value="AJUSTE">Ajustes</option>
              <option value="REVERSA">Reversiones</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por usuario..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Caja(s) Involucrada(s)</th>
                <th className="py-3 px-4">Concepto y Detalle</th>
                <th className="py-3 px-4 text-right">Importe (MXN)</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-center">Estado</th>
                {isAdmin && <th className="py-3 px-4 text-center">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No hay movimientos registrados para esta caja.
                  </td>
                </tr>
              ) : (
                movimientos.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">#{op.id}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
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
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(op.fechaOperacion).toLocaleString('es-MX')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {op.tipoOperacion === 'TRANSFERENCIA' ? (
                        <span>
                          {op.cajaOrigenNombre} ➔ {op.cajaDestinoNombre}
                        </span>
                      ) : (
                        op.cajaDestinoNombre || op.cajaOrigenNombre || '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{op.concepto}</p>
                      {op.descripcion && <p className="text-[11px] text-slate-500">{op.descripcion}</p>}
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      <span
                        className={
                          op.tipoOperacion === 'ENTRADA'
                            ? 'text-emerald-600 font-extrabold'
                            : op.tipoOperacion === 'SALIDA'
                            ? 'text-rose-600 font-extrabold'
                            : 'text-slate-900 font-extrabold'
                        }
                      >
                        {op.tipoOperacion === 'ENTRADA' ? '+' : op.tipoOperacion === 'SALIDA' ? '-' : ''}
                        {formatMoney(op.importe)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{op.usuarioNombre}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          op.estado === 'CONFIRMADA'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200 line-through'
                        }`}
                      >
                        {op.estado}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {op.estado === 'CONFIRMADA' && op.tipoOperacion !== 'REVERSA' ? (
                          <button
                            onClick={() => setAnulandoOpId(op.id)}
                            title="Revertir movimiento contablemente"
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registro de Entrada / Salida / Transferencia */}
      {operacionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                operacionModal === 'entrada'
                  ? 'bg-emerald-800'
                  : operacionModal === 'salida'
                  ? 'bg-rose-800'
                  : 'bg-blue-800'
              }`}
            >
              <div>
                <h3 className="font-bold text-lg capitalize">
                  {operacionModal === 'entrada'
                    ? 'Registrar Entrada de Dinero'
                    : operacionModal === 'salida'
                    ? 'Registrar Salida de Efectivo'
                    : 'Transferencia entre Cajas'}
                </h3>
                <p className="text-xs text-white/80">
                  {operacionModal === 'transferencia'
                    ? 'El patrimonio total de tesorería se mantiene idéntico.'
                    : 'Afectará el saldo de la caja y el patrimonio consolidado.'}
                </p>
              </div>
              <button
                onClick={() => setOperacionModal(null)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOperacion} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Selector de Cajas */}
              {operacionModal === 'entrada' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Caja Receptora *</label>
                  <select
                    value={cajaDestinoId}
                    onChange={(e) => setCajaDestinoId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {cajas.filter(c => c.activa).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (Disp: {formatMoney(c.saldoActual)})</option>
                    ))}
                  </select>
                </div>
              )}

              {operacionModal === 'salida' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Caja de Origen *</label>
                  <select
                    value={cajaOrigenId}
                    onChange={(e) => setCajaOrigenId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {cajas.filter(c => c.activa).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (Disp: {formatMoney(c.saldoActual)})</option>
                    ))}
                  </select>
                </div>
              )}

              {operacionModal === 'transferencia' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Caja Origen *</label>
                    <select
                      value={cajaOrigenId}
                      onChange={(e) => setCajaOrigenId(Number(e.target.value))}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {cajas.filter(c => c.activa).map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({formatMoney(c.saldoActual)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Caja Destino *</label>
                    <select
                      value={cajaDestinoId}
                      onChange={(e) => setCajaDestinoId(Number(e.target.value))}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {cajas.filter(c => c.activa).map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Importe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Importe en Pesos Mexicanos (MXN) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={importe || ''}
                  onChange={(e) => setImporte(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {operacionModal !== 'transferencia' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Concepto *</label>
                    <input
                      type="text"
                      required
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      placeholder={operacionModal === 'entrada' ? 'Ej. Donativo dominical o aportación' : 'Ej. Compra de papelería o servicio de luz'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Detalles adicionales del movimiento"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales o número de recibo / factura"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setOperacionModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs transition shadow-xs"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reversión de Movimiento */}
      {anulandoOpId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Revertir Movimiento #{anulandoOpId}</h3>
                <p className="text-xs text-rose-200">
                  Se generará una contrapartida inversa para restituir los saldos.
                </p>
              </div>
              <button
                onClick={() => setAnulandoOpId(null)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAnular} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Motivo obligatorio de la anulación / reversa *
                </label>
                <textarea
                  required
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Explica detalladamente por qué se anula este movimiento"
                  rows={3}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAnulandoOpId(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs"
                >
                  Confirmar Reversión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
