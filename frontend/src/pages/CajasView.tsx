import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Coins,
  Banknote,
  Package,
  Calculator,
  Lock,
  Unlock,
  Eye,
  Trash2,
  AlertCircle,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Check
} from 'lucide-react';
import { Caja } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CajasViewProps {
  cajas: Caja[];
  onRefresh: () => void;
  onNavigateToConteo: (cajaId: number) => void;
}

export const CajasView: React.FC<CajasViewProps> = ({ cajas, onRefresh, onNavigateToConteo }) => {
  const { isAdmin, canOperate, canAccessModule } = useAuth();
  const [selectedCaja, setSelectedCaja] = useState<Caja | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);

  // Form states - Nueva caja
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [finalidad, setFinalidad] = useState('');
  const [tipoCaja, setTipoCaja] = useState<'EFECTIVO' | 'TRANSFERENCIAS'>('EFECTIVO');
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states - Movimiento Rápido (Entrada / Salida bancaria o de efectivo)
  const [showQuickOpModal, setShowQuickOpModal] = useState(false);
  const [quickOpType, setQuickOpType] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [quickOpCaja, setQuickOpCaja] = useState<Caja | null>(null);
  const [quickOpImporte, setQuickOpImporte] = useState<string>('');
  const [quickOpConcepto, setQuickOpConcepto] = useState('');
  const [quickOpDescripcion, setQuickOpDescripcion] = useState('');
  const [quickOpError, setQuickOpError] = useState<string | null>(null);
  const [quickOpSuccess, setQuickOpSuccess] = useState<string | null>(null);
  const [submittingQuickOp, setSubmittingQuickOp] = useState(false);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleCreateCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !finalidad.trim()) {
      setError('El nombre y la finalidad son obligatorios.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createCaja({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        finalidad: finalidad.trim(),
        tipo: tipoCaja,
        saldoInicial: Number(saldoInicial) || 0,
      });
      setShowCreateModal(false);
      setNombre('');
      setDescripcion('');
      setFinalidad('');
      setTipoCaja('EFECTIVO');
      setSaldoInicial(0);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error al crear la caja.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenQuickOp = (caja: Caja, tipo: 'ENTRADA' | 'SALIDA') => {
    setQuickOpCaja(caja);
    setQuickOpType(tipo);
    setQuickOpImporte('');
    setQuickOpConcepto(
      caja.tipo === 'TRANSFERENCIAS'
        ? (tipo === 'ENTRADA' ? 'Depósito / Transferencia recibida' : 'Pago / Transferencia enviada')
        : (tipo === 'ENTRADA' ? 'Ingreso directo' : 'Gasto operativo')
    );
    setQuickOpDescripcion('');
    setQuickOpError(null);
    setQuickOpSuccess(null);
    setShowQuickOpModal(true);
  };

  const handleSaveQuickOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickOpCaja) return;

    const imp = parseFloat(quickOpImporte);
    if (isNaN(imp) || imp <= 0) {
      setQuickOpError('Ingresa un importe válido mayor a $0');
      return;
    }

    if (!quickOpConcepto.trim()) {
      setQuickOpError('El concepto es obligatorio.');
      return;
    }

    setSubmittingQuickOp(true);
    setQuickOpError(null);
    try {
      if (quickOpType === 'ENTRADA') {
        await api.registrarEntrada({
          cajaId: quickOpCaja.id,
          importe: imp,
          concepto: quickOpConcepto.trim(),
          descripcion: quickOpDescripcion.trim() || quickOpConcepto.trim(),
        });
      } else {
        await api.registrarSalida({
          cajaId: quickOpCaja.id,
          importe: imp,
          concepto: quickOpConcepto.trim(),
          descripcion: quickOpDescripcion.trim() || quickOpConcepto.trim(),
        });
      }

      setQuickOpSuccess(`¡${quickOpType === 'ENTRADA' ? 'Entrada' : 'Salida'} de ${formatMoney(imp)} registrada en ${quickOpCaja.nombre}!`);
      onRefresh();
      setTimeout(() => {
        setShowQuickOpModal(false);
        setQuickOpSuccess(null);
      }, 1400);
    } catch (err: any) {
      setQuickOpError(err.message || 'Error al registrar la operación.');
    } finally {
      setSubmittingQuickOp(false);
    }
  };

  const handleToggleStatus = async (caja: Caja) => {
    if (!window.confirm(`¿Estás seguro de que deseas ${caja.activa ? 'desactivar' : 'activar'} la caja "${caja.nombre}"?`)) {
      return;
    }
    try {
      await api.toggleCajaStatus(caja.id);
      onRefresh();
      if (selectedCaja?.id === caja.id) {
        setSelectedCaja(null);
      }
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de la caja.');
    }
  };

  const handleDeleteCaja = async (caja: Caja) => {
    const confirm = window.confirm(
      `¿Deseas ELIMINAR permanentemente la caja "${caja.nombre}"?\n\n` +
      `Saldo actual: ${formatMoney(caja.saldoActual)} MXN.\n` +
      `Esta acción removerá la caja del sistema.`
    );
    if (!confirm) return;

    try {
      await api.deleteCaja(caja.id);
      if (selectedCaja?.id === caja.id) {
        setSelectedCaja(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la caja.');
    }
  };

  const filteredCajas = includeInactive ? cajas : cajas.filter(c => c.activa);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cajas de Tesorería</h2>
          <p className="text-xs text-slate-600">
            Administración de fondos económicos y consulta de disponibilidad por caja.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Mostrar cajas inactivas</span>
          </label>

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-sm flex items-center space-x-2 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* Cajas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCajas.map((caja) => {
          const esTransferencias = caja.tipo === 'TRANSFERENCIAS';

          return (
            <div
              key={caja.id}
              className={`bg-white rounded-xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                caja.activa
                  ? esTransferencias
                    ? 'border-blue-200 hover:border-blue-400'
                    : 'border-slate-200 hover:border-amber-400'
                  : 'border-slate-300 bg-slate-50 opacity-80'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`p-2.5 rounded-lg ${
                        !caja.activa
                          ? 'bg-slate-200 text-slate-700'
                          : esTransferencias
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {esTransferencias ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{caja.nombre}</h3>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-600">ID #{caja.id}</span>
                        {esTransferencias && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Transferencias / Banco
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      caja.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {caja.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold text-slate-700">Finalidad:</span> {caja.finalidad}</p>
                  {caja.descripcion && <p className="italic text-slate-600">{caja.descripcion}</p>}
                </div>

                {/* Saldo Display */}
                <div className={`mt-4 p-3 rounded-lg border ${esTransferencias ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                    {esTransferencias ? 'Saldo Disponible en Cuenta' : 'Saldo en Caja'}
                  </span>
                  <p className={`text-2xl font-extrabold mt-0.5 ${esTransferencias ? 'text-blue-950' : 'text-slate-900'}`}>
                    {formatMoney(caja.saldoActual)}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{esTransferencias ? 'Modalidad:' : 'Estado de verificación:'}</span>
                    <span className="font-semibold text-slate-700">
                      {esTransferencias ? 'Movimientos Digitales' : caja.estadoVerificacion}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {!esTransferencias ? (
                  <button
                    onClick={() => setSelectedCaja(caja)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Efectivo</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-blue-700 flex items-center space-x-1">
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Sin efectivo físico</span>
                  </span>
                )}

                <div className="flex items-center space-x-1.5">
                  {canOperate && caja.activa && (
                    <>
                      {esTransferencias ? (
                        <>
                          {canAccessModule('entradas') && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickOp(caja, 'ENTRADA')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center space-x-1 transition shadow-2xs"
                              title="Apuntar Entrada / Depósito por transferencia"
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              <span>+ Entrada</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickOp(caja, 'SALIDA')}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs flex items-center space-x-1 transition shadow-2xs"
                            title="Apuntar Salida / Pago por transferencia"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>- Salida</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onNavigateToConteo(caja.id)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-xs flex items-center space-x-1 transition"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Conteo</span>
                        </button>
                      )}
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleToggleStatus(caja)}
                        title={caja.activa ? 'Desactivar caja' : 'Reactivar caja'}
                        className={`p-1.5 rounded transition ${
                          caja.activa ? 'text-slate-400 hover:text-amber-600' : 'text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        {caja.activa ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCaja(caja)}
                        title="Eliminar caja permanentemente"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Desglose de Efectivo Físico de la Caja (Sección 10.3) */}
      {selectedCaja && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{selectedCaja.nombre}</h3>
                <p className="text-xs text-amber-400 font-medium">Desglose físico registrado en caja</p>
              </div>
              <button
                onClick={() => setSelectedCaja(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Saldo Financiero Actual:</span>
                  <p className="text-xl font-bold text-slate-900">{formatMoney(selectedCaja.saldoActual)}</p>
                </div>
                {canOperate && selectedCaja.activa && (
                  <button
                    onClick={() => {
                      const id = selectedCaja.id;
                      setSelectedCaja(null);
                      onNavigateToConteo(id);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center space-x-1"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Realizar Conteo</span>
                  </button>
                )}
              </div>

              {selectedCaja.desgloseEfectivo.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Esta caja aún no cuenta con desglose físico registrado mediante un conteo completo.
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Composición Física Actual:</h4>

                  {/* Móvil en tarjetas (< md) */}
                  <div className="md:hidden space-y-2">
                    {selectedCaja.desgloseEfectivo.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 min-w-0">
                          {item.tipoEfectivo === 'Moneda' ? (
                            <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : item.tipoEfectivo === 'Billete' ? (
                            <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Package className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{item.denominacionNombre || item.tipoBolsaNombre}</p>
                            <p className="text-[11px] text-slate-500">Unit: {formatMoney(item.valorUnitario)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900">{formatMoney(item.subtotal)}</p>
                          <p className="text-[11px] text-slate-500">Cant: {item.cantidad}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop/Tablet en tabla (>= md) */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2">Denominación / Tipo</th>
                        <th className="p-2 text-right">Valor Unit.</th>
                        <th className="p-2 text-right">Cant.</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCaja.desgloseEfectivo.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-medium flex items-center space-x-1.5">
                            {item.tipoEfectivo === 'Moneda' ? (
                              <Coins className="w-3.5 h-3.5 text-amber-600" />
                            ) : item.tipoEfectivo === 'Billete' ? (
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span>{item.denominacionNombre || item.tipoBolsaNombre}</span>
                          </td>
                          <td className="p-2 text-right text-slate-600">{formatMoney(item.valorUnitario || 0)}</td>
                          <td className="p-2 text-right font-bold text-slate-900">{item.cantidad}</td>
                          <td className="p-2 text-right font-bold text-slate-900">{formatMoney(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedCaja(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Caja */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Nueva Caja de Tesorería</h3>
                <p className="text-xs text-amber-400">Pertenecerá al fondo consolidado de tesorería</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCaja} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Caja *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoCaja('EFECTIVO')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      tipoCaja === 'EFECTIVO'
                        ? 'bg-amber-100 border-amber-500 text-amber-950 ring-2 ring-amber-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-amber-600" />
                    <span>Efectivo Físico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCaja('TRANSFERENCIAS')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      tipoCaja === 'TRANSFERENCIAS'
                        ? 'bg-blue-100 border-blue-500 text-blue-950 ring-2 ring-blue-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                    <span>Transferencias / Banco</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {tipoCaja === 'EFECTIVO'
                    ? 'Para custodia de efectivo con conteos físicos de monedas, billetes y bolsas.'
                    : 'Para registrar transferencias y cuentas bancarias donde solo se apuntan entradas y salidas directas.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Caja *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={tipoCaja === 'TRANSFERENCIAS' ? 'Ej. Cuenta Banco Azteca / BBVA' : 'Ej. Caja de Actividades Juveniles'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Finalidad / Uso Principal *</label>
                <input
                  type="text"
                  required
                  value={finalidad}
                  onChange={(e) => setFinalidad(e.target.value)}
                  placeholder="Ej. Compra de materiales y logística para eventos"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción Detallada</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles sobre quién custodia la caja o reglas específicas"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo Inicial (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-600 mt-1">
                  Si asignas un saldo inicial, se registrará una entrada automática de apertura.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  {submitting ? 'Creando...' : 'Crear Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Entrada o Salida Rápida (Ideal para transferencias) */}
      {showQuickOpModal && quickOpCaja && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                quickOpType === 'ENTRADA'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
                  : 'bg-gradient-to-r from-rose-700 to-red-800'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {quickOpType === 'ENTRADA' ? (
                  <ArrowDownRight className="w-5 h-5 text-emerald-300" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-300" />
                )}
                <div>
                  <h3 className="font-bold text-base">
                    {quickOpType === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Salida'}
                  </h3>
                  <p className="text-xs text-white/80">
                    Caja: {quickOpCaja.nombre} {quickOpCaja.tipo === 'TRANSFERENCIAS' && '(Transferencias)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickOpModal(false)}
                className="text-white/80 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickOp} className="p-6 space-y-4">
              {quickOpError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickOpError}</span>
                </div>
              )}

              {quickOpSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{quickOpSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Importe ($ MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={quickOpImporte}
                    onChange={(e) => setQuickOpImporte(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Concepto del Movimiento *
                </label>
                <input
                  type="text"
                  required
                  value={quickOpConcepto}
                  onChange={(e) => setQuickOpConcepto(e.target.value)}
                  placeholder="Ej. Ofrenda por transferencia electrónica, Pago de luz, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Referencia / Descripción (Opcional)
                </label>
                <textarea
                  value={quickOpDescripcion}
                  onChange={(e) => setQuickOpDescripcion(e.target.value)}
                  placeholder="Número de rastreo SPEI, banco emisor, persona que transfiere o motivo..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickOpModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingQuickOp}
                  className={`px-5 py-2 font-bold rounded-lg text-xs text-white shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5 ${
                    quickOpType === 'ENTRADA'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <span>
                    {submittingQuickOp
                      ? 'Guardando...'
                      : `Registrar ${quickOpType === 'ENTRADA' ? 'Entrada' : 'Salida'}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
