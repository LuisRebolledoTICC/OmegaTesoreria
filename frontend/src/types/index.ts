export interface User {
  id: number;
  userName: string;
  nombre: string;
  rol: string;
  roles?: string[];
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export interface RolPersonalizado {
  id: number;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  modulosPermitidos: string[];
}

export interface LoginResponse {
  id?: number;
  token: string;
  userName: string;
  nombre: string;
  rol: string;
  roles?: string[];
  modulosPermitidos?: string[];
}

export interface CajaEfectivoItem {
  id: number;
  tipoEfectivo: 'Moneda' | 'Billete' | 'Bolsa';
  denominacionId?: number;
  denominacionNombre?: string;
  valorUnitario?: number;
  tipoBolsaId?: number;
  tipoBolsaNombre?: string;
  cantidad: number;
  subtotal: number;
}

export interface Caja {
  id: number;
  nombre: string;
  descripcion: string;
  finalidad: string;
  tipo?: 'EFECTIVO' | 'TRANSFERENCIAS';
  activa: boolean;
  saldoActual: number;
  fechaCreacion: string;
  creadoPor: string;
  ultimoConteoFecha?: string;
  estadoVerificacion: 'Verificado' | 'Pendiente' | 'Diferencia';
  desgloseEfectivo: CajaEfectivoItem[];
}

export interface Denominacion {
  id: number;
  tipo: 'Moneda' | 'Billete';
  valor: number;
  nombre: string;
  activa: boolean;
  ordenVisualizacion: number;
}

export interface TipoBolsa {
  id: number;
  cajaId?: number | null;
  nombre: string;
  descripcion: string;
  denominacionAsociadaId?: number | null;
  valorUnitario: number;
  activa: boolean;
  denominacionAsociada?: Denominacion | null;
}

export interface ConteoItem {
  tipoEfectivo: 'Moneda' | 'Billete' | 'Bolsa';
  denominacionId?: number;
  tipoBolsaId?: number;
  nombre: string;
  valorUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface DetalleOperacion {
  id: number;
  tipoEfectivo: 'Moneda' | 'Billete' | 'Bolsa';
  denominacionId?: number;
  denominacionNombre?: string;
  tipoBolsaId?: number;
  tipoBolsaNombre?: string;
  valorUnitarioHistorico: number;
  cantidad: number;
  subtotal: number;
}

export interface Operacion {
  id: number;
  tipoOperacion: 'CONTEO' | 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE' | 'REVERSA';
  cajaOrigenId?: number;
  cajaOrigenNombre?: string;
  cajaDestinoId?: number;
  cajaDestinoNombre?: string;
  fechaOperacion: string;
  importe: number;
  concepto: string;
  descripcion: string;
  estado: 'CONFIRMADA' | 'ANULADA';
  usuarioId: number;
  usuarioNombre: string;
  fechaRegistro: string;
  operacionRelacionadaId?: number;
  observaciones?: string;
  detalles: DetalleOperacion[];
}

export interface ConteoRegistro {
  id: number;
  cajaId: number;
  cajaNombre: string;
  fechaConteo: string;
  saldoEsperado: number;
  saldoContado: number;
  diferencia: number;
  estado: string;
  usuarioId: number;
  usuarioNombre: string;
  observaciones?: string;
  totalMonedas: number;
  totalBilletes: number;
  totalBolsas: number;
  desgloseJson: string;
}

export interface GraficaDistribucionItem {
  nombre: string;
  saldo: number;
  porcentaje: number;
}

export interface DashboardSummary {
  saldoTotal: number;
  totalCajas: number;
  cajasActivas: number;
  totalEntradas: number;
  totalSalidas: number;
  totalTransferencias: number;
  ultimoConteoGeneral?: string;
  cajasPendientesVerificacion: number;
  cajas: Caja[];
  ultimasOperaciones: Operacion[];
  distribucionCajas: GraficaDistribucionItem[];
}

export interface RespaldoInfo {
  nombreArchivo: string;
  tamanoBytes: number;
  fechaCreacion: string;
}

// --- MÓDULO VENTAS ---
export interface VentaResumen {
  id: number;
  nombre: string;
  fechaVenta: string;
  estado: 'ABIERTA' | 'CERRADA';
  fechaCreacion: string;
  creadoPor: string;
  fechaCierre?: string;
  cerradoPor?: string;
  totalPedidos: number;
  pedidosPendientes: number;
  pedidosEntregados: number;
  pedidosCancelados: number;
  totalVendido: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalPendientePago: number;
  entradaEfectivoOperacionId?: number;
  entradaTransferenciaOperacionId?: number;
}

export interface VentaPresentacion {
  id: number;
  ventaProductoId: number;
  nombre: string;
  precio: number;
  orden: number;
}

export interface VentaProducto {
  id: number;
  ventaId: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  presentaciones: VentaPresentacion[];
}

export interface PedidoDetalle {
  id: number;
  pedidoId: number;
  ventaPresentacionId?: number;
  productoNombre: string;
  presentacionNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoPago {
  id: number;
  pedidoId: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'PENDIENTE';
  importe: number;
  referencia?: string;
  fechaPago: string;
}

export interface Pedido {
  id: number;
  ventaId: number;
  folio: number;
  nombreCliente?: string;
  fechaHora: string;
  totalPedido: number;
  estadoEntrega: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';
  estadoPago: 'PAGADO' | 'PARCIAL' | 'PENDIENTE';
  observaciones?: string;
  registradoPor: string;
  detalles: PedidoDetalle[];
  pagos: PedidoPago[];
}

export interface VentaMetricas {
  totalPedidos: number;
  pedidosPendientes: number;
  pedidosEntregados: number;
  pedidosCancelados: number;
  totalVendido: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalPendientePago: number;
}

export interface VentaDetalle {
  id: number;
  nombre: string;
  fechaVenta: string;
  estado: 'ABIERTA' | 'CERRADA';
  fechaCreacion: string;
  creadoPor: string;
  fechaCierre?: string;
  cerradoPor?: string;
  entradaEfectivoOperacionId?: number;
  entradaTransferenciaOperacionId?: number;
  totalEfectivoIngresado: number;
  totalTransferenciaIngresado: number;
  metricas: VentaMetricas;
  productos: VentaProducto[];
  pedidos: Pedido[];
}

export interface RealizarEntradaVentaResult {
  exito: boolean;
  mensaje: string;
  operacionEfectivoId?: number;
  importeEfectivo: number;
  operacionTransferenciaId?: number;
  importeTransferencia: number;
}

// --- MÓDULO ÁREAS E INVENTARIOS ---
export interface AreaIntegrante {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioUserName: string;
  fechaAsignacion: string;
}

export interface Area {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  coordinadorId?: number | null;
  coordinadorNombre?: string | null;
  fechaCreacion: string;
  integrantes: AreaIntegrante[];
}

export interface UsuarioDisponible {
  id: number;
  nombre: string;
  userName: string;
  rol: string;
  roles?: string[];
  areaActualId?: number | null;
  areaActualNombre?: string | null;
}

export interface MiAreaInfo {
  areaId: number | null;
  areaNombre: string | null;
  esCoordinador?: boolean;
}

export interface ProductoInventario {
  id: number;
  areaId: number;
  nombre: string;
  unidadMedida: string;
  cantidadActual: number;
  activo: boolean;
  fechaCreacion: string;
}

export interface InventarioResumen {
  id: number;
  areaId: number;
  areaNombre: string;
  fechaInventario: string;
  fechaRegistro: string;
  usuarioNombre: string;
  observaciones?: string;
  totalProductos: number;
}

export interface InventarioItem {
  id: number;
  productoId?: number | null;
  nombreProducto: string;
  unidadMedida: string;
  cantidad: number;
}

export interface InventarioDetalle {
  id: number;
  areaId: number;
  areaNombre: string;
  fechaInventario: string;
  fechaRegistro: string;
  usuarioNombre: string;
  observaciones?: string;
  detalles: InventarioItem[];
}

export interface ImportarExcelItem {
  producto: string;
  cantidad: number;
  unidadMedida: string;
}

export interface ImportarExcelPreview {
  items: ImportarExcelItem[];
  errores: string[];
  totalValidos: number;
  totalErrores: number;
  areaNombre?: string;
}

// --- MÓDULO PRESUPUESTOS POR ÁREA ---
export interface PresupuestoAreaResumen {
  areaId: number;
  areaNombre: string;
  areaDescripcion?: string | null;
  areaActiva: boolean;
  coordinadorId?: number | null;
  coordinadorNombre?: string | null;
  totalRecibido: number;
  totalGastado: number;
  totalDevuelto: number;
  totalAjustes: number;
  saldoDisponible: number;
  ultimaActualizacion?: string | null;
  totalMovimientos: number;
}

export interface PresupuestoEvidencia {
  id: number;
  nombreArchivo: string;
  contentType: string;
  datosBase64: string;
  fechaSubida: string;
}

export interface PresupuestoEvidenciaInput {
  nombreArchivo: string;
  contentType: string;
  datosBase64: string;
}

export interface PresupuestoMovimientoHistorial {
  id: number;
  accion: string;
  usuarioNombre: string;
  fechaCambio: string;
  valoresAnterioresJson?: string | null;
  valoresNuevosJson?: string | null;
  detalle?: string | null;
}

export interface MovimientoPresupuesto {
  id: number;
  areaId: number;
  areaNombre: string;
  tipoMovimiento: 'ENTREGA' | 'EGRESO' | 'DEVOLUCION' | 'AJUSTE';
  estado: 'VIGENTE' | 'CANCELADO';
  importe: number;
  fechaMovimiento: string;
  concepto: string;
  descripcion?: string | null;
  cajaId?: number | null;
  cajaNombre?: string | null;
  operacionTesoreriaId?: number | null;
  usuarioId: number;
  usuarioNombre: string;
  fechaRegistro: string;
  editadoPor?: string | null;
  fechaUltimaEdicion?: string | null;
  canceladoPor?: string | null;
  fechaCancelacion?: string | null;
  motivoCancelacion?: string | null;
  evidencias: PresupuestoEvidencia[];
  historialModificaciones: PresupuestoMovimientoHistorial[];
}

export interface PresupuestoAreaDetalle {
  resumen: PresupuestoAreaResumen;
  movimientos: MovimientoPresupuesto[];
}

// ─── Módulo Deudas y Eventos ──────────────────────────────────────────────────

export interface ActividadDeuda {
  id: number;
  nombre: string;
  importe: number;
  fechaActividad: string;
  descripcion?: string | null;
  activa: boolean;
  creadoPor: string;
  fechaCreacion: string;
  totalAsignados: number;
  totalPendientes: number;
  totalPagados: number;
  totalNoAsistio: number;
  totalRecaudado: number;
  totalPorCobrar: number;
}

export interface UsuarioDeudaResumen {
  usuarioId: number;
  userName: string;
  nombre: string;
  rol: string;
  deudaTotal: number;
  totalPagado: number;
  actividadesPendientes: number;
  actividadesPagadas: number;
  actividadesNoAsistio: number;
  totalActividades: number;
}

export interface AsignacionDeuda {
  id: number;
  actividadDeudaId: number;
  actividadNombre: string;
  fechaActividad: string;
  actividadDescripcion?: string | null;
  importeOriginal: number;
  usuarioId: number;
  usuarioNombre: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'NO_ASISTIO';
  deudaCorrespondiente: number;
  formaPago?: 'EFECTIVO' | 'TRANSFERENCIA' | null;
  cajaId?: number | null;
  cajaNombre?: string | null;
  operacionTesoreriaId?: number | null;
  fechaPago?: string | null;
  registradoPagoPor?: string | null;
  fechaAsignacion: string;
}

export interface UsuarioDeudaDetalle {
  resumen: UsuarioDeudaResumen;
  actividades: AsignacionDeuda[];
}

export interface DeudasResumenGlobal {
  totalDeudaPendiente: number;
  totalRecaudado: number;
  usuariosConDeuda: number;
  usuarios: UsuarioDeudaResumen[];
}

export interface HistorialPagoDeuda {
  id: number;
  asignacionActividadDeudaId: number;
  actividadDeudaId: number;
  actividadNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  importe: number;
  formaPago: 'EFECTIVO' | 'TRANSFERENCIA';
  cajaId: number;
  cajaNombre: string;
  operacionTesoreriaId: number;
  operacionReversaId?: number | null;
  estado: 'CONFIRMADO' | 'REVERTIDO';
  fechaPago: string;
  registradoPor: string;
  fechaReversion?: string | null;
  revertidoPor?: string | null;
  motivoReversion?: string | null;
}

export interface EventoOmega {
  id: number;
  nombre: string;
  fechaHora: string;
  ubicacion?: string | null;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'CANCELADO';
  creadoPor: string;
  fechaCreacion: string;
  canceladoPor?: string | null;
  fechaCancelacion?: string | null;
  motivoCancelacion?: string | null;
}
