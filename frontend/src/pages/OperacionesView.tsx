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
  Coins,
  PiggyBank,
  Pencil
} from 'lucide-react';
import { Caja, Operacion } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface OperacionesViewProps {
  cajas: Caja[];
  onOperationCompleted: () => void;
}

export const OperacionesView: React.FC<OperacionesViewProps> = ({ cajas, onOperationCompleted }) => {
  const { user, isAdmin, canOperate, canAccessModule } = useAuth();
  const [selectedCajaId, setSelectedCajaId] = useState<number | ''>('');
  const [operacionModal, setOperacionModal] = useState<'entrada' | 'salida' | 'transferencia' | 'presupuesto' | null>(null);

  // Form states
  const [cajaOrigenId, setCajaOrigenId] = useState<number>(0);
  const [cajaDestinoId, setCajaDestinoId] = useState<number>(0);
  const [importe, setImporte] = useState<number>(0);
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Asignar presupuesto a área
  const [areasPresupuesto, setAreasPresupuesto] = useState<{ id: number; nombre: string }[]>([]);
  const [areaDestinoId, setAreaDestinoId] = useState<number>(0);
  const [fechaPresupuesto, setFechaPresupuesto] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loadingAreas, setLoadingAreas] = useState(false);

  const canAsignarPresupuesto = isAdmin || canAccessModule('presupuestos_asignar') || canAccessModule('presupuestos_administrar');

  // Editar movimiento
  const canEditarMovimientos = isAdmin || canAccessModule('cajas_editar_movimientos');
  const [editingMov, setEditingMov] = useState<Operacion | null>(null);
  const [editImporte, setEditImporte] = useState<number>(0);
  const [editConcepto, setEditConcepto] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  const openModal = async (tipo: 'entrada' | 'salida' | 'transferencia' | 'presupuesto') => {
    setOperacionModal(tipo);
    setError(null);
    setImporte(0);
    setConcepto('');
    setDescripcion('');
    setObservaciones('');
    setFechaPresupuesto(new Date().toISOString().slice(0, 10));

    const defaultCaja = selectedCajaId ? Number(selectedCajaId) : (cajas.find(c => c.activa)?.id || 0);
    const otherCaja = cajas.filter(c => c.activa && c.id !== defaultCaja)[0]?.id || defaultCaja;

    setCajaOrigenId(defaultCaja);
    setCajaDestinoId(tipo === 'transferencia' ? otherCaja : defaultCaja);

    if (tipo === 'presupuesto') {
      try {
        setLoadingAreas(true);
        const list = await api.getAreasActivasPresupuesto();
        setAreasPresupuesto(list);
        if (list.length > 0) {
          setAreaDestinoId(list[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'No se pudieron cargar las áreas activas.');
      } finally {
        setLoadingAreas(false);
      }
    }
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
      } else if (operacionModal === 'presupuesto') {
        if (!cajaOrigenId) throw new Error('Selecciona una caja de origen.');
        if (!areaDestinoId) throw new Error('Selecciona un área de destino.');
        if (!fechaPresupuesto) throw new Error('Selecciona la fecha de la entrega.');
        await api.asignarPresupuesto({
          cajaOrigenId,
          areaDestinoId,
          importe: Number(importe),
          fecha: new Date(`${fechaPresupuesto}T12:00:00Z`).toISOString(),
          descripcion: observaciones.trim() || undefined,
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

  const handleOpenEdit = (mov: Operacion) => {
    setEditingMov(mov);
    setEditImporte(mov.importe);
    setEditConcepto(mov.concepto);
    setEditDescripcion(mov.descripcion || '');
    setEditObservaciones(mov.observaciones || '');
    setEditError(null);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editImporte <= 0) { setEditError('El importe debe ser mayor a cero.'); return; }
    if (!editConcepto.trim()) { setEditError('El concepto es obligatorio.'); return; }
    setEditSubmitting(true);
    try {
      await api.editarOperacion(editingMov!.id, {
        importe: Number(editImporte),
        concepto: editConcepto.trim(),
        descripcion: editDescripcion.trim() || editConcepto.trim(),
        observaciones: editObservaciones.trim() || undefined,
      });
      setEditingMov(null);
      await loadMovimientos();
      onOperationCompleted();
    } catch (err: any) {
      setEditError(err.message || 'Error al editar el movimiento.');
    } finally {
      setEditSubmitting(false);
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
            {canAccessModule('entradas') && (
              <button
                onClick={() => openModal('entrada')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Nueva Entrada</span>
              </button>
            )}
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
            {canAsignarPresupuesto && (
              <button
                onClick={() => openModal('presupuesto')}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
              >
                <PiggyBank className="w-4 h-4" />
                <span>Asignar presupuesto a área</span>
              </button>
            )}
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
                  {canAccessModule('entradas') && (
                    <button
                      onClick={() => openModal('entrada')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                    >
                      <span>+ Entrada</span>
                    </button>
                  )}
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

        {/* Vista Móvil en Tarjetas (< md) */}
        <div className="md:hidden p-3 space-y-3 bg-slate-50/60">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              Cargando movimientos...
            </div>
          ) : movimientos.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              No hay movimientos registrados para esta caja.
            </div>
          ) : (
            movimientos.map((op) => (
              <div
                key={op.id}
                className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-xs text-slate-500">#{op.id}</span>
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
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        op.estado === 'CONFIRMADA'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200 line-through'
                      }`}
                    >
                      {op.estado}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-extrabold whitespace-nowrap shrink-0 ${
                      op.tipoOperacion === 'ENTRADA'
                        ? 'text-emerald-600'
                        : op.tipoOperacion === 'SALIDA'
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {op.tipoOperacion === 'ENTRADA' ? '+' : op.tipoOperacion === 'SALIDA' ? '-' : ''}
                    {formatMoney(op.importe)}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">{op.concepto}</p>
                  {op.descripcion && <p className="text-[11px] text-slate-500 mt-0.5">{op.descripcion}</p>}
                </div>

                <div className="grid grid-cols-1 gap-1 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Caja(s):</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {op.tipoOperacion === 'TRANSFERENCIA'
                        ? `${op.cajaOrigenNombre || 'Presupuesto Área'} ➔ ${op.cajaDestinoNombre || 'Presupuesto Área'}`
                        : op.cajaDestinoNombre || op.cajaOrigenNombre || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Fecha:</span>
                    <span className="text-right">{new Date(op.fechaOperacion).toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Responsable:</span>
                    <span className="font-medium text-slate-700 text-right">{op.usuarioNombre}</span>
                  </div>
                </div>

                {(isAdmin || canEditarMovimientos) && op.tipoOperacion !== 'REVERSA' && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                    {canEditarMovimientos && op.estado !== 'ANULADA' && (
                      <button
                        onClick={() => handleOpenEdit(op)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    )}
                    {isAdmin && op.estado === 'CONFIRMADA' && (
                      <button
                        onClick={() => setAnulandoOpId(op.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revertir</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Tabla de Movimientos (Desktop y Tablet >= md) */}
        <div className="hidden md:block overflow-x-auto">
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
                {(isAdmin || canEditarMovimientos) && <th className="py-3 px-4 text-center">Acción</th>}
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
                          {op.cajaOrigenNombre || 'Presupuesto Área'} ➔ {op.cajaDestinoNombre || 'Presupuesto Área'}
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
                    {(isAdmin || canEditarMovimientos) && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {canEditarMovimientos && op.estado !== 'ANULADA' && op.tipoOperacion !== 'REVERSA' && (
                            <button
                              onClick={() => handleOpenEdit(op)}
                              title="Editar movimiento"
                              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && op.estado === 'CONFIRMADA' && op.tipoOperacion !== 'REVERSA' ? (
                            <button
                              onClick={() => setAnulandoOpId(op.id)}
                              title="Revertir movimiento contablemente"
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            !canEditarMovimientos && <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </div>
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                operacionModal === 'entrada'
                  ? 'bg-emerald-800'
                  : operacionModal === 'salida'
                  ? 'bg-rose-800'
                  : operacionModal === 'presupuesto'
                  ? 'bg-orange-600'
                  : 'bg-blue-800'
              }`}
            >
              <div>
                <h3 className="font-bold text-lg capitalize">
                  {operacionModal === 'entrada'
                    ? 'Registrar Entrada de Dinero'
                    : operacionModal === 'salida'
                    ? 'Registrar Salida de Efectivo'
                    : operacionModal === 'presupuesto'
                    ? 'Asignar Presupuesto a Área'
                    : 'Transferencia entre Cajas'}
                </h3>
                <p className="text-xs text-white/80">
                  {operacionModal === 'transferencia'
                    ? 'El patrimonio total de tesorería se mantiene idéntico.'
                    : operacionModal === 'presupuesto'
                    ? 'Transferencia interna desde una caja hacia el presupuesto disponible de un área.'
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

              {operacionModal === 'presupuesto' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Caja de Origen *</label>
                    <select
                      value={cajaOrigenId}
                      onChange={(e) => setCajaOrigenId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      {cajas.filter(c => c.activa).map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} (Disp: {formatMoney(c.saldoActual)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Área de Destino *</label>
                    {loadingAreas ? (
                      <p className="text-xs text-slate-500 py-2">Cargando áreas activas...</p>
                    ) : areasPresupuesto.length === 0 ? (
                      <p className="text-xs text-red-600 py-2">No hay áreas activas disponibles.</p>
                    ) : (
                      <select
                        value={areaDestinoId}
                        onChange={(e) => setAreaDestinoId(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      >
                        {areasPresupuesto.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      required
                      value={fechaPresupuesto}
                      onChange={(e) => setFechaPresupuesto(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
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

      {/* Modal: Editar Movimiento */}
      {editingMov && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="bg-blue-800 text-white p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Pencil className="w-5 h-5" /> Editar Movimiento #{editingMov.id}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Tipo: {editingMov.tipoOperacion} · El saldo de la caja se recalculará automáticamente.
                </p>
              </div>
              <button onClick={() => setEditingMov(null)} className="text-white/70 hover:text-white text-lg font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Importe (MXN) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editImporte}
                  onChange={e => setEditImporte(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Concepto *</label>
                <input
                  type="text"
                  required
                  value={editConcepto}
                  onChange={e => setEditConcepto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
                <input
                  type="text"
                  value={editDescripcion}
                  onChange={e => setEditDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones</label>
                <input
                  type="text"
                  value={editObservaciones}
                  onChange={e => setEditObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMov(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reversión de Movimiento */}
      {anulandoOpId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
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
