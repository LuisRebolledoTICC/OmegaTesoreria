import React, { useState, useEffect } from 'react';
import {
  Coins,
  Banknote,
  Package,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
  Pencil,
  X,
  Plus,
  Trash2,
  History,
  Info,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight
} from 'lucide-react';
import { Caja, Denominacion, TipoBolsa, ConteoItem, ConteoRegistro } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ConteoEfectivoViewProps {
  cajas: Caja[];
  selectedCajaId?: number | null;
  onConteoGuardado: () => void;
}

export const ConteoEfectivoView: React.FC<ConteoEfectivoViewProps> = ({
  cajas,
  selectedCajaId,
  onConteoGuardado,
}) => {
  const { user, isAdmin, canOperate } = useAuth();
  const [activeCajaId, setActiveCajaId] = useState<number>(() => {
    return selectedCajaId || (cajas.find(c => c.activa)?.id || 0);
  });

  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([]);
  const [tiposBolsas, setTiposBolsas] = useState<TipoBolsa[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [observaciones, setObservaciones] = useState('');
  const [aplicarAjuste, setAplicarAjuste] = useState(false);
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [conteosPrevios, setConteosPrevios] = useState<ConteoRegistro[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync selectedCajaId if changed from outside
  useEffect(() => {
    if (selectedCajaId && selectedCajaId !== activeCajaId) {
      setActiveCajaId(selectedCajaId);
    }
  }, [selectedCajaId]);

  // Load catalogos
  const loadCatalogos = async (cajaId?: number) => {
    try {
      setLoading(true);
      const targetCajaId = cajaId !== undefined ? cajaId : activeCajaId;
      const [dens, bolsas] = await Promise.all([
        api.getDenominaciones(),
        targetCajaId ? api.getTiposBolsas(targetCajaId) : api.getTiposBolsas(),
      ]);
      setDenominaciones(dens);
      setTiposBolsas(bolsas);
    } catch (err) {
      console.error('Error cargando catálogos de conteo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogos(activeCajaId);
  }, []);

  // Monedas disponibles para bolsas
  const monedasDisponibles = denominaciones.filter(d => d.tipo === 'Moneda');

  // Estado del Modal de Configuración de Bolsa (Cálculo interactivo de monedas)
  const [showBolsaModal, setShowBolsaModal] = useState(false);
  const [editingBolsa, setEditingBolsa] = useState<TipoBolsa | null>(null);
  const [bolsaDenomId, setBolsaDenomId] = useState<number | null>(null);
  const [bolsaValorTotal, setBolsaValorTotal] = useState<string>('100');
  const [bolsaCantidadMonedas, setBolsaCantidadMonedas] = useState<string>('20');
  const [bolsaNombre, setBolsaNombre] = useState<string>('');
  const [bolsaDescripcion, setBolsaDescripcion] = useState<string>('');
  const [savingBolsa, setSavingBolsa] = useState(false);

  const handleOpenNewBolsa = () => {
    setEditingBolsa(null);
    const defaultDenom = monedasDisponibles.find(m => m.valor === 5) || monedasDisponibles[0];
    const denomId = defaultDenom ? defaultDenom.id : null;
    const denomValor = defaultDenom ? defaultDenom.valor : 5;
    const cantMonedas = 20;
    const total = cantMonedas * denomValor;

    setBolsaDenomId(denomId);
    setBolsaCantidadMonedas(cantMonedas.toString());
    setBolsaValorTotal(total.toString());
    setBolsaNombre(defaultDenom ? `Bolsa de monedas de $${defaultDenom.valor}` : 'Bolsa de monedas');
    setBolsaDescripcion(`${cantMonedas} monedas de $${denomValor.toFixed(2)} = $${total.toFixed(2)}`);
    setShowBolsaModal(true);
  };

  const handleOpenEditBolsa = (tb: TipoBolsa) => {
    setEditingBolsa(tb);
    const denom = monedasDisponibles.find(m => m.id === tb.denominacionAsociadaId);
    const denomValor = denom ? denom.valor : (tb.denominacionAsociada?.valor || null);

    setBolsaDenomId(tb.denominacionAsociadaId || (denom ? denom.id : null));
    setBolsaValorTotal(tb.valorUnitario.toString());

    if (denomValor && denomValor > 0) {
      const cant = Math.round(tb.valorUnitario / denomValor);
      setBolsaCantidadMonedas(cant.toString());
    } else {
      setBolsaCantidadMonedas('');
    }

    setBolsaNombre(tb.nombre);
    setBolsaDescripcion(tb.descripcion);
    setShowBolsaModal(true);
  };

  const handleSelectDenominacion = (denomId: number) => {
    setBolsaDenomId(denomId);
    const denom = monedasDisponibles.find(m => m.id === denomId);
    if (!denom || denom.valor <= 0) return;

    const cant = parseInt(bolsaCantidadMonedas) || 20;
    const nuevoTotal = cant * denom.valor;
    setBolsaValorTotal(nuevoTotal.toString());
    setBolsaNombre(`Bolsa de monedas de $${denom.valor}`);
    setBolsaDescripcion(`${cant} monedas de $${denom.valor.toFixed(2)} = $${nuevoTotal.toFixed(2)}`);
  };

  const handleChangeValorTotal = (valStr: string) => {
    setBolsaValorTotal(valStr);
    const val = parseFloat(valStr);
    const denom = monedasDisponibles.find(m => m.id === bolsaDenomId);
    if (denom && denom.valor > 0 && !isNaN(val) && val > 0) {
      const calcMonedas = val / denom.valor;
      const monedasFormatted = Number.isInteger(calcMonedas) ? calcMonedas.toString() : calcMonedas.toFixed(1);
      setBolsaCantidadMonedas(monedasFormatted);
      setBolsaDescripcion(`${monedasFormatted} monedas de $${denom.valor.toFixed(2)} = $${val.toFixed(2)}`);
    }
  };

  const handleChangeCantidadMonedas = (cantStr: string) => {
    setBolsaCantidadMonedas(cantStr);
    const cant = parseInt(cantStr);
    const denom = monedasDisponibles.find(m => m.id === bolsaDenomId);
    if (denom && denom.valor > 0 && !isNaN(cant) && cant > 0) {
      const nuevoTotal = cant * denom.valor;
      setBolsaValorTotal(nuevoTotal.toString());
      setBolsaDescripcion(`${cant} monedas de $${denom.valor.toFixed(2)} = $${nuevoTotal.toFixed(2)}`);
    }
  };

  const handleSaveBolsaModal = async () => {
    const valorUnitario = parseFloat(bolsaValorTotal);
    if (isNaN(valorUnitario) || valorUnitario <= 0) {
      alert('Ingresa un importe válido mayor a $0');
      return;
    }
    if (!bolsaNombre.trim()) {
      alert('Ingresa un nombre para la bolsa');
      return;
    }

    setSavingBolsa(true);
    try {
      if (editingBolsa) {
        await api.updateTipoBolsa(editingBolsa.id, {
          nombre: bolsaNombre.trim(),
          descripcion: bolsaDescripcion.trim(),
          valorUnitario,
          denominacionAsociadaId: bolsaDenomId,
          cajaId: activeCajaId
        });
      } else {
        await api.createTipoBolsa({
          nombre: bolsaNombre.trim(),
          descripcion: bolsaDescripcion.trim(),
          valorUnitario,
          denominacionAsociadaId: bolsaDenomId,
          cajaId: activeCajaId
        });
      }
      setShowBolsaModal(false);
      await loadCatalogos(activeCajaId);
    } catch (err: any) {
      alert(err.message || 'Error al guardar la bolsa');
    } finally {
      setSavingBolsa(false);
    }
  };

  const handleDeleteBolsa = async (tb: TipoBolsa) => {
    if (!confirm(`¿Eliminar la "${tb.nombre}" de la lista de conteo de esta caja?`)) return;
    try {
      await api.deleteTipoBolsa(tb.id);
      await loadCatalogos(activeCajaId);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la bolsa');
    }
  };

  // Operación directa por Diferencia (Entrada / Salida / Ajuste)
  const [showOperacionDiferenciaModal, setShowOperacionDiferenciaModal] = useState(false);
  const [tipoOperacionDiferencia, setTipoOperacionDiferencia] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [montoDiferencia, setMontoDiferencia] = useState<number>(0);
  const [conceptoDiferencia, setConceptoDiferencia] = useState('');
  const [descripcionDiferencia, setDescripcionDiferencia] = useState('');
  const [observacionesDiferencia, setObservacionesDiferencia] = useState('');
  const [submittingOperacion, setSubmittingOperacion] = useState(false);

  // Estados para el tratamiento de diferencia dentro del modal de Confirmar Conteo
  const [tipoMovimientoConteo, setTipoMovimientoConteo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [conceptoConteo, setConceptoConteo] = useState('');

  const handleAbrirOperacionDiferencia = (tipo?: 'ENTRADA' | 'SALIDA' | 'AJUSTE') => {
    const t = tipo || (diferencia >= 0 ? 'ENTRADA' : 'SALIDA');
    setTipoOperacionDiferencia(t);
    const monto = Math.abs(diferencia);
    setMontoDiferencia(monto);
    if (t === 'ENTRADA') {
      setConceptoDiferencia(diferencia > 0 ? 'Sobrante en conteo físico' : 'Ingreso extraordinario');
      setDescripcionDiferencia(
        `Ingreso registrado desde conteo de ${cajaSeleccionada?.nombre || 'caja'}. Saldo esperado: ${formatMoney(saldoEsperado)}, Contado: ${formatMoney(saldoContado)}.`
      );
    } else if (t === 'SALIDA') {
      setConceptoDiferencia(diferencia < 0 ? 'Faltante en conteo físico' : 'Salida de caja');
      setDescripcionDiferencia(
        `Salida registrada desde conteo de ${cajaSeleccionada?.nombre || 'caja'}. Saldo esperado: ${formatMoney(saldoEsperado)}, Contado: ${formatMoney(saldoContado)}.`
      );
    } else {
      setConceptoDiferencia('Ajuste por conteo físico');
      setDescripcionDiferencia(
        `Ajuste por conciliación de conteo físico en ${cajaSeleccionada?.nombre || 'caja'}. Diferencia: ${formatMoney(diferencia)}.`
      );
    }
    setObservacionesDiferencia('');
    setShowOperacionDiferenciaModal(true);
  };

  const handleGuardarOperacionDiferencia = async () => {
    if (!cajaSeleccionada) return;
    if (!conceptoDiferencia.trim()) {
      alert('Ingresa el concepto de la operación.');
      return;
    }
    if (montoDiferencia <= 0) {
      alert('El importe debe ser mayor a 0.');
      return;
    }

    setSubmittingOperacion(true);
    try {
      if (tipoOperacionDiferencia === 'ENTRADA') {
        await api.registrarEntrada({
          cajaId: cajaSeleccionada.id,
          importe: Number(montoDiferencia),
          concepto: conceptoDiferencia.trim(),
          descripcion: descripcionDiferencia.trim() || conceptoDiferencia.trim(),
          observaciones: observacionesDiferencia.trim() || undefined,
        });
      } else if (tipoOperacionDiferencia === 'SALIDA') {
        await api.registrarSalida({
          cajaId: cajaSeleccionada.id,
          importe: Number(montoDiferencia),
          concepto: conceptoDiferencia.trim(),
          descripcion: descripcionDiferencia.trim() || conceptoDiferencia.trim(),
          observaciones: observacionesDiferencia.trim() || undefined,
        });
      } else {
        await api.registrarConteo({
          cajaId: cajaSeleccionada.id,
          items: itemsConteo,
          aplicarAjuste: true,
          motivoAjuste: descripcionDiferencia.trim() || conceptoDiferencia.trim(),
          tipoMovimientoDiferencia: 'AJUSTE',
          conceptoDiferencia: conceptoDiferencia.trim(),
        });
      }

      setShowOperacionDiferenciaModal(false);
      setMessage({
        type: 'success',
        text: `¡${tipoOperacionDiferencia} de ${formatMoney(montoDiferencia)} registrada con éxito! El saldo de ${cajaSeleccionada.nombre} se ha actualizado.`
      });
      onConteoGuardado();
    } catch (err: any) {
      alert(err.message || 'Error al registrar la operación');
    } finally {
      setSubmittingOperacion(false);
    }
  };

  // Estado del último conteo cargado
  const [ultimoConteoCargado, setUltimoConteoCargado] = useState<ConteoRegistro | null>(null);

  // Función para extraer y convertir las cantidades de un conteo a las keys del formulario
  const extraerCantidadesConteo = (conteo?: ConteoRegistro | null, caja?: Caja): Record<string, number> => {
    const map: Record<string, number> = {};
    if (conteo && conteo.desgloseJson) {
      try {
        const items = JSON.parse(conteo.desgloseJson);
        if (Array.isArray(items)) {
          for (const it of items) {
            const tipo = it.tipoEfectivo || it.TipoEfectivo;
            const denId = it.denominacionId ?? it.DenominacionId;
            const bolsaId = it.tipoBolsaId ?? it.TipoBolsaId;
            const cant = Number(it.cantidad ?? it.Cantidad ?? 0);
            if (tipo === 'Moneda' && denId) {
              map[`moneda_${denId}`] = cant;
            } else if (tipo === 'Billete' && denId) {
              map[`billete_${denId}`] = cant;
            } else if (tipo === 'Bolsa' && bolsaId) {
              map[`bolsa_${bolsaId}`] = cant;
            }
          }
        }
      } catch (e) {
        console.error('Error parseando desgloseJson:', e);
      }
    } else if (caja && caja.desgloseEfectivo && caja.desgloseEfectivo.length > 0) {
      for (const it of caja.desgloseEfectivo) {
        if (it.tipoEfectivo === 'Moneda' && it.denominacionId) {
          map[`moneda_${it.denominacionId}`] = it.cantidad;
        } else if (it.tipoEfectivo === 'Billete' && it.denominacionId) {
          map[`billete_${it.denominacionId}`] = it.cantidad;
        } else if (it.tipoEfectivo === 'Bolsa' && it.tipoBolsaId) {
          map[`bolsa_${it.tipoBolsaId}`] = it.cantidad;
        }
      }
    }
    return map;
  };

  // Cargar conteos previos, bolsas y PRECARGAR el último conteo guardado de la caja activa
  useEffect(() => {
    if (!activeCajaId) return;
    const loadDataCaja = async () => {
      try {
        const [list, bolsas] = await Promise.all([
          api.getConteos(activeCajaId),
          api.getTiposBolsas(activeCajaId),
        ]);
        setConteosPrevios(list.slice(0, 5));
        setTiposBolsas(bolsas);

        const cajaAct = cajas.find(c => c.id === activeCajaId);
        const ultimo = list.length > 0 ? list[0] : null;
        setUltimoConteoCargado(ultimo);

        // Precargar automáticamente las cantidades del último conteo
        const guardadas = extraerCantidadesConteo(ultimo, cajaAct);
        setCantidades(guardadas);
      } catch (err) {
        console.error('Error cargando conteos y bolsas:', err);
      }
    };
    loadDataCaja();
    // Reset inputs auxiliares
    setObservaciones('');
    setAplicarAjuste(false);
    setMotivoAjuste('');
    setMessage(null);
  }, [activeCajaId]);

  const cajaSeleccionada = cajas.find(c => c.id === activeCajaId);

  const handleRestaurarUltimoConteo = () => {
    const guardadas = extraerCantidadesConteo(ultimoConteoCargado, cajaSeleccionada);
    setCantidades(guardadas);
    setMessage({
      type: 'success',
      text: 'Se han restaurado las cantidades de tu último conteo guardado.'
    });
  };

  const handleCargarConteoHistorico = (c: ConteoRegistro) => {
    const cantidadesConteo = extraerCantidadesConteo(c, cajaSeleccionada);
    setCantidades(cantidadesConteo);
    setUltimoConteoCargado(c);
    setMessage({
      type: 'success',
      text: `Se han cargado las cantidades del conteo del ${new Date(c.fechaConteo).toLocaleString('es-MX')}.`
    });
  };

  const handleCantidadChange = (key: string, value: string) => {
    const num = parseInt(value, 10);
    setCantidades(prev => ({
      ...prev,
      [key]: isNaN(num) || num < 0 ? 0 : num,
    }));
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas reiniciar todos los contadores de efectivo a cero?')) {
      setCantidades({});
      setObservaciones('');
      setAplicarAjuste(false);
      setMotivoAjuste('');
      setMessage(null);
    }
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  // Group Denominations
  const monedas = denominaciones.filter(d => d.tipo === 'Moneda');
  const billetes = denominaciones.filter(d => d.tipo === 'Billete');

  // Calculations (Section 3.3, 3.4, 9.1)
  const itemsConteo: ConteoItem[] = [];

  let totalMonedas = 0;
  let piezasMonedas = 0;
  monedas.forEach(m => {
    const cant = cantidades[`moneda_${m.id}`] || 0;
    const sub = cant * m.valor;
    totalMonedas += sub;
    piezasMonedas += cant;
    itemsConteo.push({
      tipoEfectivo: 'Moneda',
      denominacionId: m.id,
      nombre: m.nombre,
      valorUnitario: m.valor,
      cantidad: cant,
      subtotal: sub,
    });
  });

  let totalBilletes = 0;
  let piezasBilletes = 0;
  billetes.forEach(b => {
    const cant = cantidades[`billete_${b.id}`] || 0;
    const sub = cant * b.valor;
    totalBilletes += sub;
    piezasBilletes += cant;
    itemsConteo.push({
      tipoEfectivo: 'Billete',
      denominacionId: b.id,
      nombre: b.nombre,
      valorUnitario: b.valor,
      cantidad: cant,
      subtotal: sub,
    });
  });

  let totalBolsas = 0;
  let piezasBolsas = 0;
  tiposBolsas.forEach(tb => {
    const cant = cantidades[`bolsa_${tb.id}`] || 0;
    const sub = cant * tb.valorUnitario;
    totalBolsas += sub;
    piezasBolsas += cant;
    itemsConteo.push({
      tipoEfectivo: 'Bolsa',
      tipoBolsaId: tb.id,
      nombre: tb.nombre,
      valorUnitario: tb.valorUnitario,
      cantidad: cant,
      subtotal: sub,
    });
  });

  const saldoContado = totalMonedas + totalBilletes + totalBolsas;
  const saldoEsperado = cajaSeleccionada?.saldoActual || 0;
  const diferencia = saldoContado - saldoEsperado;
  const tieneDiferencia = Math.abs(diferencia) >= 0.01;

  const handleAbrirConfirmModal = () => {
    if (diferencia > 0) {
      setTipoMovimientoConteo('ENTRADA');
      setConceptoConteo('Sobrante en conteo físico');
      setMotivoAjuste(`Entrada por sobrante de ${formatMoney(diferencia)} detectado en conteo.`);
    } else if (diferencia < 0) {
      setTipoMovimientoConteo('SALIDA');
      setConceptoConteo('Faltante en conteo físico');
      setMotivoAjuste(`Salida por faltante de ${formatMoney(Math.abs(diferencia))} detectado en conteo.`);
    } else {
      setTipoMovimientoConteo('AJUSTE');
      setConceptoConteo('Ajuste de conteo físico');
      setMotivoAjuste('');
    }
    setShowConfirmModal(true);
  };

  const handleGuardarConteo = async () => {
    if (!cajaSeleccionada) return;
    if (aplicarAjuste && tieneDiferencia && (!conceptoConteo.trim() || !motivoAjuste.trim())) {
      alert('Debes indicar el concepto y la explicación del movimiento para conciliar la diferencia.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.registrarConteo({
        cajaId: cajaSeleccionada.id,
        items: itemsConteo,
        observaciones: observaciones.trim() || undefined,
        aplicarAjuste,
        motivoAjuste: aplicarAjuste ? motivoAjuste.trim() : undefined,
        tipoMovimientoDiferencia: aplicarAjuste ? tipoMovimientoConteo : undefined,
        conceptoDiferencia: aplicarAjuste ? (conceptoConteo.trim() || motivoAjuste.trim()) : undefined,
      });

      setShowConfirmModal(false);
      setMessage({
        type: 'success',
        text: `¡Conteo de ${cajaSeleccionada.nombre} guardado exitosamente! Las cantidades quedan guardadas para tu próximo arqueo.`,
      });

      // Reload box counts, update last count reference and refresh parent
      const list = await api.getConteos(cajaSeleccionada.id);
      setConteosPrevios(list.slice(0, 5));
      if (list.length > 0) {
        setUltimoConteoCargado(list[0]);
      }
      onConteoGuardado();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al guardar el conteo.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        <span className="ml-3 text-slate-600">Cargando denominaciones y cajas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Box Selector & Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Control y Conteo Físico de Efectivo</span>
          </h2>
          <p className="text-xs text-slate-500">
            Conteo físico de monedas, billetes y bolsas para verificación y cuadre de caja.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 w-full md:w-auto min-w-0">
          <label className="text-xs font-bold text-slate-700 uppercase shrink-0">Caja a Contar:</label>
          <select
            value={activeCajaId}
            onChange={(e) => setActiveCajaId(Number(e.target.value))}
            className="w-full md:w-auto md:max-w-xs min-w-0 max-w-full truncate px-3.5 py-2.5 sm:py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {cajas.filter(c => c.activa).map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({formatMoney(c.saldoActual)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Banner de Estado del Conteo Precargado */}
      <div className="bg-gradient-to-r from-amber-50/90 via-slate-50 to-amber-50/90 p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            {ultimoConteoCargado ? (
              <div>
                <p className="text-slate-800 font-semibold">
                  Último conteo de {cajaSeleccionada?.nombre} cargado ({new Date(ultimoConteoCargado.fechaConteo).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} por {ultimoConteoCargado.usuarioNombre})
                </p>
                <p className="text-[11px] text-slate-500">
                  Las cantidades están precargadas. Solo ajusta las monedas, billetes o bolsas que hayan cambiado y haz clic en Guardar.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-slate-800 font-semibold">
                  Nuevo conteo en {cajaSeleccionada?.nombre}
                </p>
                <p className="text-[11px] text-slate-500">
                  Ingresa las cantidades contadas. Al guardar, quedarán almacenadas automáticamente para tu próximo conteo.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {ultimoConteoCargado && (
            <button
              type="button"
              onClick={handleRestaurarUltimoConteo}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 transition flex items-center space-x-1 shadow-2xs"
              title="Restaurar a las cantidades exactas del último conteo guardado"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restaurar guardado</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-300 font-semibold rounded-lg border border-slate-300 transition flex items-center space-x-1 shadow-2xs"
            title="Poner todos los campos en 0 para contar desde cero"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Limpiar a ceros</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center space-x-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Columns for Cash Entry + Summary Pane */}
      {cajaSeleccionada?.tipo === 'TRANSFERENCIAS' ? (
        <div className="bg-white rounded-2xl border border-blue-200 p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-center space-x-3.5">
              <div className="p-3.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <ArrowLeftRight className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{cajaSeleccionada.nombre}</h3>
                <p className="text-xs text-blue-900 font-bold uppercase tracking-wider mt-0.5">
                  Caja para Transferencias Bancarias y Movimientos Digitales
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  En esta caja no se cuentan monedas ni billetes físicos: solo se apuntan entradas y salidas bancarias literales.
                </p>
              </div>
            </div>

            <div className="text-right bg-white/80 p-4 rounded-xl border border-blue-100">
              <span className="text-[11px] uppercase tracking-wider font-bold text-blue-900">Saldo Disponible</span>
              <p className="text-3xl font-extrabold text-blue-950 mt-0.5">{formatMoney(cajaSeleccionada.saldoActual)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleAbrirOperacionDiferencia('ENTRADA')}
              className="p-5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-2xl text-left transition flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-base">
                  <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                  <span>Apuntar Entrada por Transferencia</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Registrar depósito recibido, ofrenda electrónica o traspaso bancario.
                </p>
              </div>
              <span className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl group-hover:bg-emerald-700 transition shadow-xs">
                + Entrada
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAbrirOperacionDiferencia('SALIDA')}
              className="p-5 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-2xl text-left transition flex items-center justify-between group shadow-xs"
            >
              <div>
                <div className="flex items-center space-x-2 text-rose-900 font-bold text-base">
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                  <span>Apuntar Salida por Transferencia</span>
                </div>
                <p className="text-xs text-rose-700 mt-1">
                  Registrar pago de servicios, proveedores o transferencia bancaria enviada.
                </p>
              </div>
              <span className="px-3.5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl group-hover:bg-rose-700 transition shadow-xs">
                - Salida
              </span>
            </button>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash input sections (Monedas, Billetes, Bolsas) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Categoría A: Monedas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-amber-50/70 border-b border-amber-200/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <Coins className="w-4 h-4 text-amber-700" />
                <span>CATEGORÍA A: MONEDAS EN EFECTIVO</span>
              </div>
              <span className="text-xs font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Subtotal: {formatMoney(totalMonedas)}
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {monedas.map((m) => {
                const key = `moneda_${m.id}`;
                const cant = cantidades[key] || '';
                const sub = (Number(cant) || 0) * m.valor;
                return (
                  <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 text-sm">{m.nombre}</span>
                      <span className="text-xs text-slate-500 font-medium">Unit: {formatMoney(m.valor)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0 piezas"
                        value={cant}
                        onChange={(e) => handleCantidadChange(key, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-sm text-center font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="mt-2 text-right text-xs font-bold text-slate-700">
                      = {formatMoney(sub)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categoría B: Billetes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-emerald-50/70 border-b border-emerald-200/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span>CATEGORÍA B: BILLETES EN EFECTIVO</span>
              </div>
              <span className="text-xs font-semibold text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                Subtotal: {formatMoney(totalBilletes)}
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {billetes.map((b) => {
                const key = `billete_${b.id}`;
                const cant = cantidades[key] || '';
                const sub = (Number(cant) || 0) * b.valor;
                return (
                  <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 text-sm">{b.nombre}</span>
                      <span className="text-xs text-slate-500 font-medium">Unit: {formatMoney(b.valor)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0 billetes"
                        value={cant}
                        onChange={(e) => handleCantidadChange(key, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-sm text-center font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="mt-2 text-right text-xs font-bold text-slate-700">
                      = {formatMoney(sub)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categoría C: Bolsas de Monedas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-blue-50/70 border-b border-blue-200/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-900 font-bold text-sm">
                <Package className="w-4 h-4 text-blue-700" />
                <span>CATEGORÍA C: BOLSAS DE MONEDAS ({cajaSeleccionada?.nombre || 'ESTA CAJA'})</span>
              </div>
              <div className="flex items-center space-x-2.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenNewBolsa}
                    className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-1 shadow-xs transition"
                    title={`Crear nueva bolsa para ${cajaSeleccionada?.nombre || 'esta caja'}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Bolsa</span>
                  </button>
                )}
                <span className="text-xs font-semibold text-blue-900 bg-blue-100/80 px-2.5 py-1 rounded-full">
                  Subtotal: {formatMoney(totalBolsas)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/40 text-blue-800 text-[11px] px-5 flex items-center space-x-2 border-b border-blue-100">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>Bolsas por caja:</strong> Las bolsas creadas aquí pertenecen exclusivamente a <strong>{cajaSeleccionada?.nombre}</strong>.
              </span>
            </div>

            {tiposBolsas.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50">
                <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Esta caja no tiene bolsas configuradas</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Las bolsas son exclusivas para cada caja. Si utilizas bolsas de monedas en {cajaSeleccionada?.nombre}, puedes agregar una haciendo clic en el botón de abajo.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenNewBolsa}
                    className="mt-3.5 inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Bolsa a {cajaSeleccionada?.nombre}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tiposBolsas.map((tb) => {
                  const key = `bolsa_${tb.id}`;
                  const cant = cantidades[key] || '';
                  const cantNum = Number(cant) || 0;
                  const sub = cantNum * tb.valorUnitario;

                  // Encontrar la denominación asociada
                  const denom = monedasDisponibles.find(m => m.id === tb.denominacionAsociadaId) || tb.denominacionAsociada;
                  const denomValor = denom ? denom.valor : null;
                  const monedasPorBolsa = denomValor && denomValor > 0 ? Math.round(tb.valorUnitario / denomValor) : null;
                  const totalMonedasContadas = monedasPorBolsa && cantNum > 0 ? cantNum * monedasPorBolsa : null;

                  return (
                    <div key={tb.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between hover:border-blue-300 transition shadow-xs">
                      <div>
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{tb.nombre}</span>
                            {denom && (
                              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md mt-0.5">
                                <Coins className="w-3 h-3" />
                                <span>Moneda de ${denom.valor.toFixed(2)}</span>
                                {monedasPorBolsa && (
                                  <span className="text-blue-900 font-bold">({monedasPorBolsa} pzs/bolsa)</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-right">
                            <span className="text-sm font-extrabold text-blue-800">{formatMoney(tb.valorUnitario)}</span>
                            {isAdmin && (
                              <div className="flex items-center space-x-0.5 ml-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBolsa(tb)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Configurar moneda y valor de esta bolsa"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBolsa(tb)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  title="Eliminar esta bolsa de esta caja"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">{tb.descripcion}</p>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0 bolsas"
                            value={cant}
                            onChange={(e) => handleCantidadChange(key, e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-center font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-700">
                          {totalMonedasContadas ? (
                            <span className="text-[11px] font-medium text-slate-500">
                              {totalMonedasContadas} monedas en total
                            </span>
                          ) : <span />}
                          <span className="text-blue-800 font-extrabold">
                            = {formatMoney(sub)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Summary, Comparison & Action (Section 3.4 & 3.5) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-6">
            <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Resumen del Conteo</span>
              <button
                type="button"
                onClick={handleReset}
                title="Reiniciar conteo"
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </h3>

            {/* Subtotales por categoría */}
            <div className="divide-y divide-slate-100 text-sm mt-3">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>Monedas ({piezasMonedas} pzs)</span>
                </span>
                <span className="font-bold text-slate-900">{formatMoney(totalMonedas)}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 flex items-center space-x-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Billetes ({piezasBilletes} pzs)</span>
                </span>
                <span className="font-bold text-slate-900">{formatMoney(totalBilletes)}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 flex items-center space-x-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Bolsas ({piezasBolsas} uds)</span>
                </span>
                <span className="font-bold text-slate-900">{formatMoney(totalBolsas)}</span>
              </div>
            </div>

            {/* Total Contado */}
            <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Total Físico Contado
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {formatMoney(saldoContado)}
              </p>
            </div>

            {/* Comparación vs Saldo Esperado (Sección 3.5) */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Saldo registrado en sistema:</span>
                <span className="font-bold text-slate-800">{formatMoney(saldoEsperado)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Total físico contado:</span>
                <span className="font-bold text-slate-800">{formatMoney(saldoContado)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-800">Diferencia:</span>
                <span
                  className={`font-extrabold px-2 py-0.5 rounded text-sm ${
                    !tieneDiferencia
                      ? 'bg-emerald-100 text-emerald-800'
                      : diferencia > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {!tieneDiferencia ? 'Cuadrado ($0.00)' : (diferencia > 0 ? `+${formatMoney(diferencia)} (Excedente)` : `${formatMoney(diferencia)} (Faltante)`)}
                </span>
              </div>

              {/* Acciones Rápidas si hay diferencia */}
              {tieneDiferencia && canOperate && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Generar Movimiento por Diferencia:
                  </span>
                  {diferencia > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAbrirOperacionDiferencia('ENTRADA')}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <ArrowDownRight className="w-4 h-4 text-emerald-200" />
                      <span>Generar Entrada (+{formatMoney(diferencia)})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAbrirOperacionDiferencia('SALIDA')}
                      className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-200" />
                      <span>Generar Salida (-{formatMoney(Math.abs(diferencia))})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAbrirOperacionDiferencia(diferencia >= 0 ? 'ENTRADA' : 'SALIDA')}
                    className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-lg border border-slate-300 transition flex items-center justify-center space-x-1"
                  >
                    <span>Elegir otro tipo (Entrada / Salida / Ajuste)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observaciones del Conteo
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas sobre el conteo físico, condiciones, etc."
                rows={2}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Botón de Confirmación / Guardar */}
            <button
              type="button"
              onClick={handleAbrirConfirmModal}
              className="mt-5 w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Confirmar y Guardar Conteo</span>
            </button>
          </div>

          {/* Historial de Conteos Previos de esta Caja */}
          {conteosPrevios.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Últimos Conteos en {cajaSeleccionada?.nombre}</span>
              </h4>

              <div className="space-y-2 text-xs">
                {conteosPrevios.map((c) => (
                  <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between hover:border-amber-300 transition">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {new Date(c.fechaConteo).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-slate-500">Por {c.usuarioNombre}</p>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatMoney(c.saldoContado)}</p>
                        <span className={`text-[10px] font-bold block ${Math.abs(c.diferencia) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          Dif: {formatMoney(c.diferencia)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCargarConteoHistorico(c)}
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold rounded transition"
                        title="Cargar estas cantidades en el formulario"
                      >
                        Cargar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Confirmation Modal (Section 3.4 & 3.5) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Confirmación de Conteo Físico</h3>
                <p className="text-xs text-amber-400 font-medium">{cajaSeleccionada?.nombre}</p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Saldo Esperado (Sistema):</span>
                  <p className="text-base font-bold text-slate-900">{formatMoney(saldoEsperado)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Saldo Contado (Físico):</span>
                  <p className="text-base font-bold text-slate-900">{formatMoney(saldoContado)}</p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
                  !tieneDiferencia
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {!tieneDiferencia ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  <span className="font-semibold">
                    {!tieneDiferencia ? 'El conteo cuadra exactamente.' : `Existe una diferencia de ${formatMoney(diferencia)}.`}
                  </span>
                </div>
              </div>

              {/* Si hay diferencia, mostrar opciones de conciliación */}
              {tieneDiferencia && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Tratamiento de la diferencia:
                  </h4>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="opcionDiferencia"
                        checked={!aplicarAjuste}
                        onChange={() => setAplicarAjuste(false)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        <strong>Guardar conteo sin modificar saldo:</strong> Registra la verificación física y documenta la diferencia sin alterar el saldo contable de la caja.
                      </span>
                    </label>

                    {isAdmin && (
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="opcionDiferencia"
                          checked={aplicarAjuste}
                          onChange={() => setAplicarAjuste(true)}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                          <strong>Conciliar saldo contable y registrar movimiento:</strong> Ajusta el saldo de la caja a lo contado y crea una operación contable bajo el tipo y concepto que elijas.
                        </span>
                      </label>
                    )}
                  </div>

                  {aplicarAjuste && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-3 animate-in fade-in">
                      {/* Selector de Tipo de Movimiento */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          1. Tipo de Movimiento a Registrar:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTipoMovimientoConteo('ENTRADA');
                              if (!conceptoConteo || conceptoConteo.includes('Faltante') || conceptoConteo.includes('Ajuste')) {
                                setConceptoConteo('Sobrante en conteo físico');
                              }
                            }}
                            className={`py-2 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center space-x-1 ${
                              tipoMovimientoConteo === 'ENTRADA'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                            }`}
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>ENTRADA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTipoMovimientoConteo('SALIDA');
                              if (!conceptoConteo || conceptoConteo.includes('Sobrante') || conceptoConteo.includes('Ajuste')) {
                                setConceptoConteo('Faltante en conteo físico');
                              }
                            }}
                            className={`py-2 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center space-x-1 ${
                              tipoMovimientoConteo === 'SALIDA'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50'
                            }`}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>SALIDA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTipoMovimientoConteo('AJUSTE');
                              if (!conceptoConteo || conceptoConteo.includes('Sobrante') || conceptoConteo.includes('Faltante')) {
                                setConceptoConteo('Ajuste por conteo físico');
                              }
                            }}
                            className={`py-2 px-2 text-xs font-bold rounded-lg border transition flex items-center justify-center space-x-1 ${
                              tipoMovimientoConteo === 'AJUSTE'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>AJUSTE</span>
                          </button>
                        </div>
                      </div>

                      {/* Concepto del Movimiento con Sugerencias Rápidas */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800">
                            2. Concepto del Movimiento *
                          </label>
                          <span className="text-[10px] text-slate-500">Haz clic en una opción o escribe libremente</span>
                        </div>

                        {/* Pills de sugerencias según el tipo seleccionado */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {tipoMovimientoConteo === 'ENTRADA' && (
                            <>
                              {['Sobrante en conteo físico', 'Ofrenda / Diezmo', 'Donación', 'Venta de evento', 'Recuperación'].map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => setConceptoConteo(sug)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                                    conceptoConteo === sug
                                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {sug}
                                </button>
                              ))}
                            </>
                          )}
                          {tipoMovimientoConteo === 'SALIDA' && (
                            <>
                              {['Faltante en conteo físico', 'Gasto operativo menor', 'Comisión', 'Ajuste de caja', 'Retiro'].map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => setConceptoConteo(sug)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                                    conceptoConteo === sug
                                      ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {sug}
                                </button>
                              ))}
                            </>
                          )}
                          {tipoMovimientoConteo === 'AJUSTE' && (
                            <>
                              {['Ajuste por conteo físico', 'Cuadre de caja', 'Corrección contable', 'Alineación de inventario'].map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => setConceptoConteo(sug)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                                    conceptoConteo === sug
                                      ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {sug}
                                </button>
                              ))}
                            </>
                          )}
                        </div>

                        <input
                          type="text"
                          required
                          value={conceptoConteo}
                          onChange={(e) => setConceptoConteo(e.target.value)}
                          placeholder="Escribe el concepto del movimiento..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      {/* Motivo / Justificación */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          3. Explicación o Justificación del Movimiento *
                        </label>
                        <input
                          type="text"
                          required
                          value={motivoAjuste}
                          onChange={(e) => setMotivoAjuste(e.target.value)}
                          placeholder="Ej. Diferencia identificada durante el conteo físico de la caja."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-500">
                Usuario responsable: <span className="font-semibold text-slate-700">{user?.nombre}</span> ({user?.rol})
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs"
              >
                Volver a revisar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleGuardarConteo}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow transition flex items-center space-x-1.5"
              >
                {saving ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Registrar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración / Creación de Bolsa con Auto-cálculo de Monedas */}
      {showBolsaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-base">
                    {editingBolsa ? 'Configurar Bolsa de Monedas' : 'Nueva Bolsa de Monedas'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Asignada a: {cajaSeleccionada?.nombre || 'Esta caja'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBolsaModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Paso 1: ¿Qué moneda es? */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. ¿Qué moneda contiene la bolsa?
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {monedasDisponibles.map((m) => {
                    const selected = bolsaDenomId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectDenominacion(m.id)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        <Coins className={`w-3.5 h-3.5 mb-1 ${selected ? 'text-amber-300' : 'text-slate-400'}`} />
                        <span>${m.valor.toFixed(m.valor < 1 ? 2 : 0)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: Importe en Pesos o Cantidad de Monedas con auto-cálculo */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calculator className="w-3.5 h-3.5 text-blue-700" />
                    <span>2. Cálculo automático de monedas</span>
                  </span>
                  <span className="text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">
                    Bidireccional
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Importe Total ($ Pesos):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={bolsaValorTotal}
                        onChange={(e) => handleChangeValorTotal(e.target.value)}
                        placeholder="Ej. 100"
                        className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cantidad de monedas:
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={bolsaCantidadMonedas}
                      onChange={(e) => handleChangeCantidadMonedas(e.target.value)}
                      placeholder="Ej. 20"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-white/90 rounded-lg border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Resultado:</span>
                  <span className="font-extrabold text-blue-800">
                    {bolsaCantidadMonedas || '0'} monedas de ${monedasDisponibles.find(m => m.id === bolsaDenomId)?.valor.toFixed(2) || '0.00'} = ${parseFloat(bolsaValorTotal || '0').toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Paso 3: Nombre y Descripción */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de la Bolsa:
                  </label>
                  <input
                    type="text"
                    value={bolsaNombre}
                    onChange={(e) => setBolsaNombre(e.target.value)}
                    placeholder="Ej. Bolsa de monedas de $5"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción:
                  </label>
                  <input
                    type="text"
                    value={bolsaDescripcion}
                    onChange={(e) => setBolsaDescripcion(e.target.value)}
                    placeholder="Ej. 20 monedas de $5.00"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBolsaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveBolsaModal}
                  disabled={savingBolsa}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingBolsa ? 'Guardando...' : (editingBolsa ? 'Actualizar Bolsa' : 'Crear Bolsa')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Directo: Registrar Operación desde Conteo (Entrada / Salida / Ajuste) */}
      {showOperacionDiferenciaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                tipoOperacionDiferencia === 'ENTRADA'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
                  : tipoOperacionDiferencia === 'SALIDA'
                  ? 'bg-gradient-to-r from-rose-700 to-red-800'
                  : 'bg-gradient-to-r from-amber-700 to-orange-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                {tipoOperacionDiferencia === 'ENTRADA' && <ArrowDownRight className="w-5 h-5 text-emerald-300" />}
                {tipoOperacionDiferencia === 'SALIDA' && <ArrowUpRight className="w-5 h-5 text-rose-300" />}
                {tipoOperacionDiferencia === 'AJUSTE' && <RotateCcw className="w-5 h-5 text-amber-300" />}
                <div>
                  <h3 className="font-bold text-base">
                    Registrar Movimiento en {cajaSeleccionada?.nombre}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Generado a partir del conteo físico de efectivo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOperacionDiferenciaModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Paso 1: Tipo de Movimiento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Selecciona el Tipo de Movimiento:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoOperacionDiferencia('ENTRADA');
                      if (!conceptoDiferencia || conceptoDiferencia.includes('Faltante') || conceptoDiferencia.includes('Ajuste')) {
                        setConceptoDiferencia(diferencia > 0 ? 'Sobrante en conteo físico' : 'Ofrenda / Diezmo');
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center space-x-1.5 ${
                      tipoOperacionDiferencia === 'ENTRADA'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>ENTRADA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoOperacionDiferencia('SALIDA');
                      if (!conceptoDiferencia || conceptoDiferencia.includes('Sobrante') || conceptoDiferencia.includes('Ajuste')) {
                        setConceptoDiferencia(diferencia < 0 ? 'Faltante en conteo físico' : 'Gasto operativo menor');
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center space-x-1.5 ${
                      tipoOperacionDiferencia === 'SALIDA'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>SALIDA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoOperacionDiferencia('AJUSTE');
                      if (!conceptoDiferencia || conceptoDiferencia.includes('Sobrante') || conceptoDiferencia.includes('Faltante')) {
                        setConceptoDiferencia('Ajuste por conteo físico');
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center space-x-1.5 ${
                      tipoOperacionDiferencia === 'AJUSTE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>AJUSTE</span>
                  </button>
                </div>
              </div>

              {/* Paso 2: Importe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Importe a Registrar ($ MXN):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={montoDiferencia}
                    onChange={(e) => setMontoDiferencia(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Diferencia detectada en conteo: {diferencia > 0 ? `+${formatMoney(diferencia)} (Sobrante)` : `${formatMoney(diferencia)} (Faltante)`}
                </p>
              </div>

              {/* Paso 3: Concepto del Movimiento con Sugerencias Rápidas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Concepto del Movimiento:
                  </label>
                  <span className="text-[10px] text-slate-500">Sugerencias rápidas</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tipoOperacionDiferencia === 'ENTRADA' && (
                    <>
                      {['Sobrante en conteo físico', 'Ofrenda dominical', 'Donación voluntaria', 'Venta de evento', 'Recuperación'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setConceptoDiferencia(sug)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                            conceptoDiferencia === sug
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </>
                  )}
                  {tipoOperacionDiferencia === 'SALIDA' && (
                    <>
                      {['Faltante en conteo físico', 'Gasto operativo menor', 'Comisión bancaria', 'Ajuste de caja', 'Retiro temporal'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setConceptoDiferencia(sug)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                            conceptoDiferencia === sug
                              ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </>
                  )}
                  {tipoOperacionDiferencia === 'AJUSTE' && (
                    <>
                      {['Ajuste por conteo físico', 'Cuadre de caja', 'Corrección contable', 'Alineación de inventario'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setConceptoDiferencia(sug)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                            conceptoDiferencia === sug
                              ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={conceptoDiferencia}
                  onChange={(e) => setConceptoDiferencia(e.target.value)}
                  placeholder="Escribe el nombre o concepto de la operación..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Paso 4: Descripción y Observaciones */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    4. Descripción Detallada:
                  </label>
                  <input
                    type="text"
                    value={descripcionDiferencia}
                    onChange={(e) => setDescripcionDiferencia(e.target.value)}
                    placeholder="Descripción para auditoría o comprobante..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    5. Observaciones adicionales (Opcional):
                  </label>
                  <input
                    type="text"
                    value={observacionesDiferencia}
                    onChange={(e) => setObservacionesDiferencia(e.target.value)}
                    placeholder="Notas extras, personas involucradas, etc."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer Acciones */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOperacionDiferenciaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarOperacionDiferencia}
                  disabled={submittingOperacion}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50 ${
                    tipoOperacionDiferencia === 'ENTRADA'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : tipoOperacionDiferencia === 'SALIDA'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {submittingOperacion
                      ? 'Registrando...'
                      : `Registrar ${tipoOperacionDiferencia} (${formatMoney(montoDiferencia)})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
