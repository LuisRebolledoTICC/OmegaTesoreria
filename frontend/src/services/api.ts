import {
  User,
  RolPersonalizado,
  LoginResponse,
  Caja,
  Denominacion,
  TipoBolsa,
  ConteoItem,
  ConteoRegistro,
  Operacion,
  DashboardSummary,
  RespaldoInfo,
  VentaResumen,
  VentaDetalle,
  VentaProducto,
  Pedido,
  RealizarEntradaVentaResult,
  Area,
  UsuarioDisponible,
  MiAreaInfo,
  ProductoInventario,
  InventarioResumen,
  InventarioDetalle,
  ImportarExcelPreview,
  ImportarExcelItem,
  PresupuestoAreaResumen,
  PresupuestoAreaDetalle,
  MovimientoPresupuesto,
  PresupuestoEvidenciaInput
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

  async createUser(data: { userName: string; password: string; nombre: string; rol: string; roles?: string[] }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async updateUser(id: number, data: { nombre: string; rol: string; activo: boolean; newPassword?: string; userName?: string; roles?: string[] }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async deleteUser(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async getPerfil(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/perfil`, { headers: getHeaders() });
    return handleResponse<User>(res);
  },

  async updatePerfil(data: { nombre: string; userName: string; passwordActual?: string; nuevaPassword?: string }): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/perfil`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<LoginResponse>(res);
  },

  async toggleUserStatus(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  // Roles
  async getRoles(): Promise<RolPersonalizado[]> {
    const res = await fetch(`${API_BASE_URL}/auth/roles`, { headers: getHeaders() });
    return handleResponse<RolPersonalizado[]>(res);
  },

  async createRol(data: { nombre: string; descripcion: string; modulosPermitidos: string[] }): Promise<RolPersonalizado> {
    const res = await fetch(`${API_BASE_URL}/auth/roles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RolPersonalizado>(res);
  },

  async updateRol(id: number, data: { nombre: string; descripcion: string; modulosPermitidos: string[] }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/roles/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async deleteRol(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/roles/${id}`, {
      method: 'DELETE',
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

  async downloadExcelReport(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/reportes/excel/general`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    if (!res.ok) {
      let errorMsg = 'No se pudo generar el reporte en Excel.';
      try {
        const err = await res.json();
        errorMsg = err.message || errorMsg;
      } catch {
        errorMsg = `Error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `Omega_Tesoreria_General_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Ventas
  async getVentas(): Promise<VentaResumen[]> {
    const res = await fetch(`${API_BASE_URL}/ventas`, { headers: getHeaders() });
    return handleResponse<VentaResumen[]>(res);
  },

  async getVentaById(id: number): Promise<VentaDetalle> {
    const res = await fetch(`${API_BASE_URL}/ventas/${id}`, { headers: getHeaders() });
    return handleResponse<VentaDetalle>(res);
  },

  async createVenta(data: { nombre: string; fechaVenta: string }): Promise<VentaResumen> {
    const res = await fetch(`${API_BASE_URL}/ventas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<VentaResumen>(res);
  },

  async updateVenta(id: number, data: { nombre: string; fechaVenta: string }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/ventas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async deleteVenta(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/ventas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  async saveProducto(
    ventaId: number,
    productoId: number | null,
    data: { nombre: string; descripcion?: string; orden: number; presentaciones: { id?: number; nombre: string; precio: number; orden: number }[] }
  ): Promise<VentaProducto> {
    const url = productoId ? `${API_BASE_URL}/ventas/${ventaId}/productos?productoId=${productoId}` : `${API_BASE_URL}/ventas/${ventaId}/productos`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<VentaProducto>(res);
  },

  async deleteProducto(ventaId: number, productoId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}/productos/${productoId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  async createPedido(
    ventaId: number,
    data: {
      nombreCliente?: string;
      observaciones?: string;
      estadoEntrega: string;
      items: { ventaPresentacionId: number; cantidad: number }[];
      pagos: { metodoPago: string; importe: number; referencia?: string }[];
    }
  ): Promise<Pedido> {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}/pedidos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Pedido>(res);
  },

  async updatePedido(
    ventaId: number,
    pedidoId: number,
    data: {
      nombreCliente?: string;
      observaciones?: string;
      estadoEntrega: string;
      items: { ventaPresentacionId: number; cantidad: number }[];
      pagos: { metodoPago: string; importe: number; referencia?: string }[];
    }
  ): Promise<Pedido> {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}/pedidos/${pedidoId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Pedido>(res);
  },

  async updateEstadoEntrega(ventaId: number, pedidoId: number, estadoEntrega: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}/pedidos/${pedidoId}/estado-entrega`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ estadoEntrega }),
    });
    await handleResponse(res);
  },

  async cancelarPedido(ventaId: number, pedidoId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}/pedidos/${pedidoId}/cancelar`, {
      method: 'POST',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  async realizarEntradaVenta(ventaId: number, cajaEfectivoId: number): Promise<RealizarEntradaVentaResult> {
    const res = await fetch(`${API_BASE_URL}/ventas/${ventaId}/realizar-entrada`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ cajaEfectivoId }),
    });
    return handleResponse<RealizarEntradaVentaResult>(res);
  },

  // --- ÁREAS ---
  async getAreas(): Promise<Area[]> {
    const res = await fetch(`${API_BASE_URL}/areas`, { headers: getHeaders() });
    return handleResponse<Area[]>(res);
  },

  async getAreaById(id: number): Promise<Area> {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, { headers: getHeaders() });
    return handleResponse<Area>(res);
  },

  async createArea(data: { nombre: string; descripcion?: string; coordinadorId?: number | null }): Promise<{ message: string; id: number }> {
    const res = await fetch(`${API_BASE_URL}/areas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; id: number }>(res);
  },

  async updateArea(id: number, data: { nombre: string; descripcion?: string; activa: boolean; coordinadorId?: number | null }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/areas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async toggleAreaStatus(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/areas/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  async addIntegranteArea(areaId: number, usuarioId: number, forzarCambio = false): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/areas/${areaId}/integrantes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ usuarioId, forzarCambio }),
    });
    if (res.status === 409) {
      const data = await res.json();
      const err: any = new Error(data.message || 'El usuario ya pertenece a otra área.');
      err.status = 409;
      err.requiereForzar = data.requiereForzar;
      err.areaActual = data.areaActual;
      throw err;
    }
    return handleResponse<{ message: string }>(res);
  },

  async removeIntegranteArea(areaId: number, userId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/areas/${areaId}/integrantes/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse(res);
  },

  async getMiArea(): Promise<MiAreaInfo> {
    const res = await fetch(`${API_BASE_URL}/areas/mi-area`, { headers: getHeaders() });
    return handleResponse<MiAreaInfo>(res);
  },

  async getUsuariosDisponiblesArea(soloSinArea = false, soloOmega = false): Promise<UsuarioDisponible[]> {
    const params = new URLSearchParams();
    if (soloSinArea) params.append('soloSinArea', 'true');
    if (soloOmega) params.append('soloOmega', 'true');
    const qs = params.toString();
    const res = await fetch(`${API_BASE_URL}/areas/usuarios-disponibles${qs ? `?${qs}` : ''}`, { headers: getHeaders() });
    return handleResponse<UsuarioDisponible[]>(res);
  },

  async addIntegrantesAreaBatch(areaId: number, usuarioIds: number[]): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_BASE_URL}/areas/${areaId}/integrantes/batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ usuarioIds }),
    });
    return handleResponse<{ message: string; count: number }>(res);
  },

  // --- INVENTARIOS ---
  async getAreasActivasInventario(): Promise<{ id: number; nombre: string }[]> {
    const res = await fetch(`${API_BASE_URL}/inventarios/areas-activas`, { headers: getHeaders() });
    return handleResponse<{ id: number; nombre: string }[]>(res);
  },

  async getProductosInventario(areaId: number, search?: string): Promise<ProductoInventario[]> {
    const query = new URLSearchParams({ areaId: String(areaId) });
    if (search && search.trim()) query.append('search', search.trim());
    const res = await fetch(`${API_BASE_URL}/inventarios/productos?${query.toString()}`, { headers: getHeaders() });
    return handleResponse<ProductoInventario[]>(res);
  },

  async createProductoInventario(areaId: number, data: { nombre: string; unidadMedida: string; cantidadActual: number }): Promise<ProductoInventario> {
    const res = await fetch(`${API_BASE_URL}/inventarios/productos?areaId=${areaId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ProductoInventario>(res);
  },

  async updateProductoInventario(id: number, data: { nombre: string; unidadMedida: string; cantidadActual: number }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/inventarios/productos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res);
  },

  async deleteProductoInventario(id: number, areaId?: number): Promise<{ message: string }> {
    const qs = areaId ? `?areaId=${areaId}` : '';
    const res = await fetch(`${API_BASE_URL}/inventarios/productos/${id}${qs}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async getUltimoInventario(areaId: number): Promise<{ existe: boolean; inventario?: InventarioDetalle; areaNombre?: string }> {
    const res = await fetch(`${API_BASE_URL}/inventarios/ultimo?areaId=${areaId}`, { headers: getHeaders() });
    return handleResponse<{ existe: boolean; inventario?: InventarioDetalle; areaNombre?: string }>(res);
  },

  async getHistorialInventarios(areaId: number): Promise<InventarioResumen[]> {
    const res = await fetch(`${API_BASE_URL}/inventarios/historial?areaId=${areaId}`, { headers: getHeaders() });
    return handleResponse<InventarioResumen[]>(res);
  },

  async getInventarioById(id: number): Promise<InventarioDetalle> {
    const res = await fetch(`${API_BASE_URL}/inventarios/${id}`, { headers: getHeaders() });
    return handleResponse<InventarioDetalle>(res);
  },

  async cargarInventario(areaId: number, data: { fechaInventario: string; observaciones?: string; items: ImportarExcelItem[] }): Promise<{ message: string; inventarioId: number }> {
    const res = await fetch(`${API_BASE_URL}/inventarios/cargar?areaId=${areaId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; inventarioId: number }>(res);
  },

  async importarExcelInventario(areaId: number, file: File): Promise<ImportarExcelPreview> {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await fetch(`${API_BASE_URL}/inventarios/importar-excel?areaId=${areaId}`, {
      method: 'POST',
      headers: getHeaders(false),
      body: formData,
    });
    return handleResponse<ImportarExcelPreview>(res);
  },

  async descargarPlantillaInventario(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/inventarios/plantilla-excel`, {
      method: 'GET',
      headers: getHeaders(false),
    });
    if (!res.ok) throw new Error('No se pudo descargar la plantilla de Excel.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Plantilla_Inventario_Omega.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async exportarInventarioExcel(params: { inventarioId?: number; areaId?: number }): Promise<void> {
    const query = new URLSearchParams();
    if (params.inventarioId) query.append('inventarioId', String(params.inventarioId));
    if (params.areaId) query.append('areaId', String(params.areaId));

    const res = await fetch(`${API_BASE_URL}/inventarios/exportar/excel?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(false),
    });
    if (!res.ok) {
      let msg = 'No se pudo exportar el inventario a Excel.';
      try {
        const err = await res.json();
        msg = err.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `Inventario_Omega_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) filename = match[1].replace(/['"]/g, '');
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // --- PRESUPUESTOS ---
  async getPresupuestosResumen(): Promise<PresupuestoAreaResumen[]> {
    const res = await fetch(`${API_BASE_URL}/presupuestos`, { headers: getHeaders() });
    return handleResponse<PresupuestoAreaResumen[]>(res);
  },

  async getAreasActivasPresupuesto(): Promise<{ id: number; nombre: string }[]> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/areas-activas`, { headers: getHeaders() });
    return handleResponse<{ id: number; nombre: string }[]>(res);
  },

  async getPresupuestoDetalle(areaId: number): Promise<PresupuestoAreaDetalle> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/area/${areaId}`, { headers: getHeaders() });
    return handleResponse<PresupuestoAreaDetalle>(res);
  },

  async asignarPresupuesto(data: {
    cajaOrigenId: number;
    areaDestinoId: number;
    importe: number;
    fecha: string;
    descripcion?: string;
  }): Promise<MovimientoPresupuesto> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/asignar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<MovimientoPresupuesto>(res);
  },

  async registrarEgresoPresupuesto(data: {
    areaId: number;
    concepto: string;
    importe: number;
    fecha: string;
    descripcion?: string;
    evidencias?: PresupuestoEvidenciaInput[];
  }): Promise<MovimientoPresupuesto> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/egresos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<MovimientoPresupuesto>(res);
  },

  async editarEgresoPresupuesto(
    id: number,
    data: {
      concepto: string;
      importe: number;
      fecha: string;
      descripcion?: string;
      conservarEvidenciaIds?: number[];
      nuevasEvidencias?: PresupuestoEvidenciaInput[];
    }
  ): Promise<MovimientoPresupuesto> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/egresos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<MovimientoPresupuesto>(res);
  },

  async cancelarEgresoPresupuesto(id: number, motivo?: string): Promise<MovimientoPresupuesto> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/egresos/${id}/cancelar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ motivo }),
    });
    return handleResponse<MovimientoPresupuesto>(res);
  },

  async devolverPresupuesto(data: {
    areaOrigenId: number;
    cajaDestinoId: number;
    importe: number;
    fecha: string;
    descripcion?: string;
  }): Promise<MovimientoPresupuesto> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/devolver`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<MovimientoPresupuesto>(res);
  },

  async registrarAjustePresupuesto(data: {
    areaId: number;
    importe: number;
    fecha: string;
    motivo: string;
  }): Promise<MovimientoPresupuesto> {
    const res = await fetch(`${API_BASE_URL}/presupuestos/ajustes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<MovimientoPresupuesto>(res);
  }
};
