import React, { useState, useEffect, useMemo } from 'react';
import {
  PiggyBank,
  ArrowLeft,
  Plus,
  Pencil,
  Ban,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  Briefcase,
  Layers,
  Wallet,
  Compass,
  FolderKanban,
  Users,
  Sparkles,
  Image as ImageIcon,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  Calendar,
  Lock,
  Trash2
} from 'lucide-react';
import {
  Caja,
  PresupuestoAreaResumen,
  PresupuestoAreaDetalle,
  MovimientoPresupuesto,
  PresupuestoEvidenciaInput,
  PresupuestoEvidencia
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PresupuestosViewProps {
  cajas: Caja[];
  onBalanceChanged: () => void;
}

const CARD_THEMES = [
  { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-50 text-amber-700 border-amber-200', icon: PiggyBank },
  { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Building2 },
  { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50 text-blue-700 border-blue-200', icon: Briefcase },
  { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50 text-violet-700 border-violet-200', icon: Layers },
  { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50 text-rose-700 border-rose-200', icon: Sparkles },
  { bg: 'from-cyan-500 to-sky-600', light: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Compass },
  { bg: 'from-orange-500 to-red-600', light: 'bg-orange-50 text-orange-700 border-orange-200', icon: FolderKanban },
  { bg: 'from-teal-500 to-emerald-700', light: 'bg-teal-50 text-teal-700 border-teal-200', icon: Users },
];

export const PresupuestosView: React.FC<PresupuestosViewProps> = ({ cajas, onBalanceChanged }) => {
  const { isAdmin, canAccessModule } = useAuth();

  const canVerTodos = isAdmin || canAccessModule('presupuestos_ver_todos') || canAccessModule('presupuestos_administrar') || canAccessModule('presupuestos_consultar_todos');
  const canSoloConsulta = !isAdmin &&
    (canAccessModule('presupuestos_consultar_mi_area') || canAccessModule('presupuestos_consultar_todos')) &&
    !canAccessModule('presupuestos') &&
    !canAccessModule('presupuestos_ver_todos') &&
    !canAccessModule('presupuestos_asignar') &&
    !canAccessModule('presupuestos_egresos_registrar') &&
    !canAccessModule('presupuestos_administrar');
  const canRegistrarEgreso = isAdmin || canAccessModule('presupuestos_egresos_registrar') || canAccessModule('presupuestos_administrar');
  const canEditarEgreso = isAdmin || canAccessModule('presupuestos_egresos_editar') || canAccessModule('presupuestos_administrar');
  const canCancelarEgreso = isAdmin || canAccessModule('presupuestos_egresos_cancelar') || canAccessModule('presupuestos_administrar');
  const canHistorial = isAdmin || canAccessModule('presupuestos_historial') || canAccessModule('presupuestos_administrar');
  const canDevolver = isAdmin || canAccessModule('presupuestos_devolver') || canAccessModule('presupuestos_administrar');
  const canAjustes = isAdmin || canAccessModule('presupuestos_ajustes') || canAccessModule('presupuestos_administrar');

  const [resumenes, setResumenes] = useState<PresupuestoAreaResumen[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<PresupuestoAreaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros historial
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Modal Egreso (Crear / Editar)
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [editingEgreso, setEditingEgreso] = useState<MovimientoPresupuesto | null>(null);
  const [egresoConcepto, setEgresoConcepto] = useState('');
  const [egresoImporte, setEgresoImporte] = useState('');
  const [egresoFecha, setEgresoFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [egresoDescripcion, setEgresoDescripcion] = useState('');
  const [existingEvidencias, setExistingEvidencias] = useState<PresupuestoEvidencia[]>([]);
  const [newEvidencias, setNewEvidencias] = useState<PresupuestoEvidenciaInput[]>([]);
  const [egresoError, setEgresoError] = useState<string | null>(null);
  const [savingEgreso, setSavingEgreso] = useState(false);

  // Modal Cancelar Egreso
  const [egresoForCancel, setEgresoForCancel] = useState<MovimientoPresupuesto | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Modal Devolver a Caja
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [devolverAreaId, setDevolverAreaId] = useState<number>(0);
  const [devolverCajaId, setDevolverCajaId] = useState<number>(0);
  const [devolverImporte, setDevolverImporte] = useState('');
  const [devolverFecha, setDevolverFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [devolverDesc, setDevolverDesc] = useState('');
  const [devolverError, setDevolverError] = useState<string | null>(null);
  const [savingDevolver, setSavingDevolver] = useState(false);

  // Modal Ajuste de Saldo
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajusteAreaId, setAjusteAreaId] = useState<number>(0);
  const [ajusteTipo, setAjusteTipo] = useState<'SUMA' | 'RESTA'>('SUMA');
  const [ajusteImporte, setAjusteImporte] = useState('');
  const [ajusteFecha, setAjusteFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [ajusteError, setAjusteError] = useState<string | null>(null);
  const [savingAjuste, setSavingAjuste] = useState(false);

  // Modales de inspección (Evidencias e Historial de ediciones)
  const [evidenciasModalMov, setEvidenciasModalMov] = useState<MovimientoPresupuesto | null>(null);
  const [historialModalMov, setHistorialModalMov] = useState<MovimientoPresupuesto | null>(null);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const loadResumenes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPresupuestosResumen();
      setResumenes(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los presupuestos.');
    } finally {
      setLoading(false);
    }
  };

  const loadDetalle = async (areaId: number) => {
    try {
      setLoadingDetalle(true);
      setError(null);
      const data = await api.getPresupuestoDetalle(areaId);
      setDetalle(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el detalle del presupuesto.');
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => {
    loadResumenes();
  }, []);

  useEffect(() => {
    if (selectedAreaId !== null) {
      loadDetalle(selectedAreaId);
    } else {
      setDetalle(null);
    }
  }, [selectedAreaId]);

  const refreshAll = async () => {
    await loadResumenes();
    if (selectedAreaId !== null) {
      await loadDetalle(selectedAreaId);
    }
    onBalanceChanged();
  };

  // --- Handlers de Egreso ---
  const handleOpenRegistrarEgreso = () => {
    setEditingEgreso(null);
    setEgresoConcepto('');
    setEgresoImporte('');
    setEgresoFecha(new Date().toISOString().slice(0, 10));
    setEgresoDescripcion('');
    setExistingEvidencias([]);
    setNewEvidencias([]);
    setEgresoError(null);
    setShowEgresoModal(true);
  };

  const handleOpenEditarEgreso = (mov: MovimientoPresupuesto) => {
    setEditingEgreso(mov);
    setEgresoConcepto(mov.concepto);
    setEgresoImporte(String(mov.importe));
    setEgresoFecha(new Date(mov.fechaMovimiento).toISOString().slice(0, 10));
    setEgresoDescripcion(mov.descripcion || '');
    setExistingEvidencias(mov.evidencias || []);
    setNewEvidencias([]);
    setEgresoError(null);
    setShowEgresoModal(true);
  };

  const handleFileEvidenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loaded: PresupuestoEvidenciaInput[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setEgresoError(`El archivo "${file.name}" no es una imagen válida.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setEgresoError(`La imagen "${file.name}" supera el límite de 5 MB.`);
        continue;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });

      loaded.push({
        nombreArchivo: file.name,
        contentType: file.type,
        datosBase64: base64,
      });
    }

    if (loaded.length > 0) {
      setNewEvidencias((prev) => [...prev, ...loaded]);
    }
    e.target.value = '';
  };

  const handleSaveEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId) return;
    if (!egresoConcepto.trim()) {
      setEgresoError('El concepto es obligatorio.');
      return;
    }
    const imp = parseFloat(egresoImporte);
    if (isNaN(imp) || imp <= 0) {
      setEgresoError('El importe debe ser mayor a cero.');
      return;
    }
    if (!egresoFecha) {
      setEgresoError('La fecha es obligatoria.');
      return;
    }

    setSavingEgreso(true);
    setEgresoError(null);
    try {
      const fechaIso = new Date(`${egresoFecha}T12:00:00Z`).toISOString();
      if (editingEgreso) {
        await api.editarEgresoPresupuesto(editingEgreso.id, {
          concepto: egresoConcepto.trim(),
          importe: imp,
          fecha: fechaIso,
          descripcion: egresoDescripcion.trim() || undefined,
          conservarEvidenciaIds: existingEvidencias.map((ev) => ev.id),
          nuevasEvidencias: newEvidencias,
        });
        showToast('Egreso actualizado y saldo recalculado correctamente.');
      } else {
        await api.registrarEgresoPresupuesto({
          areaId: selectedAreaId,
          concepto: egresoConcepto.trim(),
          importe: imp,
          fecha: fechaIso,
          descripcion: egresoDescripcion.trim() || undefined,
          evidencias: newEvidencias,
        });
        showToast('Egreso registrado correctamente.');
      }
      setShowEgresoModal(false);
      await refreshAll();
    } catch (err: any) {
      setEgresoError(err.message || 'Error al guardar el egreso.');
    } finally {
      setSavingEgreso(false);
    }
  };

  // --- Cancelar Egreso ---
  const handleConfirmCancelarEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!egresoForCancel) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelarEgresoPresupuesto(egresoForCancel.id, cancelMotivo.trim() || undefined);
      showToast(`Egreso "${egresoForCancel.concepto}" cancelado. El importe regresó al saldo disponible.`);
      setEgresoForCancel(null);
      setCancelMotivo('');
      await refreshAll();
    } catch (err: any) {
      setCancelError(err.message || 'No se pudo cancelar el egreso.');
    } finally {
      setCancelling(false);
    }
  };

  // --- Devolver a Caja ---
  const openDevolverModal = (areaIdDefault?: number) => {
    const areaId = areaIdDefault || selectedAreaId || resumenes[0]?.areaId || 0;
    const activeCaja = cajas.find((c) => c.activa)?.id || 0;
    setDevolverAreaId(areaId);
    setDevolverCajaId(activeCaja);
    setDevolverImporte('');
    setDevolverFecha(new Date().toISOString().slice(0, 10));
    setDevolverDesc('');
    setDevolverError(null);
    setShowDevolverModal(true);
  };

  const handleConfirmDevolver = async (e: React.FormEvent) => {
    e.preventDefault();
    const imp = parseFloat(devolverImporte);
    if (!devolverAreaId || !devolverCajaId) {
      setDevolverError('Selecciona el área de origen y la caja de destino.');
      return;
    }
    if (isNaN(imp) || imp <= 0) {
      setDevolverError('El importe a devolver debe ser mayor a cero.');
      return;
    }
    setSavingDevolver(true);
    setDevolverError(null);
    try {
      await api.devolverPresupuesto({
        areaOrigenId: devolverAreaId,
        cajaDestinoId: devolverCajaId,
        importe: imp,
        fecha: new Date(`${devolverFecha}T12:00:00Z`).toISOString(),
        descripcion: devolverDesc.trim() || undefined,
      });
      showToast(`Devolución de ${formatMoney(imp)} registrada correctamente.`);
      setShowDevolverModal(false);
      await refreshAll();
    } catch (err: any) {
      setDevolverError(err.message || 'Error al registrar la devolución.');
    } finally {
      setSavingDevolver(false);
    }
  };

  // --- Ajustes de Saldo ---
  const openAjusteModal = (areaIdDefault?: number) => {
    const areaId = areaIdDefault || selectedAreaId || resumenes[0]?.areaId || 0;
    setAjusteAreaId(areaId);
    setAjusteTipo('SUMA');
    setAjusteImporte('');
    setAjusteFecha(new Date().toISOString().slice(0, 10));
    setAjusteMotivo('');
    setAjusteError(null);
    setShowAjusteModal(true);
  };

  const handleConfirmAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    const imp = parseFloat(ajusteImporte);
    if (!ajusteAreaId) {
      setAjusteError('Selecciona un área.');
      return;
    }
    if (isNaN(imp) || imp <= 0) {
      setAjusteError('Ingresa un importe numérico positivo.');
      return;
    }
    if (!ajusteMotivo.trim()) {
      setAjusteError('El motivo del ajuste es obligatorio.');
      return;
    }
    const signedImporte = ajusteTipo === 'SUMA' ? imp : -imp;

    setSavingAjuste(true);
    setAjusteError(null);
    try {
      await api.registrarAjustePresupuesto({
        areaId: ajusteAreaId,
        importe: signedImporte,
        fecha: new Date(`${ajusteFecha}T12:00:00Z`).toISOString(),
        motivo: ajusteMotivo.trim(),
      });
      showToast('Ajuste de saldo registrado correctamente.');
      setShowAjusteModal(false);
      await refreshAll();
    } catch (err: any) {
      setAjusteError(err.message || 'No se pudo registrar el ajuste.');
    } finally {
      setSavingAjuste(false);
    }
  };

  const filteredMovimientos = useMemo(() => {
    if (!detalle) return [];
    const term = filterSearch.trim().toLowerCase();
    return detalle.movimientos.filter((m) => {
      if (filterTipo && m.tipoMovimiento !== filterTipo) return false;
      if (filterEstado && m.estado !== filterEstado) return false;
      if (!term) return true;
      return (
        m.concepto.toLowerCase().includes(term) ||
        (m.descripcion && m.descripcion.toLowerCase().includes(term)) ||
        (m.usuarioNombre && m.usuarioNombre.toLowerCase().includes(term))
      );
    });
  }, [detalle, filterTipo, filterEstado, filterSearch]);

  const totalGeneralDisponible = useMemo(
    () => resumenes.reduce((acc, r) => acc + r.saldoDisponible, 0),
    [resumenes]
  );

  // ==================== VISTA PRINCIPAL (TARJETAS POR ÁREA) ====================
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold px-2">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {selectedAreaId === null ? (
        <>
          {/* Banner solo lectura */}
          {canSoloConsulta && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium">
              <span>👁️</span>
              <span>Tienes acceso de <strong>solo consulta</strong> a los presupuestos. No puedes registrar egresos, asignar dinero ni realizar ajustes.</span>
            </div>
          )}
          {/* Header Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                <PiggyBank className="w-5 h-5 text-amber-600" />
                <span>Presupuestos por Área</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saldos acumulados e históricos asignados a cada área. Saldo total en presupuestos:{' '}
                <strong className={totalGeneralDisponible < 0 ? 'text-rose-700' : 'text-slate-800'}>
                  {formatMoney(totalGeneralDisponible)}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canDevolver && resumenes.length > 0 && (
                <button
                  type="button"
                  onClick={() => openDevolverModal()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Devolver dinero a caja</span>
                </button>
              )}
              {canAjustes && resumenes.length > 0 && (
                <button
                  type="button"
                  onClick={() => openAjusteModal()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Ajuste de saldo</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Cargando presupuestos de áreas...
            </div>
          ) : resumenes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 max-w-lg mx-auto text-center border border-slate-200 shadow-xs">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Sin áreas disponibles</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {canVerTodos
                  ? 'No hay áreas activas registradas en el sistema.'
                  : 'Actualmente no estás asignado como coordinador o integrante de ningún área activa.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resumenes.map((r, idx) => {
                const theme = CARD_THEMES[(r.areaId + idx) % CARD_THEMES.length];
                const Icon = theme.icon;
                return (
                  <button
                    key={r.areaId}
                    type="button"
                    onClick={() => {
                      setSelectedAreaId(r.areaId);
                      setFilterTipo('');
                      setFilterEstado('');
                      setFilterSearch('');
                    }}
                    className="text-left bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-300 transition-all overflow-hidden group cursor-pointer flex flex-col"
                  >
                    {/* Top gradient header */}
                    <div className={`bg-gradient-to-r ${theme.bg} p-4 text-white flex items-center justify-between`}>
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-xl shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base truncate">{r.areaNombre}</h3>
                          <p className="text-[11px] text-white/85 truncate">
                            {r.coordinadorNombre ? `Coord: ${r.coordinadorNombre}` : 'Sin coordinador asignado'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full shrink-0 group-hover:bg-white/30 transition">
                        Ver detalle →
                      </span>
                    </div>

                    {/* Body metrics */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className={`p-3.5 rounded-xl border ${
                        r.saldoDisponible < 0
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-slate-50 border-slate-100'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          r.saldoDisponible < 0 ? 'text-rose-700' : 'text-slate-500'
                        }`}>
                          {r.saldoDisponible < 0 ? 'Saldo Negativo (Sobregirado)' : 'Saldo Disponible'}
                        </span>
                        <p className={`text-2xl font-black mt-0.5 ${
                          r.saldoDisponible < 0 ? 'text-rose-700' : 'text-slate-900'
                        }`}>
                          {formatMoney(r.saldoDisponible)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Recibido</span>
                          <span className="font-extrabold text-emerald-900 text-sm">
                            {formatMoney(r.totalRecibido)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                          <span className="text-[10px] font-bold uppercase text-rose-700 block">Total Egresos</span>
                          <span className="font-extrabold text-rose-900 text-sm">
                            {formatMoney(r.totalGastado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ==================== VISTA DETALLE DE ÁREA ==================== */
        <div className="space-y-5">
          {/* Header Detalle */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSelectedAreaId(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="Volver a Presupuestos"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <PiggyBank className="w-5 h-5 text-amber-600" />
                  <span>Presupuesto: {detalle?.resumen.areaNombre || 'Cargando...'}</span>
                </h2>
                {detalle?.resumen.coordinadorNombre && (
                  <p className="text-xs text-slate-500">
                    Coordinador: <strong className="text-slate-700">{detalle.resumen.coordinadorNombre}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canRegistrarEgreso && (
                <button
                  type="button"
                  onClick={handleOpenRegistrarEgreso}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar egreso</span>
                </button>
              )}
              {canDevolver && (
                <button
                  type="button"
                  onClick={() => openDevolverModal(selectedAreaId)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Devolver dinero a caja</span>
                </button>
              )}
              {canAjustes && (
                <button
                  type="button"
                  onClick={() => openAjusteModal(selectedAreaId)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Ajuste de saldo</span>
                </button>
              )}
            </div>
          </div>

          {loadingDetalle && !detalle ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Cargando detalle del presupuesto...
            </div>
          ) : detalle && (
            <>
              {/* Tarjetas de Totales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Recibido</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">
                    {formatMoney(detalle.resumen.totalRecibido)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total Gastado (Egresos)</span>
                  <p className="text-2xl font-black text-rose-900 mt-1">
                    {formatMoney(detalle.resumen.totalGastado)}
                  </p>
                </div>
                <div className={`p-5 rounded-xl border shadow-xs ${
                  detalle.resumen.saldoDisponible < 0
                    ? 'border-rose-300 bg-rose-50/60'
                    : 'border-amber-300 bg-amber-50/30'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    detalle.resumen.saldoDisponible < 0 ? 'text-rose-700' : 'text-amber-800'
                  }`}>
                    {detalle.resumen.saldoDisponible < 0 ? 'Saldo Negativo' : 'Saldo Disponible'}
                  </span>
                  <p className={`text-2xl font-black mt-1 ${
                    detalle.resumen.saldoDisponible < 0 ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    {formatMoney(detalle.resumen.saldoDisponible)}
                  </p>
                  {(detalle.resumen.totalDevuelto > 0 || detalle.resumen.totalAjustes !== 0) && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Devuelto: {formatMoney(detalle.resumen.totalDevuelto)} • Ajustes: {formatMoney(detalle.resumen.totalAjustes)}
                    </p>
                  )}
                </div>
              </div>

              {/* Historial de Movimientos */}
              {!canHistorial ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No cuentas con permiso para consultar el historial presupuestal detallado.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <History className="w-4 h-4 text-slate-500" />
                      <span>Historial de Movimientos ({filteredMovimientos.length})</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Todos los tipos</option>
                        <option value="ENTREGA">Entregas</option>
                        <option value="EGRESO">Egresos</option>
                        <option value="DEVOLUCION">Devoluciones</option>
                        <option value="AJUSTE">Ajustes</option>
                      </select>

                      <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Todos los estados</option>
                        <option value="VIGENTE">Vigentes</option>
                        <option value="CANCELADO">Cancelados</option>
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="Buscar concepto..."
                          className="w-44 pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredMovimientos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No hay movimientos registrados con los filtros actuales.
                    </div>
                  ) : (
                    <>
                      {/* Móvil */}
                      <div className="md:hidden p-3 space-y-3 bg-slate-50/50">
                        {filteredMovimientos.map((m) => (
                          <div
                            key={m.id}
                            className={`bg-white rounded-xl border p-4 space-y-2.5 ${
                              m.estado === 'CANCELADO' ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <TipoBadge tipo={m.tipoMovimiento} />
                                <EstadoBadge estado={m.estado} />
                              </div>
                              <span
                                className={`text-sm font-extrabold ${
                                  m.estado === 'CANCELADO'
                                    ? 'line-through text-slate-400'
                                    : m.tipoMovimiento === 'ENTREGA' || (m.tipoMovimiento === 'AJUSTE' && m.importe > 0)
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {formatSignedImporte(m, formatMoney)}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-900">{m.concepto}</p>
                              {m.descripcion && <p className="text-[11px] text-slate-600 mt-0.5">{m.descripcion}</p>}
                            </div>

                            <div className="text-[11px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-100">
                              <p className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(m.fechaMovimiento).toLocaleDateString('es-MX')}</span>
                              </p>
                              {m.usuarioNombre && <p>Registrado por: {m.usuarioNombre}</p>}
                              {m.editadoPor && <p className="text-amber-700">Editado por: {m.editadoPor}</p>}
                              {m.estado === 'CANCELADO' && (
                                <p className="text-red-700 font-medium">
                                  Cancelado por {m.canceladoPor} ({m.motivoCancelacion})
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                              {m.evidencias.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setEvidenciasModalMov(m)}
                                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>Fotos ({m.evidencias.length})</span>
                                </button>
                              )}
                              {m.historialModificaciones.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setHistorialModalMov(m)}
                                  className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>Cambios ({m.historialModificaciones.length})</span>
                                </button>
                              )}
                              {m.tipoMovimiento === 'EGRESO' && m.estado === 'VIGENTE' && (
                                <>
                                  {canEditarEgreso && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditarEgreso(m)}
                                      className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Editar</span>
                                    </button>
                                  )}
                                  {canCancelarEgreso && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEgresoForCancel(m);
                                        setCancelMotivo('');
                                        setCancelError(null);
                                      }}
                                      className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                                    >
                                      <Ban className="w-3 h-3" />
                                      <span>Cancelar</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Tipo</th>
                              <th className="py-3 px-4">Concepto y Descripción</th>
                              <th className="py-3 px-4 text-right">Importe</th>
                              <th className="py-3 px-4 text-center">Estado</th>
                              <th className="py-3 px-4">Evidencia / Registro</th>
                              <th className="py-3 px-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredMovimientos.map((m) => (
                              <tr
                                key={m.id}
                                className={`hover:bg-slate-50/80 transition ${
                                  m.estado === 'CANCELADO' ? 'bg-red-50/20' : ''
                                }`}
                              >
                                <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                                  {new Date(m.fechaMovimiento).toLocaleDateString('es-MX')}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <TipoBadge tipo={m.tipoMovimiento} />
                                </td>
                                <td className="py-3 px-4 max-w-xs">
                                  <p className={`font-bold ${m.estado === 'CANCELADO' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {m.concepto}
                                  </p>
                                  {m.descripcion && (
                                    <p className="text-[11px] text-slate-500 mt-0.5">{m.descripcion}</p>
                                  )}
                                  {m.estado === 'CANCELADO' && (
                                    <p className="text-[11px] text-red-600 font-medium mt-0.5">
                                      Cancelado por {m.canceladoPor}
                                      {m.motivoCancelacion ? ` • ${m.motivoCancelacion}` : ''}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-extrabold whitespace-nowrap">
                                  <span
                                    className={
                                      m.estado === 'CANCELADO'
                                        ? 'line-through text-slate-400'
                                        : m.tipoMovimiento === 'ENTREGA' || (m.tipoMovimiento === 'AJUSTE' && m.importe > 0)
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }
                                  >
                                    {formatSignedImporte(m, formatMoney)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <EstadoBadge estado={m.estado} />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    {m.usuarioNombre && (
                                      <p className="text-[11px] text-slate-600">Por: {m.usuarioNombre}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {m.evidencias.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setEvidenciasModalMov(m)}
                                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                                        >
                                          <ImageIcon className="w-3 h-3" />
                                          <span>{m.evidencias.length} foto{m.evidencias.length === 1 ? '' : 's'}</span>
                                        </button>
                                      )}
                                      {m.historialModificaciones.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setHistorialModalMov(m)}
                                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-semibold cursor-pointer"
                                        >
                                          <History className="w-3 h-3" />
                                          <span>Historial ({m.historialModificaciones.length})</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  {m.tipoMovimiento === 'EGRESO' && m.estado === 'VIGENTE' ? (
                                    <div className="inline-flex items-center space-x-1">
                                      {canEditarEgreso && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditarEgreso(m)}
                                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                          <span>Editar</span>
                                        </button>
                                      )}
                                      {canCancelarEgreso && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEgresoForCancel(m);
                                            setCancelMotivo('');
                                            setCancelError(null);
                                          }}
                                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                          <span>Cancelar</span>
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== MODAL: REGISTRAR / EDITAR EGRESO ==================== */}
      {showEgresoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] overflow-y-auto">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingEgreso ? 'Editar Egreso' : 'Registrar Egreso'}
                </h3>
                <p className="text-xs text-rose-100">
                  {detalle ? `Área: ${detalle.resumen.areaNombre} • Saldo disponible: ${formatMoney(detalle.resumen.saldoDisponible)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEgresoModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEgreso} className="p-5 space-y-4">
              {detalle && !editingEgreso && (parseFloat(egresoImporte) || 0) > detalle.resumen.saldoDisponible && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  El egreso supera el saldo actual ({formatMoney(detalle.resumen.saldoDisponible)}). El área quedará con saldo negativo de{' '}
                  <strong>{formatMoney(detalle.resumen.saldoDisponible - (parseFloat(egresoImporte) || 0))}</strong>.
                </div>
              )}
              {egresoError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{egresoError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Concepto *</label>
                <input
                  type="text"
                  required
                  value={egresoConcepto}
                  onChange={(e) => setEgresoConcepto(e.target.value)}
                  placeholder="Ej. Compra de material o pago de servicio"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Importe (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={egresoImporte}
                    onChange={(e) => setEgresoImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={egresoFecha}
                    onChange={(e) => setEgresoFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  value={egresoDescripcion}
                  onChange={(e) => setEgresoDescripcion(e.target.value)}
                  placeholder="Detalles adicionales del gasto"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fotografías de evidencia (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileEvidenceChange}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />

                {(existingEvidencias.length > 0 || newEvidencias.length > 0) && (
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {existingEvidencias.map((ev) => (
                      <div key={ev.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={ev.datosBase64} alt={ev.nombreArchivo} className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => setExistingEvidencias((prev) => prev.filter((x) => x.id !== ev.id))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100"
                          title="Quitar imagen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {newEvidencias.map((ev, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50">
                        <img src={ev.datosBase64} alt={ev.nombreArchivo} className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewEvidencias((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100"
                          title="Quitar imagen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEgresoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEgreso}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingEgreso ? 'Guardando...' : editingEgreso ? 'Guardar Cambios' : 'Registrar Egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CANCELAR EGRESO ==================== */}
      {egresoForCancel && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancelar Egreso</h3>
                <p className="text-xs text-slate-500">El registro permanecerá en el historial como Cancelado.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 mb-4">
              <p>
                Egreso: <strong className="text-slate-900">{egresoForCancel.concepto}</strong>
              </p>
              <p>
                Importe a devolver al saldo disponible: <strong className="text-emerald-700">{formatMoney(egresoForCancel.importe)}</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmCancelarEgreso} className="space-y-4">
              {cancelError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{cancelError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo de cancelación (opcional)</label>
                <input
                  type="text"
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Ej. Error de captura o gasto no realizado"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEgresoForCancel(null)}
                  disabled={cancelling}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DEVOLVER DINERO A CAJA ==================== */}
      {showDevolverModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] overflow-y-auto">
            <div className="px-5 py-4 bg-blue-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Devolver Dinero a Caja</h3>
                <p className="text-xs text-blue-100">Transferencia interna del presupuesto del área hacia una caja.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDevolverModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDevolver} className="p-5 space-y-4">
              {devolverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{devolverError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Área de Origen *</label>
                <select
                  value={devolverAreaId}
                  onChange={(e) => setDevolverAreaId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {resumenes.map((r) => (
                    <option key={r.areaId} value={r.areaId}>
                      {r.areaNombre} (Disp: {formatMoney(r.saldoDisponible)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Caja de Destino *</label>
                <select
                  value={devolverCajaId}
                  onChange={(e) => setDevolverCajaId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {cajas.filter((c) => c.activa).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({formatMoney(c.saldoActual)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Importe (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={devolverImporte}
                    onChange={(e) => setDevolverImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={devolverFecha}
                    onChange={(e) => setDevolverFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción u observaciones (opcional)</label>
                <textarea
                  rows={2}
                  value={devolverDesc}
                  onChange={(e) => setDevolverDesc(e.target.value)}
                  placeholder="Ej. Sobrante de evento"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDevolverModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDevolver}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingDevolver ? 'Procesando...' : 'Confirmar Devolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: AJUSTE DE SALDO ==================== */}
      {showAjusteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] overflow-y-auto">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-amber-400">Ajuste de Saldo</h3>
                <p className="text-xs text-slate-300">Corrige diferencias dejando evidencia obligatoria en el historial.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAjusteModal(false)}
                className="p-1 text-white/70 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAjuste} className="p-5 space-y-4">
              {ajusteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{ajusteError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Área *</label>
                <select
                  value={ajusteAreaId}
                  onChange={(e) => setAjusteAreaId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {resumenes.map((r) => (
                    <option key={r.areaId} value={r.areaId}>
                      {r.areaNombre} (Disp: {formatMoney(r.saldoDisponible)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de ajuste *</label>
                  <select
                    value={ajusteTipo}
                    onChange={(e) => setAjusteTipo(e.target.value as 'SUMA' | 'RESTA')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="SUMA">Positivo (+ Aumentar saldo)</option>
                    <option value="RESTA">Negativo (- Disminuir saldo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Importe (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={ajusteImporte}
                    onChange={(e) => setAjusteImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={ajusteFecha}
                  onChange={(e) => setAjusteFecha(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo obligatorio *</label>
                <textarea
                  rows={2}
                  required
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  placeholder="Explica el motivo de este ajuste de saldo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAjusteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAjuste}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingAjuste ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: VER EVIDENCIAS FOTOGRÁFICAS ==================== */}
      {evidenciasModalMov && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Evidencias Fotográficas</h3>
                <p className="text-xs text-slate-500">{evidenciasModalMov.concepto}</p>
              </div>
              <button
                type="button"
                onClick={() => setEvidenciasModalMov(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {evidenciasModalMov.evidencias.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={ev.datosBase64} alt={ev.nombreArchivo} className="w-full max-h-72 object-contain bg-white" />
                  <div className="p-2 text-[11px] text-slate-600 truncate border-t border-slate-200">
                    {ev.nombreArchivo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: HISTORIAL DE MODIFICACIONES ==================== */}
      {historialModalMov && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Historial de Modificaciones</h3>
                <p className="text-xs text-slate-500">{historialModalMov.concepto}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistorialModalMov(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {historialModalMov.historialModificaciones.map((h) => (
                <div key={h.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{h.accion}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(h.fechaCambio).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <p className="text-slate-700">Usuario: <strong>{h.usuarioNombre}</strong></p>
                  {h.detalle && <p className="text-slate-600">{h.detalle}</p>}
                  {h.valoresAnterioresJson && (
                    <p className="text-[11px] text-slate-500 break-all">
                      <strong>Antes:</strong> {h.valoresAnterioresJson}
                    </p>
                  )}
                  {h.valoresNuevosJson && (
                    <p className="text-[11px] text-slate-700 break-all">
                      <strong>Después:</strong> {h.valoresNuevosJson}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TipoBadge: React.FC<{ tipo: MovimientoPresupuesto['tipoMovimiento'] }> = ({ tipo }) => {
  const styles: Record<MovimientoPresupuesto['tipoMovimiento'], string> = {
    ENTREGA: 'bg-emerald-100 text-emerald-800',
    EGRESO: 'bg-rose-100 text-rose-800',
    DEVOLUCION: 'bg-blue-100 text-blue-800',
    AJUSTE: 'bg-purple-100 text-purple-800',
  };
  const labels: Record<MovimientoPresupuesto['tipoMovimiento'], string> = {
    ENTREGA: 'Entrega',
    EGRESO: 'Egreso',
    DEVOLUCION: 'Devolución',
    AJUSTE: 'Ajuste',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[tipo]}`}>
      {labels[tipo]}
    </span>
  );
};

const EstadoBadge: React.FC<{ estado: MovimientoPresupuesto['estado'] }> = ({ estado }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
      estado === 'VIGENTE'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}
  >
    {estado === 'VIGENTE' ? 'Vigente' : 'Cancelado'}
  </span>
);

function formatSignedImporte(m: MovimientoPresupuesto, formatMoney: (v: number) => string) {
  if (m.tipoMovimiento === 'ENTREGA') return `+${formatMoney(m.importe)}`;
  if (m.tipoMovimiento === 'EGRESO' || m.tipoMovimiento === 'DEVOLUCION') return `-${formatMoney(m.importe)}`;
  // AJUSTE
  return m.importe >= 0 ? `+${formatMoney(m.importe)}` : formatMoney(m.importe);
}
