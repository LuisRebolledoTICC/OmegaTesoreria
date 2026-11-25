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
