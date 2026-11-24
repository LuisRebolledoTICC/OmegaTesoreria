export interface User {
  id: number;
  userName: string;
  nombre: string;
  rol: 'Administrador' | 'Tesorero' | 'Consulta';
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export interface LoginResponse {
  token: string;
  userName: string;
  nombre: string;
  rol: 'Administrador' | 'Tesorero' | 'Consulta';
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
