import {
  User,
  LoginResponse,
  Caja,
  Denominacion,
  TipoBolsa,
  ConteoItem,
  ConteoRegistro,
  Operacion,
  DashboardSummary,
  RespaldoInfo
} from '../types';

// Detect host for LAN, Localhost and Embedded mode
const isViteDev = window.location.port === '5173';
const host = window.location.hostname || 'localhost';
const API_BASE_URL = isViteDev ? `http://${host}:5000/api` : '/api';

function getHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('omega_token');
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'Error en la solicitud';
    try {
      const err = await res.json();
      errorMsg = err.message || errorMsg;
    } catch {
      errorMsg = `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(userName: string, password: string):Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password }),
    });
    return handleResponse<LoginResponse>(res);
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE_URL}/auth/users`, { headers: getHeaders() });
    return handleResponse<User[]>(res);
  },

  async createUser(data: { userName: string; password: string; nombre: string; rol: string }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async updateUser(id: number, data: { nombre: string; rol: string; activo: boolean; newPassword?: string }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async toggleUserStatus(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE_URL}/dashboard`, { headers: getHeaders() });
    return handleResponse<DashboardSummary>(res);
  },

  // Cajas
  async getCajas(includeInactive = false): Promise<Caja[]> {
    const res = await fetch(`${API_BASE_URL}/cajas?includeInactive=${includeInactive}`, {
      headers: getHeaders(),
    });
    return handleResponse<Caja[]>(res);
  },

  async getCajaById(id: number): Promise<Caja> {
    const res = await fetch(`${API_BASE_URL}/cajas/${id}`, { headers: getHeaders() });
    return handleResponse<Caja>(res);
  },

  async createCaja(data: { nombre: string; descripcion: string; finalidad: string; saldoInicial: number; tipo?: string }): Promise<Caja> {
    const res = await fetch(`${API_BASE_URL}/cajas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Caja>(res);
  },

  async updateCaja(id: number, data: { nombre: string; descripcion: string; finalidad: string; activa: boolean; tipo?: string }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cajas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async toggleCajaStatus(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cajas/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  async deleteCaja(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cajas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  // Catalogos
  async getDenominaciones(): Promise<Denominacion[]> {
    const res = await fetch(`${API_BASE_URL}/catalogos/denominaciones`, { headers: getHeaders() });
    return handleResponse<Denominacion[]>(res);
  },

  async getTiposBolsas(cajaId?: number): Promise<TipoBolsa[]> {
    const url = cajaId ? `${API_BASE_URL}/catalogos/tipos-bolsas?cajaId=${cajaId}` : `${API_BASE_URL}/catalogos/tipos-bolsas`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse<TipoBolsa[]>(res);
  },

  async createTipoBolsa(data: { nombre: string; descripcion: string; valorUnitario: number; denominacionAsociadaId?: number | null; cajaId?: number | null }): Promise<TipoBolsa> {
    const res = await fetch(`${API_BASE_URL}/catalogos/tipos-bolsas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<TipoBolsa>(res);
  },

  async updateTipoBolsa(id: number, data: { nombre: string; descripcion: string; valorUnitario: number; denominacionAsociadaId?: number | null; cajaId?: number | null }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/catalogos/tipos-bolsas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<void>(res);
  },

  async deleteTipoBolsa(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/catalogos/tipos-bolsas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(res);
  },

  // Conteos
  async getConteos(cajaId?: number): Promise<ConteoRegistro[]> {
    const url = cajaId ? `${API_BASE_URL}/conteos?cajaId=${cajaId}` : `${API_BASE_URL}/conteos`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse<ConteoRegistro[]>(res);
  },

  async registrarConteo(data: {
    cajaId: number;
    items: ConteoItem[];
    observaciones?: string;
    aplicarAjuste?: boolean;
    motivoAjuste?: string;
    tipoMovimientoDiferencia?: string;
    conceptoDiferencia?: string;
  }): Promise<ConteoRegistro> {
    const res = await fetch(`${API_BASE_URL}/conteos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ConteoRegistro>(res);
  },

  // Operaciones
  async getHistorial(params?: {
    fechaInicio?: string;
    fechaFin?: string;
    cajaId?: number;
    tipo?: string;
    usuario?: string;
  }): Promise<Operacion[]> {
    const query = new URLSearchParams();
    if (params?.fechaInicio) query.append('fechaInicio', params.fechaInicio);
    if (params?.fechaFin) query.append('fechaFin', params.fechaFin);
    if (params?.cajaId) query.append('cajaId', params.cajaId.toString());
    if (params?.tipo) query.append('tipo', params.tipo);
    if (params?.usuario) query.append('usuario', params.usuario);

    const res = await fetch(`${API_BASE_URL}/operaciones?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<Operacion[]>(res);
  },

  async registrarEntrada(data: {
    cajaId: number;
    importe: number;
    concepto: string;
    descripcion: string;
    observaciones?: string;
    desglose?: { tipoEfectivo: string; denominacionId?: number; tipoBolsaId?: number; cantidad: number }[];
  }): Promise<Operacion> {
    const res = await fetch(`${API_BASE_URL}/operaciones/entrada`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Operacion>(res);
  },

  async registrarSalida(data: {
    cajaId: number;
    importe: number;
    concepto: string;
    descripcion: string;
    observaciones?: string;
    desglose?: { tipoEfectivo: string; denominacionId?: number; tipoBolsaId?: number; cantidad: number }[];
  }): Promise<Operacion> {
    const res = await fetch(`${API_BASE_URL}/operaciones/salida`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Operacion>(res);
  },

  async registrarTransferencia(data: {
    cajaOrigenId: number;
    cajaDestinoId: number;
    importe: number;
    observaciones?: string;
    desglose?: { tipoEfectivo: string; denominacionId?: number; tipoBolsaId?: number; cantidad: number }[];
  }): Promise<Operacion> {
    const res = await fetch(`${API_BASE_URL}/operaciones/transferencia`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Operacion>(res);
  },

  async anularOperacion(id: number, motivo: string): Promise<Operacion> {
    const res = await fetch(`${API_BASE_URL}/operaciones/${id}/anular`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ motivo }),
    });
    return handleResponse<Operacion>(res);
  },

  // Respaldos
  async getRespaldos(): Promise<RespaldoInfo[]> {
    const res = await fetch(`${API_BASE_URL}/respaldos`, { headers: getHeaders() });
    return handleResponse<RespaldoInfo[]>(res);
  },

  async crearRespaldo(): Promise<RespaldoInfo> {
    const res = await fetch(`${API_BASE_URL}/respaldos/crear`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<RespaldoInfo>(res);
  },

  async restaurarRespaldo(nombreArchivo: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/respaldos/restaurar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nombreArchivo }),
    });
    return handleResponse<{ message: string }>(res);
  },

  getDownloadBackupUrl(nombreArchivo: string): string {
    return `${API_BASE_URL}/respaldos/descargar/${encodeURIComponent(nombreArchivo)}`;
  },

  getExcelReportUrl(): string {
    return `${API_BASE_URL}/reportes/excel/general`;
  }
};
