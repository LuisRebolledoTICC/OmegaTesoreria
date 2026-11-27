import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Pencil,
  Ban,
  Trash2,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EventoOmega } from '../types';

export const EventosView: React.FC = () => {
  const { isAdmin, canAccessModule } = useAuth();
  const canCrear = isAdmin || canAccessModule('eventos_crear');
  const canEditar = isAdmin || canAccessModule('eventos_editar');
  const canCancelar = isAdmin || canAccessModule('eventos_cancelar');
  const canEliminar = isAdmin || canAccessModule('eventos_eliminar');

  const [eventos, setEventos] = useState<EventoOmega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoOmega | null>(null);
  const [nombre, setNombre] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Cancelar
  const [cancelandoEvento, setCancelandoEvento] = useState<EventoOmega | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [canceling, setCanceling] = useState(false);

  const loadEventos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEventos();
      setEventos(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los eventos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventos();
  }, []);

  const toLocalDateTimeInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreateModal = () => {
    setEditingEvento(null);
    setNombre('');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setFechaHora(toLocalDateTimeInput(tomorrow.toISOString()));
    setUbicacion('');
    setDescripcion('');
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (ev: EventoOmega) => {
    setEditingEvento(ev);
    setNombre(ev.nombre);
    setFechaHora(toLocalDateTimeInput(ev.fechaHora));
    setUbicacion(ev.ubicacion || '');
    setDescripcion(ev.descripcion || '');
    setModalError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setModalError('El nombre del evento es obligatorio.');
      return;
    }
    if (!fechaHora) {
      setModalError('La fecha y hora son obligatorias.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const isoDate = new Date(fechaHora).toISOString();
      if (editingEvento) {
        await api.updateEvento(editingEvento.id, {
          nombre: nombre.trim(),
          fechaHora: isoDate,
          ubicacion: ubicacion.trim() || undefined,
          descripcion: descripcion.trim() || undefined,
        });
        setSuccessMsg('Evento actualizado correctamente.');
      } else {
        await api.createEvento({
          nombre: nombre.trim(),
          fechaHora: isoDate,
          ubicacion: ubicacion.trim() || undefined,
          descripcion: descripcion.trim() || undefined,
        });
        setSuccessMsg('Evento creado correctamente.');
      }
      setShowModal(false);
      await loadEventos();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar el evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCancelar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelandoEvento) return;
    setCanceling(true);
    try {
      await api.cancelarEvento(cancelandoEvento.id, motivoCancelacion.trim() || undefined);
      setCancelandoEvento(null);
      setMotivoCancelacion('');
      setSuccessMsg('Evento cancelado. Se conserva en el historial.');
      await loadEventos();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar el evento.');
    } finally {
      setCanceling(false);
    }
  };

  const handleEliminar = async (ev: EventoOmega) => {
    if (!confirm(`¿Seguro que deseas eliminar el evento "${ev.nombre}"?`)) return;
    try {
      await api.deleteEvento(ev.id);
      setSuccessMsg('Evento eliminado correctamente.');
      await loadEventos();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el evento.');
    }
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Eventos de Omega</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calendario ordenado por fecha de próximos eventos y registro histórico.
          </p>
        </div>

        {canCrear && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
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

      {/* Lista de Eventos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Cargando eventos...</div>
        ) : eventos.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No hay eventos registrados</p>
            <p className="text-xs text-slate-500">Los eventos programados aparecerán aquí ordenados por fecha.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {eventos.map((ev) => {
              const fecha = new Date(ev.fechaHora);
              const esPasado = fecha < now;
              const esCancelado = ev.estado === 'CANCELADO';

              return (
                <div
                  key={ev.id}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                    esCancelado ? 'bg-rose-50/30 opacity-75' : esPasado ? 'bg-slate-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base font-bold ${esCancelado ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {ev.nombre}
                      </h3>
                      {esCancelado ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          CANCELADO
                        </span>
                      ) : esPasado ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                          PASADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          PRÓXIMO
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                        <Clock className="w-3.5 h-3.5" />
                        {fecha.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} ·{' '}
                        {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {ev.ubicacion && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {ev.ubicacion}
                        </span>
                      )}
                    </div>

                    {ev.descripcion && (
                      <p className="text-xs text-slate-600">{ev.descripcion}</p>
                    )}

                    {esCancelado && ev.motivoCancelacion && (
                      <p className="text-[11px] text-rose-700 font-medium">
                        Motivo de cancelación: {ev.motivoCancelacion} (por {ev.canceladoPor})
                      </p>
                    )}
                  </div>

                  {(canEditar || canCancelar || canEliminar) && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {canEditar && !esCancelado && (
                        <button
                          type="button"
                          onClick={() => openEditModal(ev)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}
                      {canCancelar && !esCancelado && (
                        <button
                          type="button"
                          onClick={() => { setCancelandoEvento(ev); setMotivoCancelacion(''); }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      )}
                      {canEliminar && (!esPasado || esCancelado) && (
                        <button
                          type="button"
                          onClick={() => handleEliminar(ev)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Evento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvento ? 'Editar Evento' : 'Nuevo Evento'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Reunión general de Omega"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  required
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ubicación (opcional)</label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. Salón principal / Auditorio"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción (opcional)</label>
                <textarea
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles adicionales del evento..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold shadow-xs"
                >
                  {saving ? 'Guardando...' : 'Guardar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cancelar Evento */}
      {cancelandoEvento && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Cancelar Evento</h3>
            <p className="text-xs text-slate-600">
              El evento <strong>{cancelandoEvento.nombre}</strong> quedará marcado como cancelado y no se mostrará en los próximos eventos activos.
            </p>
            <form onSubmit={handleConfirmCancelar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo de cancelación (opcional)</label>
                <textarea
                  rows={2}
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej. Reprogramado por logística"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelandoEvento(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={canceling}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                >
                  {canceling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
