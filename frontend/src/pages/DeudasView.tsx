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
  UserX,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ActividadDeuda,
  AjusteDeuda,
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
  const canAjusteSaldoPrevio = isAdmin || canAccessModule('deudas_ajustes_saldo_previo');
  const canAjustePerdonar = isAdmin || canAccessModule('deudas_ajustes_perdonar');
  const canAjusteCorregir = isAdmin || canAccessModule('deudas_ajustes_corregir');
  const canRevertirAjuste = isAdmin || canAccessModule('deudas_ajustes_revertir');
  const canAjustarDeuda = canAjusteSaldoPrevio || canAjustePerdonar || canAjusteCorregir;

  type SubTab = 'usuarios' | 'mis_deudas' | 'actividades' | 'historial' | 'ajustes' | 'movimientos';
  const [subTab, setSubTab] = useState<SubTab>(() => (canVerTodos ? 'usuarios' : 'mis_deudas'));

  const [resumenGlobal, setResumenGlobal] = useState<DeudasResumenGlobal | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detalleUsuario, setDetalleUsuario] = useState<UsuarioDeudaDetalle | null>(null);
  const [misDeudas, setMisDeudas] = useState<UsuarioDeudaDetalle | null>(null);
  const [actividades, setActividades] = useState<ActividadDeuda[]>([]);
  const [historialPagos, setHistorialPagos] = useState<HistorialPagoDeuda[]>([]);
  const [historialAjustes, setHistorialAjustes] = useState<AjusteDeuda[]>([]);
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

  // Modal Registrar Abono / Pago
  const [pagandoAsig, setPagandoAsig] = useState<AsignacionDeuda | null>(null);
  const [montoAbono, setMontoAbono] = useState<string>('');
  const [formaPago, setFormaPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [cajaPagoId, setCajaPagoId] = useState<number>(0);
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingPago, setSavingPago] = useState(false);
  const [pagoError, setPagoError] = useState<string | null>(null);

  // Modal Revertir Pago / Abono
  const [revirtiendoAsig, setRevirtiendoAsig] = useState<AsignacionDeuda | null>(null);
  const [revirtiendoAbono, setRevirtiendoAbono] = useState<HistorialPagoDeuda | null>(null);
  const [motivoReversion, setMotivoReversion] = useState('');
  const [savingReversion, setSavingReversion] = useState(false);
  const [reversionError, setReversionError] = useState<string | null>(null);

  // Modal Ajustar Deuda (sin cajas)
  const [ajustandoAsig, setAjustandoAsig] = useState<AsignacionDeuda | null>(null);
  const [montoAjuste, setMontoAjuste] = useState<string>('');
  const [tipoAjuste, setTipoAjuste] = useState<'SALDO_PREVIO' | 'PERDONAR_DEUDA' | 'CORRECCION'>('SALDO_PREVIO');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [fechaAjuste, setFechaAjuste] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingAjuste, setSavingAjuste] = useState(false);
  const [ajusteError, setAjusteError] = useState<string | null>(null);

  // Modal Revertir Ajuste
  const [revirtiendoAjusteItem, setRevirtiendoAjusteItem] = useState<{ asig: AsignacionDeuda; ajuste: AjusteDeuda } | null>(null);
  const [motivoReversionAjuste, setMotivoReversionAjuste] = useState('');
  const [savingReversionAjuste, setSavingReversionAjuste] = useState(false);
  const [reversionAjusteError, setReversionAjusteError] = useState<string | null>(null);

  // Expansión de historial de abonos por actividad
  const [expandedAbonos, setExpandedAbonos] = useState<Record<number, boolean>>({});

  const toggleExpandAbonos = (asigId: number) => {
    setExpandedAbonos((prev) => ({ ...prev, [asigId]: !prev[asigId] }));
  };

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
      } else if (targetTab === 'ajustes' && canVerHistorial) {
        setHistorialAjustes(await api.getHistorialAjustesDeuda());
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
    setMontoAbono(asig.saldoPendiente > 0 ? String(asig.saldoPendiente) : String(asig.importeOriginal));
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
    const monto = Number(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      setPagoError('El importe a abonar debe ser mayor a cero.');
      return;
    }
    if (monto > pagandoAsig.saldoPendiente) {
      setPagoError(`El importe no puede superar el saldo pendiente (${formatMoney(pagandoAsig.saldoPendiente)}).`);
      return;
    }
    if (!cajaPagoId) {
      setPagoError('Debes seleccionar una caja compatible con la forma de pago.');
      return;
    }

    setSavingPago(true);
    setPagoError(null);
    try {
      await api.registrarPagoDeuda(pagandoAsig.id, {
        importe: monto,
        formaPago,
        cajaId: cajaPagoId,
        fechaPago: new Date(fechaPago + 'T12:00:00Z').toISOString(),
      });
      setPagandoAsig(null);
      setSuccessMsg(`Abono de ${formatMoney(monto)} registrado correctamente y reflejado en Movimientos Bancarios.`);
      onBalanceChanged();
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setPagoError(err.message || 'No se pudo registrar el abono.');
    } finally {
      setSavingPago(false);
    }
  };

  const handleCambiarEstado = async (asig: AsignacionDeuda, nuevoEstado: 'PENDIENTE' | 'NO_ASISTIO') => {
    const tieneAbonos = (asig.abonos ?? []).some((a) => a.estado === 'CONFIRMADO') || asig.totalAbonado > 0;
    if (nuevoEstado === 'NO_ASISTIO' && tieneAbonos) {
      if (!confirm(`Esta actividad tiene ${formatMoney(asig.totalAbonado)} en abonos recibidos. Al marcarla como "No asistió", se revertirán automáticamente todos los abonos activos, el dinero recibido se devolverá a las cajas correspondientes mediante reversiones bancarias, y la deuda terminará en $0. ¿Deseas continuar?`)) {
        return;
      }
    }
    try {
      await api.cambiarEstadoDeuda(asig.id, { nuevoEstado });
      setSuccessMsg(`Estado actualizado a ${nuevoEstado === 'NO_ASISTIO' ? 'No asistió' : 'Pendiente'}.`);
      if (tieneAbonos) onBalanceChanged();
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado.');
    }
  };

  const openRevertirModal = (asig: AsignacionDeuda, abono?: HistorialPagoDeuda) => {
    setRevirtiendoAsig(asig);
    setRevirtiendoAbono(abono || null);
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
      await api.revertirPagoDeuda(revirtiendoAsig.id, motivoReversion.trim(), revirtiendoAbono?.id);
      setRevirtiendoAsig(null);
      setRevirtiendoAbono(null);
      setSuccessMsg('Reversión aplicada correctamente. El saldo de la caja y el saldo pendiente de la actividad fueron recalculados.');
      onBalanceChanged();
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setReversionError(err.message || 'No se pudo revertir el abono.');
    } finally {
      setSavingReversion(false);
    }
  };

  // ── Handlers Ajustes de Deuda (Sin Cajas) ──────────────────────────────────

  const openAjustarModal = (asig: AsignacionDeuda) => {
    setAjustandoAsig(asig);
    setMontoAjuste('');
    if (canAjusteSaldoPrevio) setTipoAjuste('SALDO_PREVIO');
    else if (canAjustePerdonar) setTipoAjuste('PERDONAR_DEUDA');
    else setTipoAjuste('CORRECCION');
    setMotivoAjuste('');
    setFechaAjuste(new Date().toISOString().slice(0, 10));
    setAjusteError(null);
  };

  const handleConfirmAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajustandoAsig) return;
    const monto = Number(montoAjuste);
    if (isNaN(monto) || monto <= 0) {
      setAjusteError('El importe a descontar debe ser mayor a cero.');
      return;
    }
    if (monto > ajustandoAsig.saldoPendiente) {
      setAjusteError(`El importe a descontar no puede superar el saldo pendiente (${formatMoney(ajustandoAsig.saldoPendiente)}).`);
      return;
    }
    if (!motivoAjuste.trim()) {
      setAjusteError('El motivo o descripción del ajuste es obligatorio.');
      return;
    }

    setSavingAjuste(true);
    setAjusteError(null);
    try {
      await api.registrarAjusteDeuda(ajustandoAsig.id, {
        importe: monto,
        tipoAjuste,
        motivo: motivoAjuste.trim(),
        fechaAjuste: new Date(fechaAjuste + 'T12:00:00Z').toISOString(),
      });
      setAjustandoAsig(null);
      const labelTipo = tipoAjuste === 'SALDO_PREVIO' ? 'Saldo previo' : tipoAjuste === 'PERDONAR_DEUDA' ? 'Deuda perdonada' : 'Corrección';
      setSuccessMsg(`Ajuste (${labelTipo}) de ${formatMoney(monto)} registrado correctamente sin afectar cajas ni bancos.`);
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setAjusteError(err.message || 'No se pudo registrar el ajuste.');
    } finally {
      setSavingAjuste(false);
    }
  };

  const openRevertirAjusteModal = (asig: AsignacionDeuda, ajuste: AjusteDeuda) => {
    setRevirtiendoAjusteItem({ asig, ajuste });
    setMotivoReversionAjuste('');
    setReversionAjusteError(null);
  };

  const handleConfirmReversionAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revirtiendoAjusteItem) return;
    if (!motivoReversionAjuste.trim()) {
      setReversionAjusteError('El motivo de reversión es obligatorio.');
      return;
    }

    setSavingReversionAjuste(true);
    setReversionAjusteError(null);
    try {
      await api.revertirAjusteDeuda(revirtiendoAjusteItem.ajuste.id, motivoReversionAjuste.trim());
      setRevirtiendoAjusteItem(null);
      setSuccessMsg('Ajuste revertido correctamente. El saldo pendiente de la actividad y la deuda fueron recalculados.');
      if (selectedUserId !== null) await loadDetalleUsuario(selectedUserId);
      if (canVerTodos) setResumenGlobal(await api.getDeudasResumenGlobal());
    } catch (err: any) {
      setReversionAjusteError(err.message || 'No se pudo revertir el ajuste.');
    } finally {
      setSavingReversionAjuste(false);
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
                    <th className="py-3 px-4 text-right">Importe Original</th>
                    <th className="py-3 px-4 text-right">Abonos</th>
                    <th className="py-3 px-4 text-right">Ajustes</th>
                    <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Historial</th>
                    {allowActions && <th className="py-3 px-4 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalle.actividades.map((a) => {
                    const isExpanded = !!expandedAbonos[a.id];
                    const numAbonos = a.abonos?.length ?? 0;
                    const numAjustes = a.ajustes?.length ?? 0;
                    const totalRegistros = numAbonos + numAjustes;
                    return (
                      <React.Fragment key={a.id}>
                        <tr className="hover:bg-slate-50">
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
                          <td className="py-3 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {formatMoney(a.totalAbonado)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-purple-700 whitespace-nowrap">
                            {formatMoney(a.totalAjustes || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                            <span className={a.saldoPendiente > 0 ? 'text-rose-700 font-black' : 'text-slate-500'}>
                              {formatMoney(a.saldoPendiente)}
                            </span>
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
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleExpandAbonos(a.id)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                                isExpanded
                                  ? 'bg-slate-900 text-amber-400'
                                  : totalRegistros > 0
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                              title="Ver historial de abonos y ajustes de esta actividad"
                            >
                              <History className="w-3 h-3" />
                              <span>{numAbonos} abono(s) / {numAjustes} ajuste(s)</span>
                            </button>
                          </td>
                          {allowActions && (
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {a.estado !== 'PAGADO' && a.estado !== 'NO_ASISTIO' && a.saldoPendiente > 0 && canRegistrarPago && (
                                  <button
                                    type="button"
                                    onClick={() => openPagarModal(a)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                                  >
                                    Abonar / Pagar
                                  </button>
                                )}
                                {a.estado !== 'NO_ASISTIO' && a.saldoPendiente > 0 && canAjustarDeuda && (
                                  <button
                                    type="button"
                                    onClick={() => openAjustarModal(a)}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                    title="Ajustar deuda (Saldo previo, perdonar, corrección) sin afectar cajas"
                                  >
                                    <SlidersHorizontal className="w-3 h-3" />
                                    <span>Ajustar deuda</span>
                                  </button>
                                )}
                                {a.estado === 'PENDIENTE' && (canAsignarActividad || canRegistrarPago) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCambiarEstado(a, 'NO_ASISTIO')}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    title="Marcar como No asistió (deuda $0, sin recaudación)"
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
                                {a.estado === 'PAGADO' && canRevertirPago && numAbonos > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openRevertirModal(a)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                    title="Revertir último abono"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Revertir Abono</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Desglose de abonos y ajustes de la actividad */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={allowActions ? 9 : 8} className="p-3 border-y border-slate-200">
                              <div className="space-y-3">
                                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Abonos en Caja (Dinero Real): {a.actividadNombre}</span>
                                    </h4>
                                    <span className="text-[11px] text-slate-500 font-semibold">
                                      Total abonado: <strong className="text-emerald-700">{formatMoney(a.totalAbonado)}</strong> de {formatMoney(a.importeOriginal)}
                                    </span>
                                  </div>

                                  {(!a.abonos || a.abonos.length === 0) ? (
                                    <p className="text-[11px] text-slate-400 py-1 text-center">
                                      No hay abonos en caja registrados para esta actividad.
                                    </p>
                                  ) : (
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                                        <tr>
                                          <th className="py-1.5 px-3">Fecha</th>
                                          <th className="py-1.5 px-3 text-right">Importe</th>
                                          <th className="py-1.5 px-3">Forma de Pago</th>
                                          <th className="py-1.5 px-3">Caja</th>
                                          <th className="py-1.5 px-3">Registrado Por</th>
                                          <th className="py-1.5 px-3">Mov. Bancario</th>
                                          <th className="py-1.5 px-3 text-center">Estado</th>
                                          {allowActions && canRevertirPago && <th className="py-1.5 px-3 text-center">Acción</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {a.abonos.map((abono) => (
                                          <tr key={abono.id} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-3 whitespace-nowrap text-slate-600">
                                              {new Date(abono.fechaPago).toLocaleString('es-MX')}
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                              {formatMoney(abono.importe)}
                                            </td>
                                            <td className="py-1.5 px-3">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                abono.formaPago === 'EFECTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                              }`}>
                                                {abono.formaPago}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 font-medium text-slate-700">
                                              {abono.cajaNombre}
                                            </td>
                                            <td className="py-1.5 px-3 text-slate-600">
                                              {abono.registradoPor}
                                            </td>
                                            <td className="py-1.5 px-3 font-mono text-slate-600">
                                              Op #{abono.operacionTesoreriaId}
                                              {abono.operacionReversaId && (
                                                <span className="text-rose-600"> (Rev #{abono.operacionReversaId})</span>
                                              )}
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                abono.estado === 'CONFIRMADO'
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                              }`}>
                                                {abono.estado}
                                              </span>
                                              {abono.estado === 'REVERTIDO' && abono.motivoReversion && (
                                                <p className="text-[10px] text-rose-600 mt-0.5">{abono.motivoReversion}</p>
                                              )}
                                            </td>
                                            {allowActions && canRevertirPago && (
                                              <td className="py-1.5 px-3 text-center whitespace-nowrap">
                                                {abono.estado === 'CONFIRMADO' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => openRevertirModal(a, abono)}
                                                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                                    title="Revertir este abono específico"
                                                  >
                                                    <RotateCcw className="w-2.5 h-2.5" />
                                                    <span>Revertir</span>
                                                  </button>
                                                )}
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                <div className="bg-white rounded-xl border border-purple-200 p-3 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                      <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Ajustes de Deuda (Sin Caja ni Mov. Bancario)</span>
                                    </h4>
                                    <span className="text-[11px] text-purple-700 font-semibold">
                                      Total ajustes: <strong>{formatMoney(a.totalAjustes || 0)}</strong>
                                    </span>
                                  </div>

                                  {(!a.ajustes || a.ajustes.length === 0) ? (
                                    <p className="text-[11px] text-slate-400 py-1 text-center">
                                      No hay ajustes registrados para esta actividad.
                                    </p>
                                  ) : (
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="bg-purple-50 text-purple-900 font-bold uppercase border-b border-purple-200">
                                        <tr>
                                          <th className="py-1.5 px-3">Fecha</th>
                                          <th className="py-1.5 px-3 text-right">Importe</th>
                                          <th className="py-1.5 px-3">Tipo de Ajuste</th>
                                          <th className="py-1.5 px-3">Motivo / Descripción</th>
                                          <th className="py-1.5 px-3">Registrado Por</th>
                                          <th className="py-1.5 px-3 text-center">Estado</th>
                                          {allowActions && canRevertirAjuste && <th className="py-1.5 px-3 text-center">Acción</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-purple-100">
                                        {a.ajustes.map((ajuste) => (
                                          <tr key={ajuste.id} className="hover:bg-purple-50/50">
                                            <td className="py-1.5 px-3 whitespace-nowrap text-slate-600">
                                              {new Date(ajuste.fechaAjuste).toLocaleString('es-MX')}
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-bold text-purple-900 whitespace-nowrap">
                                              {formatMoney(ajuste.importe)}
                                            </td>
                                            <td className="py-1.5 px-3">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                ajuste.tipoAjuste === 'SALDO_PREVIO'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : ajuste.tipoAjuste === 'PERDONAR_DEUDA'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : 'bg-slate-200 text-slate-800'
                                              }`}>
                                                {ajuste.tipoAjuste === 'SALDO_PREVIO'
                                                  ? 'Saldo previo'
                                                  : ajuste.tipoAjuste === 'PERDONAR_DEUDA'
                                                  ? 'Deuda perdonada'
                                                  : 'Corrección'}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 text-slate-700">
                                              {ajuste.motivo}
                                            </td>
                                            <td className="py-1.5 px-3 text-slate-600">
                                              {ajuste.registradoPor}
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                ajuste.estado === 'CONFIRMADO'
                                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                              }`}>
                                                {ajuste.estado}
                                              </span>
                                              {ajuste.estado === 'REVERTIDO' && ajuste.motivoReversion && (
                                                <p className="text-[10px] text-rose-600 mt-0.5">{ajuste.motivoReversion}</p>
                                              )}
                                            </td>
                                            {allowActions && canRevertirAjuste && (
                                              <td className="py-1.5 px-3 text-center whitespace-nowrap">
                                                {ajuste.estado === 'CONFIRMADO' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => openRevertirAjusteModal(a, ajuste)}
                                                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                                    title="Revertir este ajuste de deuda"
                                                  >
                                                    <RotateCcw className="w-2.5 h-2.5" />
                                                    <span>Revertir</span>
                                                  </button>
                                                )}
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
              <span>Historial de Abonos</span>
            </button>
          )}
          {canVerHistorial && (
            <button
              type="button"
              onClick={() => { setSelectedUserId(null); setSubTab('ajustes'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'ajustes' ? 'bg-slate-900 text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Historial de Ajustes</span>
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

      {/* SUBTAB: HISTORIAL DE AJUSTES (SIN CAJAS) */}
      {subTab === 'ajustes' && canVerHistorial && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
              <span>Historial Global de Ajustes de Deuda</span>
            </h3>
            <span className="text-xs text-slate-500">
              {historialAjustes.length} ajuste(s) registrado(s) (sin afectación a cajas ni movimientos bancarios)
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Cargando historial de ajustes...</div>
          ) : historialAjustes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No hay ajustes registrados todavía.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-purple-50 text-purple-900 font-bold uppercase tracking-wider border-b border-purple-200">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Actividad</th>
                    <th className="py-3 px-4 text-right">Importe Descontado</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Motivo / Descripción</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {historialAjustes.map((aj) => (
                    <tr key={aj.id} className="hover:bg-purple-50/50">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(aj.fechaAjuste).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{aj.usuarioNombre}</td>
                      <td className="py-3 px-4 text-slate-800">{aj.actividadNombre}</td>
                      <td className="py-3 px-4 text-right font-bold text-purple-900 whitespace-nowrap">
                        {formatMoney(aj.importe)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          aj.tipoAjuste === 'SALDO_PREVIO'
                            ? 'bg-blue-100 text-blue-800'
                            : aj.tipoAjuste === 'PERDONAR_DEUDA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {aj.tipoAjuste === 'SALDO_PREVIO'
                            ? 'Saldo previo'
                            : aj.tipoAjuste === 'PERDONAR_DEUDA'
                            ? 'Deuda perdonada'
                            : 'Corrección'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {aj.motivo}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          aj.estado === 'CONFIRMADO'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {aj.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <p>Reg: {aj.registradoPor}</p>
                        {aj.estado === 'REVERTIDO' && (
                          <p className="text-rose-700">Rev: {aj.revertidoPor} — {aj.motivoReversion}</p>
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

      {/* MODAL REGISTRAR ABONO / PAGO */}
      {pagandoAsig && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registrar Abono a Deuda</h3>
                <p className="text-xs text-slate-500">
                  {pagandoAsig.usuarioNombre} · {pagandoAsig.actividadNombre}
                </p>
              </div>
              <button type="button" onClick={() => setPagandoAsig(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen de importes */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Original</p>
                <p className="text-xs font-bold text-slate-800">{formatMoney(pagandoAsig.importeOriginal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600">Abonado</p>
                <p className="text-xs font-bold text-emerald-700">{formatMoney(pagandoAsig.totalAbonado)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-rose-600">Saldo Pendiente</p>
                <p className="text-xs font-bold text-rose-700">{formatMoney(pagandoAsig.saldoPendiente)}</p>
              </div>
            </div>

            {pagoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{pagoError}</div>
            )}

            <form onSubmit={handleConfirmPago} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Importe del Abono (MXN) *</label>
                  <button
                    type="button"
                    onClick={() => setMontoAbono(String(pagandoAsig.saldoPendiente))}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Liquidar saldo completo ({formatMoney(pagandoAsig.saldoPendiente)})
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pagandoAsig.saldoPendiente}
                  required
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="0.00"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Puedes registrar un pago parcial. Si el saldo llega a $0.00, la actividad pasará automáticamente a Pagado.
                </p>
              </div>

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
                  {savingPago ? 'Registrando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REVERTIR ABONO / PAGO */}
      {revirtiendoAsig && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>Revertir Abono Registrado</span>
            </h3>
            <p className="text-xs text-slate-600">
              {revirtiendoAbono ? (
                <>
                  Se revertirá el abono de <strong>{formatMoney(revirtiendoAbono.importe)}</strong> ({revirtiendoAbono.formaPago}) en <strong>{revirtiendoAbono.cajaNombre}</strong> de <strong>{revirtiendoAsig.usuarioNombre}</strong> ({revirtiendoAsig.actividadNombre}).
                </>
              ) : (
                <>
                  Se revertirá el abono más reciente de <strong>{revirtiendoAsig.usuarioNombre}</strong> ({revirtiendoAsig.actividadNombre}).
                </>
              )} El movimiento original se conservará en Movimientos Bancarios marcado como anulado y se generará una operación REVERSA descontando el dinero de la caja.
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
                  placeholder="Ej. Abono registrado por error en usuario o caja equivocada"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setRevirtiendoAsig(null); setRevirtiendoAbono(null); }} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
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

      {/* MODAL AJUSTAR DEUDA (SIN CAJAS) */}
      {ajustandoAsig && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                  <span>Ajustar Deuda (Sin Cajas)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {ajustandoAsig.usuarioNombre} · {ajustandoAsig.actividadNombre}
                </p>
              </div>
              <button type="button" onClick={() => setAjustandoAsig(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-[11px]">
              <strong>Sin ingreso de efectivo:</strong> Este ajuste reduce el saldo pendiente de la deuda sin generar ingresos en cajas ni movimientos bancarios.
            </div>

            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Original</p>
                <p className="text-xs font-bold text-slate-800">{formatMoney(ajustandoAsig.importeOriginal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600">Abonado</p>
                <p className="text-xs font-bold text-emerald-700">{formatMoney(ajustandoAsig.totalAbonado)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-600">Ajustado</p>
                <p className="text-xs font-bold text-purple-700">{formatMoney(ajustandoAsig.totalAjustes || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-rose-600">Pendiente</p>
                <p className="text-xs font-bold text-rose-700">{formatMoney(ajustandoAsig.saldoPendiente)}</p>
              </div>
            </div>

            {ajusteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{ajusteError}</div>
            )}

            <form onSubmit={handleConfirmAjuste} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Tipo de Ajuste *</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {canAjusteSaldoPrevio && (
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      tipoAjuste === 'SALDO_PREVIO' ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}>
                      <input
                        type="radio"
                        name="tipoAjuste"
                        checked={tipoAjuste === 'SALDO_PREVIO'}
                        onChange={() => setTipoAjuste('SALDO_PREVIO')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Saldo previo</p>
                        <p className="text-[11px] text-slate-500">Abono que el usuario ya había hecho antes de usar Omega.</p>
                      </div>
                    </label>
                  )}
                  {canAjustePerdonar && (
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      tipoAjuste === 'PERDONAR_DEUDA' ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}>
                      <input
                        type="radio"
                        name="tipoAjuste"
                        checked={tipoAjuste === 'PERDONAR_DEUDA'}
                        onChange={() => setTipoAjuste('PERDONAR_DEUDA')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Perdonar deuda</p>
                        <p className="text-[11px] text-slate-500">Condonar o exentar parcial o totalmente el saldo pendiente.</p>
                      </div>
                    </label>
                  )}
                  {canAjusteCorregir && (
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      tipoAjuste === 'CORRECCION' ? 'bg-slate-100 border-slate-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}>
                      <input
                        type="radio"
                        name="tipoAjuste"
                        checked={tipoAjuste === 'CORRECCION'}
                        onChange={() => setTipoAjuste('CORRECCION')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Corrección</p>
                        <p className="text-[11px] text-slate-500">Corrección de saldos cargados erróneamente.</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">Importe *</label>
                    <button
                      type="button"
                      onClick={() => setMontoAjuste(String(ajustandoAsig.saldoPendiente))}
                      className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Todo ({formatMoney(ajustandoAsig.saldoPendiente)})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={ajustandoAsig.saldoPendiente}
                    required
                    value={montoAjuste}
                    onChange={(e) => setMontoAjuste(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Ajuste *</label>
                  <input
                    type="date"
                    required
                    value={fechaAjuste}
                    onChange={(e) => setFechaAjuste(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo o Descripción *</label>
                <textarea
                  required
                  rows={2}
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder="Ej. Abono previo entregado en efectivo antes de Omega / Condonación autorizada"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setAjustandoAsig(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={savingAjuste} className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold">
                  {savingAjuste ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REVERTIR AJUSTE */}
      {revirtiendoAjusteItem && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>Revertir Ajuste de Deuda</span>
            </h3>
            <p className="text-xs text-slate-600">
              Se revertirá el ajuste de tipo <strong>{revirtiendoAjusteItem.ajuste.tipoAjuste}</strong> por <strong>{formatMoney(revirtiendoAjusteItem.ajuste.importe)}</strong> ({revirtiendoAjusteItem.ajuste.motivo}) de <strong>{revirtiendoAjusteItem.asig.usuarioNombre}</strong>. El registro permanecerá como REVERTIDO, se recalculará el saldo pendiente y <strong>no</strong> afectará ninguna caja ni movimiento bancario.
            </p>
            {reversionAjusteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{reversionAjusteError}</div>
            )}
            <form onSubmit={handleConfirmReversionAjuste} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo de reversión *</label>
                <textarea
                  required
                  rows={3}
                  value={motivoReversionAjuste}
                  onChange={(e) => setMotivoReversionAjuste(e.target.value)}
                  placeholder="Ej. Ajuste capturado por error"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRevirtiendoAjusteItem(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={savingReversionAjuste} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold">
                  {savingReversionAjuste ? 'Revirtiendo...' : 'Confirmar Reversión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
