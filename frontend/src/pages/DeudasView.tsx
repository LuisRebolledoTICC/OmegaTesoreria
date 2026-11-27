import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Users,
  Plus,
  Pencil,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  RotateCcw,
  History,
  UserPlus,
  Search,
  X,
  ArrowLeftRight,
  UserX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ActividadDeuda,
  AsignacionDeuda,
  Caja,
  DeudasResumenGlobal,
  HistorialPagoDeuda,
  Operacion,
  UsuarioDeudaDetalle
} from '../types';

interface DeudasViewProps {
  cajas: Caja[];
  onBalanceChanged: () => void;
}

export const DeudasView: React.FC<DeudasViewProps> = ({ cajas, onBalanceChanged }) => {
  const { isAdmin, canAccessModule } = useAuth();

  const canVerTodos = isAdmin || canAccessModule('deudas_consultar_todos');
  const canVerDetalle = isAdmin || canAccessModule('deudas_consultar_detalle') || canVerTodos;
  const canCrearActividad = isAdmin || canAccessModule('deudas_actividades_crear');
  const canEditarActividad = isAdmin || canAccessModule('deudas_actividades_editar');
  const canAsignarActividad = isAdmin || canAccessModule('deudas_actividades_asignar');
  const canRegistrarPago = isAdmin || canAccessModule('deudas_pagos_registrar');
  const canRevertirPago = isAdmin || canAccessModule('deudas_pagos_revertir');
  const canVerHistorial = isAdmin || canAccessModule('deudas_pagos_historial');
  const canVerMovimientos = isAdmin || canAccessModule('deudas_movimientos_bancarios');

  type SubTab = 'usuarios' | 'mis_deudas' | 'actividades' | 'historial' | 'movimientos';
  const [subTab, setSubTab] = useState<SubTab>(() => (canVerTodos ? 'usuarios' : 'mis_deudas'));

  const [resumenGlobal, setResumenGlobal] = useState<DeudasResumenGlobal | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detalleUsuario, setDetalleUsuario] = useState<UsuarioDeudaDetalle | null>(null);
  const [misDeudas, setMisDeudas] = useState<UsuarioDeudaDetalle | null>(null);
  const [actividades, setActividades] = useState<ActividadDeuda[]>([]);
  const [historialPagos, setHistorialPagos] = useState<HistorialPagoDeuda[]>([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState<Operacion[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchUsuario, setSearchUsuario] = useState('');

  // Modal Crear / Editar Actividad
  const [showActModal, setShowActModal] = useState(false);
  const [editingAct, setEditingAct] = useState<ActividadDeuda | null>(null);
  const [actNombre, setActNombre] = useState('');
  const [actImporte, setActImporte] = useState('');
  const [actFecha, setActFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [actDesc, setActDesc] = useState('');
  const [savingAct, setSavingAct] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  // Modal Registrar Pago
  const [pagandoAsig, setPagandoAsig] = useState<AsignacionDeuda | null>(null);
  const [formaPago, setFormaPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [cajaPagoId, setCajaPagoId] = useState<number>(0);
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingPago, setSavingPago] = useState(false);
  const [pagoError, setPagoError] = useState<string | null>(null);

  // Modal Revertir Pago
  const [revirtiendoAsig, setRevirtiendoAsig] = useState<AsignacionDeuda | null>(null);
  const [motivoReversion, setMotivoReversion] = useState('');
  const [savingReversion, setSavingReversion] = useState(false);
  const [reversionError, setReversionError] = useState<string | null>(null);

  const cajasEfectivo = cajas.filter((c) => c.activa && c.tipo !== 'TRANSFERENCIAS');
  const cajasTransferencia = cajas.filter((c) => c.activa && c.tipo === 'TRANSFERENCIAS');

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const loadTabContent = async (targetTab: SubTab = subTab) => {
    setLoading(true);
    setError(null);
    try {
      if (targetTab === 'usuarios' && canVerTodos) {
        setResumenGlobal(await api.getDeudasResumenGlobal());
      } else if (targetTab === 'mis_deudas') {
        setMisDeudas(await api.getMisDeudas());
      } else if (targetTab === 'actividades') {
        setActividades(await api.getActividadesDeuda());
      } else if (targetTab === 'historial' && canVerHistorial) {
        setHistorialPagos(await api.getHistorialPagosDeuda());
      } else if (targetTab === 'movimientos' && canVerMovimientos) {
        setMovimientosBancarios(await api.getMovimientosBancariosDeudas());
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabContent(subTab);
  }, [subTab]);

  const loadDetalleUsuario = async (usuarioId: number) => {
    setLoadingDetalle(true);
    setError(null);
    try {
      const data = await api.getDeudaDetalleUsuario(usuarioId);
      setDetalleUsuario(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el detalle del usuario.');
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => {
    if (selectedUserId !== null) {
      loadDetalleUsuario(selectedUserId);
    } else {
      setDetalleUsuario(null);
    }
  }, [selectedUserId]);

  // ── Handlers Actividades ───────────────────────────────────────────────────

  const openCrearActividad = () => {
    setEditingAct(null);
    setActNombre('');
    setActImporte('');
    setActFecha(new Date().toISOString().slice(0, 10));
    setActDesc('');
    setActError(null);
    setShowActModal(true);
  };

  const openEditarActividad = (act: ActividadDeuda) => {
    setEditingAct(act);
    setActNombre(act.nombre);
    setActImporte(String(act.importe));
    setActFecha(act.fechaActividad.slice(0, 10));
    setActDesc(act.descripcion || '');
    setActError(null);
    setShowActModal(true);
  };

  const handleSaveActividad = async (e: React.FormEvent) => {
    e.preventDefault();
    const imp = Number(actImporte);
    if (!actNombre.trim()) { setActError('El nombre es obligatorio.'); return; }
    if (isNaN(imp) || imp <= 0) { setActError('El importe debe ser mayor a cero.'); return; }

    setSavingAct(true);
    setActError(null);
    try {
      if (editingAct) {
        await api.updateActividadDeuda(editingAct.id, {
          nombre: actNombre.trim(),
          importe: imp,
          fechaActividad: new Date(actFecha + 'T12:00:00Z').toISOString(),
          descripcion: actDesc.trim() || undefined,
        });
        setSuccessMsg('Actividad actualizada correctamente.');
      } else {
        const created = await api.createActividadDeuda({
          nombre: actNombre.trim(),
          importe: imp,
          fechaActividad: new Date(actFecha + 'T12:00:00Z').toISOString(),
          descripcion: actDesc.trim() || undefined,
        });
        setSuccessMsg(`Actividad "${created.nombre}" creada y asignada a ${created.totalAsignados} usuario(s) de Omega.`);
      }
      setShowActModal(false);
      await loadTabContent('actividades');
    } catch (err: any) {
      setActError(err.message || 'Error al guardar la actividad.');
    } finally {
      setSavingAct(false);
    }
  };

  const handleAsignarFaltantes = async (act: ActividadDeuda) => {
    try {
      const res = await api.asignarFaltantesActividad(act.id);
      setSuccessMsg(res.message);
      await loadTabContent('actividades');
    } catch (err: any) {
      setError(err.message || 'Error al asignar usuarios faltantes.');
    }
  };

  // ── Handlers Pagos & Estados ───────────────────────────────────────────────

  const openPagarModal = (asig: AsignacionDeuda) => {
    setPagandoAsig(asig);
    const defaultForma: 'EFECTIVO' | 'TRANSFERENCIA' = cajasEfectivo.length > 0 ? 'EFECTIVO' : 'TRANSFERENCIA';
    setFormaPago(defaultForma);
    if (defaultForma === 'EFECTIVO') {
      setCajaPagoId(cajasEfectivo[0]?.id ?? 0);
    } else {
      setCajaPagoId(cajasTransferencia[0]?.id ?? 0);
    }
    setFechaPago(new Date().toISOString().slice(0, 10));
    setPagoError(null);
  };

  const handleChangeFormaPago = (nuevaForma: 'EFECTIVO' | 'TRANSFERENCIA') => {
    setFormaPago(nuevaForma);
    if (nuevaForma === 'EFECTIVO') {
      setCajaPagoId(cajasEfectivo[0]?.id ?? 0);
    } else {
      setCajaPagoId(cajasTransferencia[0]?.id ?? 0);
    }
  };

  const handleConfirmPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagandoAsig) return;
    if (!cajaPagoId) {
      setPagoError('Debes seleccionar una caja compatible con la forma de pago.');
      return;
    }

    setSavingPago(true);
    setPagoError(null);
    try {
      await api.registrarPagoDeuda(pagandoAsig.id, {
        formaPago,
        cajaId: cajaPagoId,
        fechaPago: new Date(fechaPago + 'T12:00:00Z').toISOString(),
      });
      setPagandoAsig(null);
      setSuccessMsg('Pago registrado correctamente y reflejado en Movimientos Bancarios.');
      onBalanceChanged();
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setPagoError(err.message || 'No se pudo registrar el pago.');
    } finally {
      setSavingPago(false);
    }
  };

  const handleCambiarEstado = async (asig: AsignacionDeuda, nuevoEstado: 'PENDIENTE' | 'NO_ASISTIO') => {
    if (asig.estado === 'PAGADO') {
      if (!confirm(`Esta actividad ya tiene un pago registrado. Al marcarla como "${nuevoEstado === 'NO_ASISTIO' ? 'No asistió' : 'Pendiente'}", se revertirá el pago anterior y se ajustará el saldo de la caja. ¿Continuar?`)) {
        return;
      }
    }
    try {
      await api.cambiarEstadoDeuda(asig.id, { nuevoEstado });
      setSuccessMsg(`Estado actualizado a ${nuevoEstado === 'NO_ASISTIO' ? 'No asistió' : 'Pendiente'}.`);
      if (asig.estado === 'PAGADO') onBalanceChanged();
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado.');
    }
  };

  const openRevertirModal = (asig: AsignacionDeuda) => {
    setRevirtiendoAsig(asig);
    setMotivoReversion('');
    setReversionError(null);
  };

  const handleConfirmReversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revirtiendoAsig) return;
    if (!motivoReversion.trim()) {
      setReversionError('El motivo de reversión es obligatorio.');
      return;
    }

    setSavingReversion(true);
    setReversionError(null);
    try {
      await api.revertirPagoDeuda(revirtiendoAsig.id, motivoReversion.trim());
      setRevirtiendoAsig(null);
      setSuccessMsg('Pago revertido correctamente. El saldo de la caja y la deuda del usuario fueron actualizados.');
      onBalanceChanged();
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setReversionError(err.message || 'No se pudo revertir el pago.');
    } finally {
      setSavingReversion(false);
    }
  };

  const usuariosFiltrados = (resumenGlobal?.usuarios ?? []).filter((u) =>
    u.nombre.toLowerCase().includes(searchUsuario.toLowerCase()) ||
    u.userName.toLowerCase().includes(searchUsuario.toLowerCase())
  );

  // ── Renderizado de Detalle de Deudas (reutilizado en Mis Deudas y Detalle Usuario) ──
  const renderDetalleActividades = (detalle: UsuarioDeudaDetalle, allowActions: boolean) => {
    const estaAlDia = detalle.resumen.deudaTotal <= 0;
    return (
      <div className="space-y-4">
        {/* Resumen del usuario */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{detalle.resumen.nombre}</h3>
            <p className="text-xs text-slate-500">@{detalle.resumen.userName} · {detalle.resumen.rol}</p>
          </div>
          {estaAlDia ? (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-black text-emerald-800">Está al día</span>
            </div>
          ) : (
            <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-right">
              <p className="text-[10px] font-bold uppercase text-rose-700">Deuda Total</p>
              <p className="text-2xl font-black text-rose-900">{formatMoney(detalle.resumen.deudaTotal)}</p>
            </div>
          )}
        </div>

        {/* Tabla de actividades */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {detalle.actividades.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No hay actividades asignadas a este usuario todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Actividad</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Deuda</th>
                    <th className="py-3 px-4">Forma de Pago / Caja</th>
                    {allowActions && <th className="py-3 px-4 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalle.actividades.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{a.actividadNombre}</p>
                        {a.actividadDescripcion && (
                          <p className="text-[11px] text-slate-500">{a.actividadDescripcion}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(a.fechaActividad).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatMoney(a.importeOriginal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            a.estado === 'PAGADO'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : a.estado === 'NO_ASISTIO'
                              ? 'bg-slate-100 text-slate-600 border-slate-300'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {a.estado === 'PAGADO' ? 'Pagado' : a.estado === 'NO_ASISTIO' ? 'No asistió' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        <span className={a.deudaCorrespondiente > 0 ? 'text-rose-700' : 'text-slate-500'}>
                          {formatMoney(a.deudaCorrespondiente)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {a.estado === 'PAGADO' ? (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.formaPago === 'EFECTIVO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {a.formaPago}
                            </span>
                            {a.cajaNombre && (
                              <p className="text-[11px] text-slate-600 font-medium">{a.cajaNombre}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      {allowActions && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {a.estado !== 'PAGADO' && canRegistrarPago && (
                              <button
                                type="button"
                                onClick={() => openPagarModal(a)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                Pagar
                              </button>
                            )}
                            {a.estado === 'PENDIENTE' && (canAsignarActividad || canRegistrarPago) && (
                              <button
                                type="button"
                                onClick={() => handleCambiarEstado(a, 'NO_ASISTIO')}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                title="Marcar como No asistió (deuda $0, sin ingreso)"
                              >
                                No asistió
                              </button>
                            )}
                            {a.estado === 'NO_ASISTIO' && (canAsignarActividad || canRegistrarPago) && (
                              <button
                                type="button"
                                onClick={() => handleCambiarEstado(a, 'PENDIENTE')}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                Volver a Pendiente
                              </button>
                            )}
                            {a.estado === 'PAGADO' && canRevertirPago && (
                              <button
                                type="button"
                                onClick={() => openRevertirModal(a)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Revertir pago registrado por error"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Revertir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + Sub-tabs */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              <span>Módulo de Deudas y Actividades</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control individual de actividades, asistencia, pagos en efectivo/transferencia y trazabilidad bancaria.
            </p>
          </div>
          {canCrearActividad && (
            <button
              type="button"
              onClick={openCrearActividad}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Actividad</span>
            </button>
          )}
        </div>

        {/* Pestañas internas según permisos */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {canVerTodos && (
            <button
              type="button"
              onClick={() => { setSelectedUserId(null); setSubTab('usuarios'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'usuarios' ? 'bg-slate-900 text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Deudas por Usuario</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => { setSelectedUserId(null); setSubTab('mis_deudas'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'mis_deudas' ? 'bg-slate-900 text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Mis Deudas</span>
          </button>
          {(canVerTodos || canCrearActividad || canEditarActividad || canAsignarActividad) && (
            <button
              type="button"
              onClick={() => { setSelectedUserId(null); setSubTab('actividades'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'actividades' ? 'bg-slate-900 text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Actividades</span>
            </button>
          )}
          {canVerHistorial && (
            <button
              type="button"
              onClick={() => { setSelectedUserId(null); setSubTab('historial'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'historial' ? 'bg-slate-900 text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial de Pagos</span>
            </button>
          )}
          {canVerMovimientos && (
            <button
              type="button"
              onClick={() => { setSelectedUserId(null); setSubTab('movimientos'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'movimientos' ? 'bg-slate-900 text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Movimientos Bancarios</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* SUBTAB: DEUDAS POR USUARIO */}
      {subTab === 'usuarios' && canVerTodos && (
        selectedUserId !== null ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a lista de usuarios</span>
            </button>
            {loadingDetalle || !detalleUsuario ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                Cargando detalle del usuario...
              </div>
            ) : (
              renderDetalleActividades(detalleUsuario, true)
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchUsuario}
                  onChange={(e) => setSearchUsuario(e.target.value)}
                  placeholder="Buscar usuario de Omega..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {resumenGlobal && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-600">
                    Por cobrar: <strong className="text-rose-700">{formatMoney(resumenGlobal.totalDeudaPendiente)}</strong>
                  </span>
                  <span className="text-slate-600">
                    Recaudado: <strong className="text-emerald-700">{formatMoney(resumenGlobal.totalRecaudado)}</strong>
                  </span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Cargando usuarios de Omega...</div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No se encontraron usuarios de Omega.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {usuariosFiltrados.map((u) => (
                  <button
                    key={u.usuarioId}
                    type="button"
                    disabled={!canVerDetalle}
                    onClick={() => canVerDetalle && setSelectedUserId(u.usuarioId)}
                    className={`w-full px-5 py-4 flex items-center justify-between text-left transition ${
                      canVerDetalle ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-900">{u.nombre}</span>
                    <span
                      className={`text-sm font-black ${
                        u.deudaTotal > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {u.deudaTotal > 0 ? formatMoney(u.deudaTotal) : 'Está al día ($0.00)'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* SUBTAB: MIS DEUDAS (Solo lectura para el propio usuario) */}
      {subTab === 'mis_deudas' && (
        loading || !misDeudas ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Cargando tus deudas...
          </div>
        ) : (
          renderDetalleActividades(misDeudas, false)
        )
      )}

      {/* SUBTAB: ACTIVIDADES */}
      {subTab === 'actividades' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Cargando actividades...</div>
          ) : actividades.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No hay actividades creadas aún. Usa el botón "Nueva Actividad" para crear una y asignarla a los usuarios de Omega.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Actividad</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                    <th className="py-3 px-4 text-center">Asignados</th>
                    <th className="py-3 px-4 text-center">Pendientes / Pagados / No asistió</th>
                    <th className="py-3 px-4 text-right">Recaudado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actividades.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{act.nombre}</p>
                        {act.descripcion && <p className="text-[11px] text-slate-500">{act.descripcion}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(act.fechaActividad).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(act.importe)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{act.totalAsignados}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded font-bold mr-1">{act.totalPendientes} P</span>
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold mr-1">{act.totalPagados} Pag</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">{act.totalNoAsistio} NA</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatMoney(act.totalRecaudado)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {canEditarActividad && (
                            <button
                              type="button"
                              onClick={() => openEditarActividad(act)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                              title="Editar actividad"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canAsignarActividad && (
                            <button
                              type="button"
                              onClick={() => handleAsignarFaltantes(act)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                              title="Asignar a nuevos integrantes de Omega que aún no tengan esta actividad"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Asignar nuevos</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: HISTORIAL DE PAGOS */}
      {subTab === 'historial' && canVerHistorial && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Cargando historial de pagos...</div>
          ) : historialPagos.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No hay pagos registrados todavía.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha Pago</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Actividad</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                    <th className="py-3 px-4">Forma / Caja</th>
                    <th className="py-3 px-4">Mov. Bancario</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Registró / Reversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historialPagos.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {new Date(h.fechaPago).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{h.usuarioNombre}</td>
                      <td className="py-3 px-4 text-slate-800">{h.actividadNombre}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(h.importe)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 ${h.formaPago === 'EFECTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          {h.formaPago}
                        </span>
                        <span className="text-[11px] text-slate-600">{h.cajaNombre}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        Op #{h.operacionTesoreriaId}
                        {h.operacionReversaId && <span className="text-rose-600"> (Rev #{h.operacionReversaId})</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.estado === 'CONFIRMADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {h.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <p>Reg: {h.registradoPor}</p>
                        {h.estado === 'REVERTIDO' && (
                          <p className="text-rose-700">Rev: {h.revertidoPor} — {h.motivoReversion}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: MOVIMIENTOS BANCARIOS RELACIONADOS */}
      {subTab === 'movimientos' && canVerMovimientos && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Cargando movimientos bancarios...</div>
          ) : movimientosBancarios.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No hay movimientos bancarios generados por deudas todavía.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Caja</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientosBancarios.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">#{op.id}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${op.tipoOperacion === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>
                          {op.tipoOperacion}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(op.fechaOperacion).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {op.cajaDestinoNombre || op.cajaOrigenNombre || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{op.concepto}</p>
                        {op.descripcion && <p className="text-[11px] text-slate-500">{op.descripcion}</p>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        {formatMoney(op.importe)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${op.estado === 'CONFIRMADA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200 line-through'}`}>
                          {op.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR ACTIVIDAD */}
      {showActModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAct ? 'Editar Actividad' : 'Nueva Actividad de Deuda'}
              </h3>
              <button type="button" onClick={() => setShowActModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingAct && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs">
                Se asignará automáticamente a todos los usuarios activos con rol <strong>Omega</strong> (excluyendo administradores).
              </div>
            )}

            {actError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{actError}</div>
            )}

            <form onSubmit={handleSaveActividad} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre / Concepto *</label>
                <input
                  type="text"
                  required
                  value={actNombre}
                  onChange={(e) => setActNombre(e.target.value)}
                  placeholder="Ej. Campamento anual / Playera Omega"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Importe (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={actImporte}
                    onChange={(e) => setActImporte(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={actFecha}
                    onChange={(e) => setActFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowActModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={savingAct} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold">
                  {savingAct ? 'Guardando...' : 'Guardar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PAGO */}
      {pagandoAsig && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registrar Pago de Deuda</h3>
                <p className="text-xs text-slate-500">
                  {pagandoAsig.usuarioNombre} · {pagandoAsig.actividadNombre} ({formatMoney(pagandoAsig.importeOriginal)})
                </p>
              </div>
              <button type="button" onClick={() => setPagandoAsig(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pagoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{pagoError}</div>
            )}

            <form onSubmit={handleConfirmPago} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Forma de Pago *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeFormaPago('EFECTIVO')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formaPago === 'EFECTIVO'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeFormaPago('TRANSFERENCIA')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formaPago === 'TRANSFERENCIA'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {formaPago === 'EFECTIVO' ? 'Caja de Efectivo Destino *' : 'Caja de Transferencias Destino *'}
                </label>
                <select
                  required
                  value={cajaPagoId}
                  onChange={(e) => setCajaPagoId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {(formaPago === 'EFECTIVO' ? cajasEfectivo : cajasTransferencia).length === 0 ? (
                    <option value={0}>No hay cajas compatibles activas</option>
                  ) : (
                    (formaPago === 'EFECTIVO' ? cajasEfectivo : cajasTransferencia).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} (Saldo actual: {formatMoney(c.saldoActual)})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formaPago === 'EFECTIVO'
                    ? 'Solo se permiten cajas de efectivo (la caja de Transferencias está bloqueada).'
                    : 'Los pagos por transferencia se depositan obligatoriamente en la caja de Transferencias.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha del Pago *</label>
                <input
                  type="date"
                  required
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setPagandoAsig(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPago || !cajaPagoId} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
                  {savingPago ? 'Registrando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REVERTIR PAGO */}
      {revirtiendoAsig && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>Revertir Pago Registrado</span>
            </h3>
            <p className="text-xs text-slate-600">
              Se revertirá el pago de <strong>{formatMoney(revirtiendoAsig.importeOriginal)}</strong> de{' '}
              <strong>{revirtiendoAsig.usuarioNombre}</strong> ({revirtiendoAsig.actividadNombre}). El movimiento original se conservará marcado como anulado y se generará su reversión bancaria.
            </p>
            {reversionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{reversionError}</div>
            )}
            <form onSubmit={handleConfirmReversion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo de reversión *</label>
                <textarea
                  required
                  rows={3}
                  value={motivoReversion}
                  onChange={(e) => setMotivoReversion(e.target.value)}
                  placeholder="Ej. Pago registrado por error en usuario equivocado"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRevirtiendoAsig(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={savingReversion} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold">
                  {savingReversion ? 'Revirtiendo...' : 'Confirmar Reversión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
