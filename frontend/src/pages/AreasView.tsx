import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Power,
  UserPlus,
  UserMinus,
  Users,
  Crown,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRightLeft
} from 'lucide-react';
import { Area, UsuarioDisponible } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AreasView: React.FC = () => {
  const { user, isAdmin, canAccessModule } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Usuarios disponibles para coordinador / integrantes
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioDisponible[]>([]);

  // Modal Crear / Editar Área
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaNombre, setAreaNombre] = useState('');
  const [areaDescripcion, setAreaDescripcion] = useState('');
  const [areaCoordinadorId, setAreaCoordinadorId] = useState<string>('');
  const [areaActiva, setAreaActiva] = useState(true);
  const [savingArea, setSavingArea] = useState(false);
  const [areaModalError, setAreaModalError] = useState<string | null>(null);

  // Modal Agregar Integrante
  const [showIntegranteModal, setShowIntegranteModal] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string>('');
  const [addingIntegrante, setAddingIntegrante] = useState(false);
  const [integranteError, setIntegranteError] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<{ usuarioId: number; message: string; areaActual: string } | null>(null);

  const canCreateArea = isAdmin || canAccessModule('areas_crear');
  const canEditArea = isAdmin || canAccessModule('areas_editar');
  const canToggleArea = isAdmin || canAccessModule('areas_desactivar');
  const canAssignCoord = isAdmin || canAccessModule('areas_coordinador');

  const loadAreas = async (preserveSelected = true) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAreas();
      setAreas(data);
      if (data.length > 0) {
        if (!preserveSelected || !selectedAreaId || !data.some((a) => a.id === selectedAreaId)) {
          setSelectedAreaId(data[0].id);
        }
      } else {
        setSelectedAreaId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar las áreas.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsuariosDisponibles = async () => {
    try {
      const data = await api.getUsuariosDisponiblesArea();
      setUsuariosDisponibles(data);
    } catch {
      // Usuario sin permisos para listar usuarios disponibles
      setUsuariosDisponibles([]);
    }
  };

  useEffect(() => {
    loadAreas(false);
  }, []);

  const selectedArea = areas.find((a) => a.id === selectedAreaId) || null;

  const canManageIntegrantesOfSelected =
    !!selectedArea &&
    selectedArea.activa &&
    (isAdmin || (selectedArea.coordinadorId !== null && selectedArea.coordinadorId === user?.id && canAccessModule('areas_integrantes')));

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleOpenCreateArea = async () => {
    setEditingArea(null);
    setAreaNombre('');
    setAreaDescripcion('');
    setAreaCoordinadorId('');
    setAreaActiva(true);
    setAreaModalError(null);
    if (canAssignCoord) {
      await loadUsuariosDisponibles();
    }
    setShowAreaModal(true);
  };

  const handleOpenEditArea = async (area: Area) => {
    setEditingArea(area);
    setAreaNombre(area.nombre);
    setAreaDescripcion(area.descripcion || '');
    setAreaCoordinadorId(area.coordinadorId ? String(area.coordinadorId) : '');
    setAreaActiva(area.activa);
    setAreaModalError(null);
    if (canAssignCoord) {
      await loadUsuariosDisponibles();
    }
    setShowAreaModal(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaNombre.trim()) {
      setAreaModalError('El nombre del área es obligatorio.');
      return;
    }

    setSavingArea(true);
    setAreaModalError(null);
    try {
      const coordId = areaCoordinadorId ? Number(areaCoordinadorId) : null;
      if (editingArea) {
        await api.updateArea(editingArea.id, {
          nombre: areaNombre.trim(),
          descripcion: areaDescripcion.trim() || undefined,
          activa: areaActiva,
          coordinadorId: canAssignCoord ? coordId : editingArea.coordinadorId,
        });
        showToast('Área actualizada correctamente.');
        setShowAreaModal(false);
        await loadAreas(true);
      } else {
        const res = await api.createArea({
          nombre: areaNombre.trim(),
          descripcion: areaDescripcion.trim() || undefined,
          coordinadorId: canAssignCoord ? coordId : null,
        });
        showToast('Área creada correctamente.');
        setShowAreaModal(false);
        await loadAreas(false);
        if (res.id) setSelectedAreaId(res.id);
      }
    } catch (err: any) {
      setAreaModalError(err.message || 'Error al guardar el área.');
    } finally {
      setSavingArea(false);
    }
  };

  const handleToggleAreaStatus = async (area: Area) => {
    const actionLabel = area.activa ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que deseas ${actionLabel} el área "${area.nombre}"? Sus registros históricos se conservarán intactos.`)) {
      return;
    }
    try {
      await api.toggleAreaStatus(area.id);
      showToast(`Área "${area.nombre}" ${area.activa ? 'desactivada' : 'activada'} correctamente.`);
      await loadAreas(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado del área.');
    }
  };

  const handleOpenAddIntegrante = async () => {
    setSelectedUsuarioId('');
    setIntegranteError(null);
    setConfirmTransfer(null);
    await loadUsuariosDisponibles();
    setShowIntegranteModal(true);
  };

  const handleAddIntegrante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea || !selectedUsuarioId) {
      setIntegranteError('Selecciona un usuario.');
      return;
    }

    const usuarioId = Number(selectedUsuarioId);
    setAddingIntegrante(true);
    setIntegranteError(null);
    try {
      const res = await api.addIntegranteArea(selectedArea.id, usuarioId, false);
      showToast(res.message || 'Integrante agregado.');
      setShowIntegranteModal(false);
      await loadAreas(true);
    } catch (err: any) {
      if (err.status === 409 && err.requiereForzar) {
        setConfirmTransfer({
          usuarioId,
          message: err.message,
          areaActual: err.areaActual || 'otra área',
        });
      } else {
        setIntegranteError(err.message || 'No se pudo agregar al integrante.');
      }
    } finally {
      setAddingIntegrante(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedArea || !confirmTransfer) return;
    setAddingIntegrante(true);
    setIntegranteError(null);
    try {
      const res = await api.addIntegranteArea(selectedArea.id, confirmTransfer.usuarioId, true);
      showToast(res.message || 'Integrante reasignado.');
      setConfirmTransfer(null);
      setShowIntegranteModal(false);
      await loadAreas(true);
    } catch (err: any) {
      setIntegranteError(err.message || 'No se pudo mover al integrante.');
      setConfirmTransfer(null);
    } finally {
      setAddingIntegrante(false);
    }
  };

  const handleRemoveIntegrante = async (userId: number, nombre: string) => {
    if (!selectedArea) return;
    if (!confirm(`¿Retirar a "${nombre}" del área "${selectedArea.nombre}"? Sus registros históricos se conservarán.`)) {
      return;
    }
    try {
      await api.removeIntegranteArea(selectedArea.id, userId);
      showToast(`"${nombre}" fue retirado del área.`);
      await loadAreas(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo retirar al integrante.');
    }
  };

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="truncate">Administración de Áreas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organiza las áreas de la iglesia, sus coordinadores e integrantes.
          </p>
        </div>

        {canCreateArea && (
          <button
            type="button"
            onClick={handleOpenCreateArea}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Área</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold px-2">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pestañas de Áreas */}
      {loading ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          Cargando áreas...
        </div>
      ) : areas.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No hay áreas registradas aún</p>
          <p className="text-xs text-slate-500">
            {canCreateArea
              ? 'Crea la primera área con el botón "Nueva Área".'
              : 'Solicita a un administrador que configure las áreas.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap gap-1.5">
              {areas.map((area) => {
                const isSelected = area.id === selectedAreaId;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 max-w-full cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-amber-400 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    } ${!area.activa ? 'opacity-65' : ''}`}
                  >
                    <span className="truncate">{area.nombre}</span>
                    {!area.activa && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 text-red-700 font-bold shrink-0">
                        Inactiva
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold shrink-0 ${
                        isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-white text-slate-600'
                      }`}
                    >
                      {area.integrantes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle del Área Seleccionada */}
          {selectedArea && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Info Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 break-words">{selectedArea.nombre}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        selectedArea.activa
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {selectedArea.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  {selectedArea.descripcion && (
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedArea.descripcion}</p>
                  )}

                  <div className="pt-1 flex flex-wrap items-center gap-3 text-xs">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium">Coordinador:</span>
                      <span className="font-bold">
                        {selectedArea.coordinadorNombre || 'Sin asignar'}
                      </span>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{selectedArea.integrantes.length} integrante(s)</span>
                    </div>
                  </div>
                </div>

                {/* Botones Administrativos del Área */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canEditArea && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditArea(selectedArea)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar Área</span>
                    </button>
                  )}
                  {canToggleArea && (
                    <button
                      type="button"
                      onClick={() => handleToggleAreaStatus(selectedArea)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                        selectedArea.activa
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{selectedArea.activa ? 'Desactivar' : 'Activar'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sección Integrantes */}
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Integrantes del Área</h4>
                    <p className="text-xs text-slate-500">
                      Los integrantes tienen acceso de consulta al inventario de esta área según sus roles.
                    </p>
                  </div>
                  {canManageIntegrantesOfSelected && (
                    <button
                      type="button"
                      onClick={handleOpenAddIntegrante}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Agregar Integrante</span>
                    </button>
                  )}
                </div>

                {selectedArea.integrantes.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Esta área aún no tiene integrantes asignados.
                  </div>
                ) : (
                  <>
                    {/* Móvil: Tarjetas */}
                    <div className="md:hidden space-y-2.5">
                      {selectedArea.integrantes.map((intg) => (
                        <div
                          key={intg.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{intg.usuarioNombre}</p>
                            <p className="text-xs text-slate-500 truncate">@{intg.usuarioUserName}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Desde {new Date(intg.fechaAsignacion).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                          {canManageIntegrantesOfSelected && (
                            <button
                              type="button"
                              onClick={() => handleRemoveIntegrante(intg.usuarioId, intg.usuarioNombre)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition shrink-0"
                              title="Retirar del área"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop/Tablet: Tabla */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            <th className="py-3 px-4">Integrante</th>
                            <th className="py-3 px-4">Usuario</th>
                            <th className="py-3 px-4">Fecha de asignación</th>
                            {canManageIntegrantesOfSelected && <th className="py-3 px-4 text-right">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {selectedArea.integrantes.map((intg) => (
                            <tr key={intg.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-semibold text-slate-800">{intg.usuarioNombre}</td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-xs">@{intg.usuarioUserName}</td>
                              <td className="py-3 px-4 text-slate-600 text-xs">
                                {new Date(intg.fechaAsignacion).toLocaleDateString('es-MX')}
                              </td>
                              {canManageIntegrantesOfSelected && (
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveIntegrante(intg.usuarioId, intg.usuarioNombre)}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    <span>Retirar</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Crear / Editar Área */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingArea ? 'Editar Área' : 'Nueva Área'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAreaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveArea} className="p-5 space-y-4">
              {areaModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {areaModalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del área *</label>
                <input
                  type="text"
                  value={areaNombre}
                  onChange={(e) => setAreaNombre(e.target.value)}
                  placeholder="Ej. Alabanza, Cocina, Multimedia..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  value={areaDescripcion}
                  onChange={(e) => setAreaDescripcion(e.target.value)}
                  placeholder="Breve descripción del área..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              {canAssignCoord && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Coordinador asignado</label>
                  <select
                    value={areaCoordinadorId}
                    onChange={(e) => setAreaCoordinadorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  >
                    <option value="">-- Sin coordinador --</option>
                    {usuariosDisponibles.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} (@{u.userName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingArea}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {savingArea ? 'Guardando...' : editingArea ? 'Guardar Cambios' : 'Crear Área'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Integrante */}
      {showIntegranteModal && selectedArea && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                Agregar Integrante a {selectedArea.nombre}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowIntegranteModal(false);
                  setConfirmTransfer(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmTransfer ? (
              <div className="p-5 space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Usuario ya asignado a otra área</span>
                  </div>
                  <p>{confirmTransfer.message}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setConfirmTransfer(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTransfer}
                    disabled={addingIntegrante}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {addingIntegrante ? 'Moviendo...' : 'Sí, cambiar de área'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddIntegrante} className="p-5 space-y-4">
                {integranteError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {integranteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seleccionar usuario *</label>
                  <select
                    value={selectedUsuarioId}
                    onChange={(e) => setSelectedUsuarioId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    required
                  >
                    <option value="">-- Elige un usuario --</option>
                    {usuariosDisponibles
                      .filter((u) => u.areaActualId !== selectedArea.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} (@{u.userName})
                          {u.areaActualNombre ? ` — Actual: ${u.areaActualNombre}` : ' — Sin área'}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Un usuario no puede pertenecer a dos áreas al mismo tiempo. Si ya está en otra área, se te pedirá confirmación para moverlo.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIntegranteModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addingIntegrante}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {addingIntegrante ? 'Agregando...' : 'Agregar Integrante'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
