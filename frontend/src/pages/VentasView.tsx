import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  Clock,
  Ban,
  Search,
  Filter,
  ArrowLeft,
  X,
  CreditCard,
  Banknote,
  AlertTriangle,
  Building2,
  Trash2,
  Pencil,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { VentaResumen, VentaDetalle, VentaProducto, Pedido, Caja } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface VentasViewProps {
  cajas: Caja[];
  onEntradaRealizada?: () => void;
}

export const VentasView: React.FC<VentasViewProps> = ({ cajas, onEntradaRealizada }) => {
  const { canAccessModule } = useAuth();
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null);
  const [ventaDetalle, setVentaDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Modales
  const [showNuevaVentaModal, setShowNuevaVentaModal] = useState(false);
  const [nuevaVentaNombre, setNuevaVentaNombre] = useState('');
  const [nuevaVentaFecha, setNuevaVentaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [creandoVenta, setCreandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  // Modal: Producto
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [prodEditId, setProdEditId] = useState<number | null>(null);
  const [prodNombre, setProdNombre] = useState('');
  const [prodDescripcion, setProdDescripcion] = useState('');
  const [presentaciones, setPresentaciones] = useState<{ id?: number; nombre: string; precio: number; orden: number }[]>([
    { nombre: 'Individual', precio: 0, orden: 1 },
  ]);
  const [guardandoProd, setGuardandoProd] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);

  // Modal: Nuevo / Editar Pedido
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [pedidoEditId, setPedidoEditId] = useState<number | null>(null);
  const [pedidoEditFolio, setPedidoEditFolio] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [pedidoObs, setPedidoObs] = useState('');
  const [estadoEntregaInicial, setEstadoEntregaInicial] = useState('PENDIENTE');
  const [cartItems, setCartItems] = useState<{ ventaPresentacionId: number; cantidad: number }[]>([]);
  const [pagoEfectivo, setPagoEfectivo] = useState<number>(0);
  const [pagoTransferencia, setPagoTransferencia] = useState<number>(0);
  const [pagoPendiente, setPagoPendiente] = useState<boolean>(false);
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const [pedidoError, setPedidoError] = useState<string | null>(null);

  // Modal: Realizar Entrada
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [cajaEfectivoDestinoId, setCajaEfectivoDestinoId] = useState<number>(() => {
    const efCajas = cajas.filter((c) => c.activa && c.tipo !== 'TRANSFERENCIAS');
    return efCajas.length > 0 ? efCajas[0].id : 0;
  });
  const [realizandoEntrada, setRealizandoEntrada] = useState(false);
  const [entradaError, setEntradaError] = useState<string | null>(null);

  // Filtro de pedidos
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busquedaPedido, setBusquedaPedido] = useState<string>('');

  // Cambio rápido cíclico de método de pago
  const updatingPagoLockRef = useRef<Set<number>>(new Set());
  const [updatingPagoPedidoId, setUpdatingPagoPedidoId] = useState<number | null>(null);
  const [pagoRapidoError, setPagoRapidoError] = useState<string | null>(null);
  const canEditVentas = canAccessModule('ventas');

  const loadVentas = async () => {
    try {
      setLoading(true);
      const data = await api.getVentas();
      setVentas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadVentaDetalle = async (id: number) => {
    try {
      setLoadingDetalle(true);
      const data = await api.getVentaById(id);
      setVentaDetalle(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => {
    loadVentas();
  }, []);

  useEffect(() => {
    if (selectedVentaId) {
      loadVentaDetalle(selectedVentaId);
    }
  }, [selectedVentaId]);

  const handleCreateVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaVentaNombre.trim()) {
      setErrorVenta('El nombre de la venta es requerido.');
      return;
    }
    setCreandoVenta(true);
    setErrorVenta(null);
    try {
      const v = await api.createVenta({
        nombre: nuevaVentaNombre.trim(),
        fechaVenta: nuevaVentaFecha,
      });
      setShowNuevaVentaModal(false);
      setNuevaVentaNombre('');
      await loadVentas();
      setSelectedVentaId(v.id);
    } catch (err: any) {
      setErrorVenta(err.message || 'Error al crear la venta.');
    } finally {
      setCreandoVenta(false);
    }
  };

  // --- Handlers de Productos ---
  const handleOpenAddProducto = () => {
    setProdEditId(null);
    setProdNombre('');
    setProdDescripcion('');
    setPresentaciones([{ nombre: 'Individual', precio: 0, orden: 1 }]);
    setProdError(null);
    setShowProductoModal(true);
  };

  const handleOpenEditProducto = (p: VentaProducto) => {
    setProdEditId(p.id);
    setProdNombre(p.nombre);
    setProdDescripcion(p.descripcion || '');
    setPresentaciones(
      p.presentaciones.map((pr) => ({
        id: pr.id,
        nombre: pr.nombre,
        precio: pr.precio,
        orden: pr.orden,
      }))
    );
    setProdError(null);
    setShowProductoModal(true);
  };

  const handleAddPresentacionFila = () => {
    setPresentaciones([
      ...presentaciones,
      { nombre: '', precio: 0, orden: presentaciones.length + 1 },
    ]);
  };

  const handleRemovePresentacionFila = (index: number) => {
    if (presentaciones.length <= 1) return;
    setPresentaciones(presentaciones.filter((_, i) => i !== index));
  };

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVentaId) return;
    if (!prodNombre.trim()) {
      setProdError('El nombre del producto es obligatorio.');
      return;
    }
    for (const pr of presentaciones) {
      if (!pr.nombre.trim()) {
        setProdError('Todas las presentaciones deben tener un nombre.');
        return;
      }
      if (pr.precio < 0) {
        setProdError('El precio no puede ser negativo.');
        return;
      }
    }

    setGuardandoProd(true);
    setProdError(null);
    try {
      await api.saveProducto(selectedVentaId, prodEditId, {
        nombre: prodNombre.trim(),
        descripcion: prodDescripcion.trim(),
        orden: 0,
        presentaciones: presentaciones.map((pr, i) => ({
          id: pr.id,
          nombre: pr.nombre.trim(),
          precio: Number(pr.precio),
          orden: i + 1,
        })),
      });
      setShowProductoModal(false);
      loadVentaDetalle(selectedVentaId);
    } catch (err: any) {
      setProdError(err.message || 'Error al guardar el producto.');
    } finally {
      setGuardandoProd(false);
    }
  };

  const handleDeleteProducto = async (productoId: number) => {
    if (!selectedVentaId || !confirm('¿Deseas eliminar este producto de la venta?')) return;
    try {
      await api.deleteProducto(selectedVentaId, productoId);
      loadVentaDetalle(selectedVentaId);
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el producto.');
    }
  };

  // --- Handlers de Pedidos ---
  const handleOpenNuevoPedido = () => {
    if (!ventaDetalle || !ventaDetalle.productos.length) {
      alert('Primero debes agregar al menos un producto a la venta.');
      return;
    }
    setPedidoEditId(null);
    setPedidoEditFolio(null);
    setClienteNombre('');
    setPedidoObs('');
    setEstadoEntregaInicial('PENDIENTE');
    setCartItems([]);
    setPagoEfectivo(0);
    setPagoTransferencia(0);
    setPagoPendiente(false);
    setPedidoError(null);
    setShowPedidoModal(true);
  };

  const handleOpenEditarPedido = (ped: Pedido) => {
    setPedidoEditId(ped.id);
    setPedidoEditFolio(ped.folio);
    setClienteNombre(ped.nombreCliente || '');
    setPedidoObs(ped.observaciones || '');
    setEstadoEntregaInicial(ped.estadoEntrega);
    setCartItems(
      ped.detalles.map((d) => ({
        ventaPresentacionId: d.ventaPresentacionId || 0,
        cantidad: d.cantidad,
      }))
    );
    const ef = ped.pagos.find((p) => p.metodoPago === 'EFECTIVO');
    const tr = ped.pagos.find((p) => p.metodoPago === 'TRANSFERENCIA');
    setPagoEfectivo(ef ? ef.importe : 0);
    setPagoTransferencia(tr ? tr.importe : 0);
    setPagoPendiente(ped.estadoPago === 'PENDIENTE' || (!ef && !tr));
    setPedidoError(null);
    setShowPedidoModal(true);
  };

  const handleAddToCart = (presentacionId: number) => {
    const existing = cartItems.find((i) => i.ventaPresentacionId === presentacionId);
    if (existing) {
      setCartItems(
        cartItems.map((i) =>
          i.ventaPresentacionId === presentacionId ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      );
    } else {
      setCartItems([...cartItems, { ventaPresentacionId: presentacionId, cantidad: 1 }]);
    }
  };

  const handleUpdateCartQuantity = (presentacionId: number, cant: number) => {
    if (cant <= 0) {
      setCartItems(cartItems.filter((i) => i.ventaPresentacionId !== presentacionId));
    } else {
      setCartItems(
        cartItems.map((i) =>
          i.ventaPresentacionId === presentacionId ? { ...i, cantidad: cant } : i
        )
      );
    }
  };

  // Calcular total carrito
  const calcularTotalCarrito = () => {
    if (!ventaDetalle) return 0;
    let total = 0;
    for (const item of cartItems) {
      for (const p of ventaDetalle.productos) {
        const pr = p.presentaciones.find((x) => x.id === item.ventaPresentacionId);
        if (pr) {
          total += pr.precio * item.cantidad;
          break;
        }
      }
    }
    return total;
  };

  const handleAutoCompletarPagoEfectivo = () => {
    const total = calcularTotalCarrito();
    setPagoEfectivo(total);
    setPagoTransferencia(0);
    setPagoPendiente(false);
  };

  const handleAutoCompletarPagoTransferencia = () => {
    const total = calcularTotalCarrito();
    setPagoTransferencia(total);
    setPagoEfectivo(0);
    setPagoPendiente(false);
  };

  const handleSetPagoPendiente = () => {
    setPagoPendiente(true);
    setPagoEfectivo(0);
    setPagoTransferencia(0);
  };

  const handleSavePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVentaId) return;
    if (!cartItems.length) {
      setPedidoError('Debes seleccionar al menos un producto para el pedido.');
      return;
    }

    const total = calcularTotalCarrito();
    const sumaPagos = Number(pagoEfectivo || 0) + Number(pagoTransferencia || 0);

    if (sumaPagos > total) {
      setPedidoError(`La suma de pagos ($${sumaPagos.toFixed(2)}) no puede exceder el total ($${total.toFixed(2)}).`);
      return;
    }

    const pagosList: { metodoPago: string; importe: number }[] = [];
    if (pagoEfectivo > 0) {
      pagosList.push({ metodoPago: 'EFECTIVO', importe: Number(pagoEfectivo) });
    }
    if (pagoTransferencia > 0) {
      pagosList.push({ metodoPago: 'TRANSFERENCIA', importe: Number(pagoTransferencia) });
    }

    setGuardandoPedido(true);
    setPedidoError(null);
    try {
      if (pedidoEditId) {
        await api.updatePedido(selectedVentaId, pedidoEditId, {
          nombreCliente: clienteNombre.trim(),
          observaciones: pedidoObs.trim(),
          estadoEntrega: estadoEntregaInicial,
          items: cartItems,
          pagos: pagosList,
        });
      } else {
        await api.createPedido(selectedVentaId, {
          nombreCliente: clienteNombre.trim(),
          observaciones: pedidoObs.trim(),
          estadoEntrega: estadoEntregaInicial,
          items: cartItems,
          pagos: pagosList,
        });
      }
      setShowPedidoModal(false);
      setPedidoEditId(null);
      setPedidoEditFolio(null);
      loadVentaDetalle(selectedVentaId);
      loadVentas();
    } catch (err: any) {
      setPedidoError(err.message || 'Error al guardar pedido.');
    } finally {
      setGuardandoPedido(false);
    }
  };

  const handleToggleEstadoEntrega = async (pedidoId: number, estadoActual: string) => {
    if (!selectedVentaId || ventaDetalle?.estado === 'CERRADA' || estadoActual === 'CANCELADO') return;
    const nuevoEstado = estadoActual === 'ENTREGADO' ? 'PENDIENTE' : 'ENTREGADO';
    try {
      await api.updateEstadoEntrega(selectedVentaId, pedidoId, nuevoEstado);
      loadVentaDetalle(selectedVentaId);
    } catch (err: any) {
      alert(err.message || 'No se pudo actualizar el estado.');
    }
  };

  const getNextMetodoPago = (ped: Pedido): 'PENDIENTE' | 'EFECTIVO' | 'TRANSFERENCIA' => {
    if (ped.pagos.length === 0 || ped.estadoPago === 'PENDIENTE') {
      return 'EFECTIVO';
    }
    const metodoActual = ped.pagos[0]?.metodoPago;
    if (metodoActual === 'EFECTIVO') {
      return 'TRANSFERENCIA';
    }
    // Desde TRANSFERENCIA regresa a PENDIENTE (si tiene pago parcial, alterna a EFECTIVO)
    return ped.estadoPago === 'PARCIAL' ? 'EFECTIVO' : 'PENDIENTE';
  };

  const handleCycleMetodoPago = async (ped: Pedido) => {
    if (!selectedVentaId || !ventaDetalle || ventaDetalle.estado === 'CERRADA' || ped.estadoEntrega === 'CANCELADO') return;
    if (!canEditVentas) return;
    if (updatingPagoLockRef.current.has(ped.id)) return;

    const nuevoMetodo = getNextMetodoPago(ped);
    updatingPagoLockRef.current.add(ped.id);
    setPagoRapidoError(null);

    const snapshotPrevio = ventaDetalle;
    setUpdatingPagoPedidoId(ped.id);

    // Actualización optimista conservando pagos parciales si aplica
    setVentaDetalle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pedidos: prev.pedidos.map((p) => {
          if (p.id !== ped.id) return p;
          if (p.estadoPago === 'PARCIAL') {
            if (nuevoMetodo === 'PENDIENTE') return p;
            const sumaActual = p.pagos.reduce((acc, x) => acc + x.importe, 0);
            return {
              ...p,
              estadoPago: 'PARCIAL',
              pagos: sumaActual > 0 ? [{ id: 0, pedidoId: p.id, metodoPago: nuevoMetodo, importe: sumaActual, fechaPago: new Date().toISOString() }] : p.pagos,
            };
          }
          if (nuevoMetodo === 'PENDIENTE') {
            return { ...p, estadoPago: 'PENDIENTE', pagos: [] };
          }
          return {
            ...p,
            estadoPago: p.totalPedido > 0 ? 'PAGADO' : 'PENDIENTE',
            pagos: p.totalPedido > 0 ? [{ id: 0, pedidoId: p.id, metodoPago: nuevoMetodo, importe: p.totalPedido, fechaPago: new Date().toISOString() }] : [],
          };
        }),
      };
    });

    try {
      await api.updateMetodoPagoRapido(selectedVentaId, ped.id, nuevoMetodo);
      await loadVentaDetalle(selectedVentaId);
      loadVentas();
    } catch (err: any) {
      // Restaurar estado anterior si falla el guardado
      setVentaDetalle(snapshotPrevio);
      setPagoRapidoError(err.message || 'No se pudo actualizar el método de pago.');
    } finally {
      updatingPagoLockRef.current.delete(ped.id);
      setUpdatingPagoPedidoId((curr) => (curr === ped.id ? null : curr));
    }
  };

  const renderMetodoPagoButton = (ped: Pedido) => {
    if (!ventaDetalle) return null;
    const canQuickEditPago = canEditVentas && ventaDetalle.estado === 'ABIERTA' && ped.estadoEntrega !== 'CANCELADO';
    const isUpdating = updatingPagoPedidoId === ped.id;

    return (
      <button
        type="button"
        disabled={!canQuickEditPago || isUpdating}
        onClick={() => canQuickEditPago && handleCycleMetodoPago(ped)}
        title={
          canQuickEditPago
            ? 'Toca para cambiar método de pago (Pendiente → Efectivo → Transferencia)'
            : 'Método de pago'
        }
        className={`inline-flex flex-wrap items-center gap-1 rounded-lg px-2 py-1.5 sm:px-1.5 sm:py-1 text-left transition touch-manipulation ${
          canQuickEditPago
            ? 'hover:bg-slate-100 active:scale-95 cursor-pointer ring-1 ring-slate-200 hover:ring-slate-300'
            : 'cursor-default'
        } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {ped.pagos.length === 0 ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Pendiente de pago
          </span>
        ) : (
          ped.pagos.map((pg, i) => (
            <span
              key={i}
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                pg.metodoPago === 'EFECTIVO'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {pg.metodoPago}: ${pg.importe.toFixed(2)}
            </span>
          ))
        )}
        {ped.estadoPago === 'PARCIAL' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            PARCIAL
          </span>
        )}
        {canQuickEditPago && (
          <span className="text-[10px] font-bold text-slate-400 ml-0.5" aria-hidden="true">
            {isUpdating ? '…' : '↻'}
          </span>
        )}
      </button>
    );
  };

  const handleCancelarPedido = async (pedidoId: number, folio: number) => {
    if (!selectedVentaId || ventaDetalle?.estado === 'CERRADA') return;
    if (!confirm(`¿Estás seguro de cancelar el pedido #${folio}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.cancelarPedido(selectedVentaId, pedidoId);
      loadVentaDetalle(selectedVentaId);
      loadVentas();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar pedido.');
    }
  };

  // --- Realizar Entrada ---
  const handleOpenRealizarEntrada = () => {
    if (!ventaDetalle) return;
    if (ventaDetalle.metricas.totalEfectivo <= 0 && ventaDetalle.metricas.totalTransferencia <= 0) {
      alert('No hay importes cobrados en efectivo o transferencia para ingresar a Tesorería.');
      return;
    }
    const efCajas = cajas.filter((c) => c.activa && c.tipo !== 'TRANSFERENCIAS');
    if (efCajas.length > 0 && !cajaEfectivoDestinoId) {
      setCajaEfectivoDestinoId(efCajas[0].id);
    }
    setEntradaError(null);
    setShowEntradaModal(true);
  };

  const handleConfirmarEntrada = async () => {
    if (!selectedVentaId) return;
    setRealizandoEntrada(true);
    setEntradaError(null);
    try {
      const res = await api.realizarEntradaVenta(selectedVentaId, cajaEfectivoDestinoId);
      alert(res.mensaje);
      setShowEntradaModal(false);
      loadVentaDetalle(selectedVentaId);
      loadVentas();
      if (onEntradaRealizada) onEntradaRealizada();
    } catch (err: any) {
      setEntradaError(err.message || 'Error al realizar la entrada a Tesorería.');
    } finally {
      setRealizandoEntrada(false);
    }
  };

  // --- FILTROS DE PEDIDOS ---
  const pedidosFiltrados = ventaDetalle?.pedidos.filter((p) => {
    if (filtroEstado !== 'TODOS' && p.estadoEntrega !== filtroEstado) return false;
    if (busquedaPedido.trim()) {
      const q = busquedaPedido.toLowerCase();
      const matchFolio = p.folio.toString().includes(q);
      const matchCliente = p.nombreCliente?.toLowerCase().includes(q);
      const matchProd = p.detalles.some((d) => d.productoNombre.toLowerCase().includes(q));
      if (!matchFolio && !matchCliente && !matchProd) return false;
    }
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* VISTA 1: LISTADO DE VENTAS EN TARJETAS */}
      {!selectedVentaId && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <span>Gestión de Ventas y Pedidos</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea jornadas de venta, configura productos independientes y registra pedidos con ingresos a Tesorería.
              </p>
            </div>
            <button
              onClick={() => setShowNuevaVentaModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Venta</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Cargando jornadas de venta...</div>
          ) : ventas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No hay ventas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Inicia una nueva jornada o evento comercial para comenzar a registrar productos y pedidos.
              </p>
              <button
                onClick={() => setShowNuevaVentaModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Crear Primera Venta</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ventas.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVentaId(v.id)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition cursor-pointer p-5 flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(v.fechaVenta).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          v.estado === 'ABIERTA'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {v.estado === 'ABIERTA' ? '● Abierta' : 'Cerrada'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition">
                      {v.nombre}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pedidos</span>
                      <span className="text-sm font-bold text-slate-800">{v.totalPedidos}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Vendido</span>
                      <span className="text-sm font-bold text-slate-900">${v.totalVendido.toFixed(2)}</span>
                    </div>
                  </div>

                  {v.productosVendidos && v.productosVendidos.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Productos Vendidos</span>
                      <div className="flex flex-wrap gap-1.5">
                        {v.productosVendidos.map((pv, idx) => (
                          <span
                            key={`${pv.productoId ?? pv.productoNombre}-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900"
                          >
                            <span>{pv.productoNombre}:</span>
                            <strong className="font-black">{pv.cantidadTotal}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-[11px] font-bold text-amber-600 group-hover:translate-x-0.5 transition">
                    <span>Administrar pedidos y productos</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: DETALLE Y ADMINISTRACIÓN DE UNA VENTA ESPECÍFICA */}
      {selectedVentaId && ventaDetalle && (
        <div className="space-y-6">
          {/* Barra superior de navegación interna */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedVentaId(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-xs flex items-center space-x-1"
                title="Volver a lista de ventas"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-900">{ventaDetalle.nombre}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ventaDetalle.estado === 'ABIERTA'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {ventaDetalle.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha: {new Date(ventaDetalle.fechaVenta).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {ventaDetalle.estado === 'ABIERTA' && (
                <>
                  <button
                    onClick={handleOpenAddProducto}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Package className="w-4 h-4 text-slate-600" />
                    <span>Configurar Productos</span>
                  </button>

                  <button
                    onClick={handleOpenNuevoPedido}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Pedido</span>
                  </button>

                  {canAccessModule('entradas') && (
                    <button
                      onClick={handleOpenRealizarEntrada}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Realizar Entrada</span>
                    </button>
                  )}
                </>
              )}

              {ventaDetalle.estado === 'CERRADA' && (
                <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-xl text-xs text-slate-600 font-medium">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>Venta Cerrada e Ingresada a Tesorería</span>
                </div>
              )}
            </div>
          </div>

          {/* TARJETAS DE RESUMEN VISUAL (Sección 7) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pedidos</span>
              <span className="text-lg font-black text-slate-800">{ventaDetalle.metricas.totalPedidos}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pendientes</span>
              <span className="text-lg font-black text-amber-700">{ventaDetalle.metricas.pedidosPendientes}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Entregados</span>
              <span className="text-lg font-black text-emerald-700">{ventaDetalle.metricas.pedidosEntregados}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Cancelados</span>
              <span className="text-lg font-black text-rose-700">{ventaDetalle.metricas.pedidosCancelados}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Vendido</span>
              <span className="text-lg font-black text-slate-900">${ventaDetalle.metricas.totalVendido.toFixed(2)}</span>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Efectivo</span>
              <span className="text-lg font-black text-emerald-800">${ventaDetalle.metricas.totalEfectivo.toFixed(2)}</span>
            </div>

            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Transferencias</span>
              <span className="text-lg font-black text-blue-800">${ventaDetalle.metricas.totalTransferencia.toFixed(2)}</span>
            </div>
          </div>

          {/* DESGLOSE DE UNIDADES VENDIDAS POR PRODUCTO */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Desglose de Productos Vendidos</span>
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>
                  Pedidos: <strong className="text-slate-900">{ventaDetalle.metricas.totalPedidos}</strong>
                  {ventaDetalle.metricas.pedidosCancelados > 0 && (
                    <span className="text-slate-400 ml-1">({ventaDetalle.metricas.totalPedidos - ventaDetalle.metricas.pedidosCancelados} activos)</span>
                  )}
                </span>
                <span>·</span>
                <span>
                  Total unidades:{' '}
                  <strong className="text-amber-700">
                    {(ventaDetalle.metricas.productosVendidos ?? []).reduce((sum, p) => sum + p.cantidadTotal, 0)}
                  </strong>
                </span>
              </div>
            </div>

            {(!ventaDetalle.metricas.productosVendidos || ventaDetalle.metricas.productosVendidos.length === 0) ? (
              <p className="text-xs text-slate-400 italic">
                No hay unidades vendidas registradas en pedidos activos todavía.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {ventaDetalle.metricas.productosVendidos.map((prod, idx) => (
                  <div
                    key={`${prod.productoId ?? prod.productoNombre}-${idx}`}
                    className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate" title={prod.productoNombre}>
                      {prod.productoNombre}
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-lg font-black text-amber-800">{prod.cantidadTotal}</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {prod.cantidadTotal === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TABLA DE PRODUCTOS ACTIVOS DE ESTA VENTA */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                <span>Productos y Presentaciones de esta Venta</span>
              </h3>
              {ventaDetalle.estado === 'ABIERTA' && (
                <button
                  onClick={handleOpenAddProducto}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Producto</span>
                </button>
              )}
            </div>

            {ventaDetalle.productos.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay productos agregados a esta venta todavía.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {ventaDetalle.productos.map((prod) => (
                  <div key={prod.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{prod.nombre}</span>
                      {ventaDetalle.estado === 'ABIERTA' && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditProducto(prod)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteProducto(prod.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {prod.presentaciones.map((pr) => (
                        <div key={pr.id} className="flex justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-100">
                          <span className="text-slate-600">{pr.nombre}</span>
                          <span className="font-bold text-slate-900">${pr.precio.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TABLA DE PEDIDOS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-800">Listado de Pedidos</h3>

              {/* Filtros */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 min-w-[140px] sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={busquedaPedido}
                    onChange={(e) => setBusquedaPedido(e.target.value)}
                    placeholder="Buscar folio, cliente o producto..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
                  />
                </div>

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  aria-label="Filtrar pedidos por estatus"
                  className="w-auto shrink-0 max-w-full px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-700 focus:outline-none"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="PENDIENTE">Solo Pendientes</option>
                  <option value="ENTREGADO">Solo Entregados</option>
                  <option value="CANCELADO">Solo Cancelados</option>
                </select>
              </div>
            </div>

            {pagoRapidoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{pagoRapidoError}</span>
                </div>
                <button type="button" onClick={() => setPagoRapidoError(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
              </div>
            )}

            {/* Vista Móvil en Tarjetas (< md) */}
            <div className="md:hidden p-3 space-y-3 bg-slate-50/60">
              {pedidosFiltrados.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  No se encontraron pedidos con los filtros aplicados.
                </div>
              ) : (
                pedidosFiltrados.map((ped) => (
                  <div
                    key={ped.id}
                    className={`bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5 ${
                      ped.estadoEntrega === 'CANCELADO' ? 'opacity-60 bg-slate-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-500">#{ped.folio}</span>
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {ped.nombreCliente || 'Mostrador'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {new Date(ped.fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-base font-extrabold text-slate-900 shrink-0">
                        ${ped.totalPedido.toFixed(2)}
                      </span>
                    </div>

                    {/* Productos solicitados */}
                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 border border-slate-100">
                      {ped.detalles.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-slate-700 gap-2">
                          <span className="truncate">
                            <span className="font-bold text-slate-900">{d.cantidad}x</span> {d.productoNombre} ({d.presentacionNombre})
                          </span>
                          <span className="font-semibold text-slate-600 shrink-0">${d.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Pagos y Entrega */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap gap-1 items-center">
                        {renderMetodoPagoButton(ped)}
                      </div>

                      {ped.estadoEntrega === 'CANCELADO' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800">
                          Cancelado
                        </span>
                      ) : (
                        <button
                          disabled={ventaDetalle.estado === 'CERRADA'}
                          onClick={() => handleToggleEstadoEntrega(ped.id, ped.estadoEntrega)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            ped.estadoEntrega === 'ENTREGADO'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          } ${ventaDetalle.estado === 'CERRADA' ? 'cursor-default' : ''}`}
                        >
                          {ped.estadoEntrega === 'ENTREGADO' ? '✓ Entregado' : '⏳ Pendiente'}
                        </button>
                      )}
                    </div>

                    {/* Acciones */}
                    {ventaDetalle.estado === 'ABIERTA' && ped.estadoEntrega !== 'CANCELADO' && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenEditarPedido(ped)}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleCancelarPedido(ped.id, ped.folio)}
                          className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Vista Desktop/Tablet en Tabla (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Folio</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Productos Solicitados</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Método(s) de Pago</th>
                    <th className="p-3 text-center">Entrega</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No se encontraron pedidos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    pedidosFiltrados.map((ped) => (
                      <tr key={ped.id} className={`hover:bg-slate-50 ${ped.estadoEntrega === 'CANCELADO' ? 'opacity-50 bg-slate-50/50' : ''}`}>
                        <td className="p-3 font-mono font-bold text-slate-900">#{ped.folio}</td>
                        <td className="p-3 font-medium text-slate-800">{ped.nombreCliente || <span className="text-slate-400 italic">Mostrador</span>}</td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            {ped.detalles.map((d, i) => (
                              <div key={i} className="text-[11px] text-slate-700">
                                <span className="font-bold text-slate-900">{d.cantidad}x</span> {d.productoNombre} ({d.presentacionNombre})
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-900 text-sm">
                          ${ped.totalPedido.toFixed(2)}
                        </td>
                        <td className="p-3">
                          {renderMetodoPagoButton(ped)}
                        </td>
                        <td className="p-3 text-center">
                          {ped.estadoEntrega === 'CANCELADO' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Cancelado
                            </span>
                          ) : (
                            <button
                              disabled={ventaDetalle.estado === 'CERRADA'}
                              onClick={() => handleToggleEstadoEntrega(ped.id, ped.estadoEntrega)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                ped.estadoEntrega === 'ENTREGADO'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              } ${ventaDetalle.estado === 'CERRADA' ? 'cursor-default' : ''}`}
                            >
                              {ped.estadoEntrega === 'ENTREGADO' ? '✓ Entregado' : '⏳ Pendiente'}
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {ventaDetalle.estado === 'ABIERTA' && ped.estadoEntrega !== 'CANCELADO' && (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleOpenEditarPedido(ped)}
                                className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                                title="Editar Pedido"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelarPedido(ped.id, ped.folio)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Cancelar Pedido"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA VENTA */}
      {showNuevaVentaModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Crear Nueva Venta</h3>
            <p className="text-xs text-slate-500 mb-4">Define el nombre de la jornada y la fecha correspondiente.</p>

            {errorVenta && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorVenta}</span>
              </div>
            )}

            <form onSubmit={handleCreateVenta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Venta:</label>
                <input
                  type="text"
                  required
                  value={nuevaVentaNombre}
                  onChange={(e) => setNuevaVentaNombre(e.target.value)}
                  placeholder="ej. Venta Desayuno 25/11/2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de la Venta:</label>
                <input
                  type="date"
                  required
                  value={nuevaVentaFecha}
                  onChange={(e) => setNuevaVentaFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNuevaVentaModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoVenta}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {creandoVenta ? 'Creando...' : 'Crear Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTO Y PRESENTACIONES */}
      {showProductoModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {prodEditId ? 'Editar Producto' : 'Agregar Producto a esta Venta'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cada producto puede tener una o varias presentaciones y precios (ej. Hot Dog Individual $30, Combo $40).
            </p>

            {prodError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{prodError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProducto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Producto:</label>
                <input
                  type="text"
                  required
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  placeholder="ej. Hot Dog, Té, Hamburguesa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción Opcional:</label>
                <input
                  type="text"
                  value={prodDescripcion}
                  onChange={(e) => setProdDescripcion(e.target.value)}
                  placeholder="ej. Con papas y bebida"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Presentaciones y Precios:</label>
                  <button
                    type="button"
                    onClick={handleAddPresentacionFila}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Opción</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {presentaciones.map((pr, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        required
                        value={pr.nombre}
                        onChange={(e) => {
                          const copy = [...presentaciones];
                          copy[index].nombre = e.target.value;
                          setPresentaciones(copy);
                        }}
                        placeholder="Nombre (ej. Combo, Vaso grande)"
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          value={pr.precio}
                          onChange={(e) => {
                            const copy = [...presentaciones];
                            copy[index].precio = parseFloat(e.target.value) || 0;
                            setPresentaciones(copy);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-right"
                        />
                      </div>
                      {presentaciones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePresentacionFila(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductoModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoProd}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {guardandoProd ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PEDIDO */}
      {showPedidoModal && ventaDetalle && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {pedidoEditId ? `Editar Pedido #${pedidoEditFolio}` : 'Registrar Nuevo Pedido'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {pedidoEditId
                ? 'Modifica los productos, cantidades, entrega o pagos del pedido.'
                : 'Selecciona los productos y registra el cobro correspondiente.'}
            </p>

            {pedidoError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pedidoError}</span>
              </div>
            )}

            <form onSubmit={handleSavePedido} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Cliente (Opcional):</label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="ej. Juan Pérez"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado de Entrega Inicial:</label>
                  <select
                    value={estadoEntregaInicial}
                    onChange={(e) => setEstadoEntregaInicial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="PENDIENTE">⏳ Pendiente de entrega</option>
                    <option value="ENTREGADO">✓ Entregado al momento</option>
                  </select>
                </div>
              </div>

              {/* Catálogo de selección rápida de productos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Seleccionar Productos:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {ventaDetalle.productos.map((prod) =>
                    prod.presentaciones.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => handleAddToCart(pr.id)}
                        className="p-2 bg-white hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg text-left transition flex flex-col justify-between"
                      >
                        <span className="text-[11px] font-bold text-slate-800 truncate">{prod.nombre}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-500 truncate">{pr.nombre}</span>
                          <span className="text-xs font-black text-amber-700">${pr.precio.toFixed(2)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Items agregados al pedido */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle del Pedido:</label>
                {cartItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">
                    Haz clic en los productos de arriba para agregarlos a este pedido.
                  </p>
                ) : (
                  <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {cartItems.map((item) => {
                      let nombreP = '';
                      let nombrePr = '';
                      let precio = 0;
                      for (const p of ventaDetalle.productos) {
                        const pr = p.presentaciones.find((x) => x.id === item.ventaPresentacionId);
                        if (pr) {
                          nombreP = p.nombre;
                          nombrePr = pr.nombre;
                          precio = pr.precio;
                          break;
                        }
                      }
                      return (
                        <div key={item.ventaPresentacionId} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                          <div className="flex-1">
                            <span className="font-bold text-slate-900">{nombreP}</span>
                            <span className="text-slate-500 text-[11px] ml-1">({nombrePr}) - ${precio.toFixed(2)} c/u</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.ventaPresentacionId, item.cantidad - 1)}
                              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700"
                            >
                              -
                            </button>
                            <span className="font-bold w-4 text-center">{item.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.ventaPresentacionId, item.cantidad + 1)}
                              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700"
                            >
                              +
                            </button>
                            <span className="font-black text-slate-900 w-16 text-right">${(precio * item.cantidad).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total y Métodos de Pago */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Total a Cobrar:</span>
                  <span className="text-2xl font-black text-slate-900">${calcularTotalCarrito().toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-amber-200/60 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase block">Forma de Pago:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAutoCompletarPagoEfectivo}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-lg transition"
                    >
                      💵 Todo en Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoCompletarPagoTransferencia}
                      className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold rounded-lg transition"
                    >
                      💳 Toda en Transferencia
                    </button>
                    <button
                      type="button"
                      onClick={handleSetPagoPendiente}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition"
                    >
                      ⏳ Pendiente de Pago
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-emerald-800 block mb-1">Monto en Efectivo:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={pagoEfectivo}
                        onChange={(e) => setPagoEfectivo(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-blue-800 block mb-1">Monto en Transferencia:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={pagoTransferencia}
                        onChange={(e) => setPagoTransferencia(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPedidoModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPedido}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {guardandoPedido ? 'Guardando...' : (pedidoEditId ? 'Guardar Cambios' : 'Guardar Pedido')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REALIZAR ENTRADA A TESORERÍA (Sección 8 y 9) */}
      {showEntradaModal && ventaDetalle && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Realizar Entrada a Tesorería</h3>
                <p className="text-xs text-slate-500">{ventaDetalle.nombre}</p>
              </div>
            </div>

            {entradaError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{entradaError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Efectivo a ingresar:</span>
                <span className="font-bold text-emerald-700">${ventaDetalle.metricas.totalEfectivo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Transferencias a ingresar:</span>
                <span className="font-bold text-blue-700">${ventaDetalle.metricas.totalTransferencia.toFixed(2)}</span>
              </div>
              {ventaDetalle.metricas.totalPendientePago > 0 && (
                <div className="flex justify-between text-slate-400 italic">
                  <span>Pendiente de pago (No entra):</span>
                  <span>${ventaDetalle.metricas.totalPendientePago.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {ventaDetalle.metricas.totalEfectivo > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Caja de Destino para el Efectivo:
                  </label>
                  <select
                    value={cajaEfectivoDestinoId}
                    onChange={(e) => setCajaEfectivoDestinoId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {cajas
                      .filter((c) => c.activa && c.tipo !== 'TRANSFERENCIAS')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} (Saldo: ${c.saldoActual.toFixed(2)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {ventaDetalle.metricas.totalTransferencia > 0 && (
                <p className="text-[11px] text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  ℹ️ Los pagos por transferencia (${ventaDetalle.metricas.totalTransferencia.toFixed(2)}) se ingresarán automáticamente a la cuenta de <strong>Transferencias / Banco</strong>.
                </p>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                ⚠️ <strong>Aviso importante:</strong> Al realizar la entrada, los ingresos se registrarán en Tesorería y la venta pasará a estado <strong>Cerrada</strong> de forma definitiva.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEntradaModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={realizandoEntrada}
                  onClick={handleConfirmarEntrada}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {realizandoEntrada ? 'Procesando...' : 'Confirmar e Ingresar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
