import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  Pencil,
  Upload,
  Download,
  History,
  FileSpreadsheet,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Eye,
  ArrowLeft,
  ClipboardList
} from 'lucide-react';
import {
  Area,
  ProductoInventario,
  InventarioResumen,
  InventarioDetalle,
  ImportarExcelItem,
  ImportarExcelPreview
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type SubTab = 'actual' | 'cargar' | 'historial';

export const InventariosView: React.FC = () => {
  const { isAdmin, canAccessModule } = useAuth();

  // Área activa
  const [areasActivas, setAreasActivas] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedAreaNombre, setSelectedAreaNombre] = useState<string>('');
  const [noAreaAssigned, setNoAreaAssigned] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  // Sub-tabs
  const [subTab, setSubTab] = useState<SubTab>('actual');

  // Datos inventario actual
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [ultimoInventario, setUltimoInventario] = useState<InventarioDetalle | null>(null);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Producto (Registrar / Editar)
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<ProductoInventario | null>(null);
  const [prodNombre, setProdNombre] = useState('');
  const [prodUnidad, setProdUnidad] = useState('Pieza');
  const [prodCantidad, setProdCantidad] = useState<string>('0');
  const [savingProd, setSavingProd] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);

  // Carga de inventario físico / Excel
  const [fechaCarga, setFechaCarga] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacionesCarga, setObservacionesCarga] = useState('');
  const [excelPreview, setExcelPreview] = useState<ImportarExcelPreview | null>(null);
  const [itemsCarga, setItemsCarga] = useState<ImportarExcelItem[]>([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [confirmingCarga, setConfirmingCarga] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Historial
  const [historial, setHistorial] = useState<InventarioResumen[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [selectedHistorico, setSelectedHistorico] = useState<InventarioDetalle | null>(null);

  // Permisos
  const canVerTodos = isAdmin || canAccessModule('inventarios_ver_todos');
  const canRegistrar = isAdmin || canAccessModule('inventarios_registrar');
  const canEditar = isAdmin || canAccessModule('inventarios_editar');
  const canFisico = isAdmin || canAccessModule('inventarios_fisico');
  const canHistorial = isAdmin || canAccessModule('inventarios_historial');
  const canExportar = isAdmin || canAccessModule('inventarios_exportar');

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Inicialización de área según rol/asignación
  useEffect(() => {
    const initArea = async () => {
      try {
        setInitLoading(true);
        setError(null);
        if (canVerTodos) {
          const activas = await api.getAreasActivasInventario();
          setAreasActivas(activas);
          if (activas.length > 0) {
            setSelectedAreaId(activas[0].id);
            setSelectedAreaNombre(activas[0].nombre);
            setNoAreaAssigned(false);
          } else {
            setNoAreaAssigned(true);
          }
        } else {
          const miArea = await api.getMiArea();
          if (miArea.areaId) {
            setSelectedAreaId(miArea.areaId);
            setSelectedAreaNombre(miArea.areaNombre || 'Mi Área');
            setNoAreaAssigned(false);
          } else {
            setNoAreaAssigned(true);
          }
        }
      } catch (err: any) {
        setError(err.message || 'No se pudo determinar el área asignada.');
      } finally {
        setInitLoading(false);
      }
    };
    initArea();
  }, [canVerTodos]);

  const loadAreaInventory = async (areaId: number, searchTerm = search) => {
    try {
      setLoadingData(true);
      setError(null);
      const [prodsData, ultimoData] = await Promise.all([
        api.getProductosInventario(areaId, searchTerm),
        api.getUltimoInventario(areaId),
      ]);
      setProductos(prodsData);
      if (ultimoData.existe && ultimoData.inventario) {
        setUltimoInventario(ultimoData.inventario);
      } else {
        setUltimoInventario(null);
      }
      if (ultimoData.areaNombre) {
        setSelectedAreaNombre(ultimoData.areaNombre);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el inventario.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedAreaId) {
      setSelectedHistorico(null);
      setExcelPreview(null);
      loadAreaInventory(selectedAreaId, '');
      setSearch('');
    }
  }, [selectedAreaId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAreaId) {
      loadAreaInventory(selectedAreaId, search);
    }
  };

  const loadHistorial = async () => {
    if (!selectedAreaId || !canHistorial) return;
    try {
      setLoadingHistorial(true);
      const data = await api.getHistorialInventarios(selectedAreaId);
      setHistorial(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial.');
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    if (subTab === 'historial' && selectedAreaId) {
      loadHistorial();
    }
    if (subTab === 'cargar' && selectedAreaId && itemsCarga.length === 0 && !excelPreview) {
      // Precargar desde los productos actuales (que parten del último inventario)
      setItemsCarga(
        productos.map((p) => ({
          producto: p.nombre,
          cantidad: p.cantidadActual,
          unidadMedida: p.unidadMedida,
        }))
      );
    }
  }, [subTab, selectedAreaId]);

  // --- Handlers de Producto ---
  const handleOpenCreateProducto = () => {
    setEditingProducto(null);
    setProdNombre('');
    setProdUnidad('Pieza');
    setProdCantidad('0');
    setProdError(null);
    setShowProductoModal(true);
  };

  const handleOpenEditProducto = (p: ProductoInventario) => {
    setEditingProducto(p);
    setProdNombre(p.nombre);
    setProdUnidad(p.unidadMedida);
    setProdCantidad(String(p.cantidadActual));
    setProdError(null);
    setShowProductoModal(true);
  };

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId) return;
    if (!prodNombre.trim() || !prodUnidad.trim()) {
      setProdError('Nombre y unidad de medida son obligatorios.');
      return;
    }
    const cantNum = Number(prodCantidad);
    if (isNaN(cantNum) || cantNum < 0) {
      setProdError('La cantidad debe ser un número mayor o igual a 0.');
      return;
    }

    setSavingProd(true);
    setProdError(null);
    try {
      if (editingProducto) {
        await api.updateProductoInventario(editingProducto.id, {
          nombre: prodNombre.trim(),
          unidadMedida: prodUnidad.trim(),
          cantidadActual: cantNum,
        });
        showToast('Producto actualizado correctamente.');
      } else {
        await api.createProductoInventario(selectedAreaId, {
          nombre: prodNombre.trim(),
          unidadMedida: prodUnidad.trim(),
          cantidadActual: cantNum,
        });
        showToast('Producto registrado correctamente.');
      }
      setShowProductoModal(false);
      await loadAreaInventory(selectedAreaId, search);
    } catch (err: any) {
      setProdError(err.message || 'Error al guardar el producto.');
    } finally {
      setSavingProd(false);
    }
  };

  // --- Handlers Excel y Carga ---
  const handleDownloadTemplate = async () => {
    try {
      await api.descargarPlantillaInventario();
    } catch (err: any) {
      setError(err.message || 'Error al descargar plantilla.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAreaId) return;
    try {
      setUploadingExcel(true);
      setError(null);
      const preview = await api.importarExcelInventario(selectedAreaId, file);
      setExcelPreview(preview);
      if (preview.totalErrores === 0 && preview.items.length > 0) {
        setItemsCarga(preview.items);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo Excel.');
      setExcelPreview(null);
    } finally {
      setUploadingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmCarga = async () => {
    if (!selectedAreaId) return;
    if (excelPreview && excelPreview.totalErrores > 0) {
      setError('Corrige los errores del archivo Excel antes de confirmar la carga.');
      return;
    }
    if (itemsCarga.length === 0) {
      setError('No hay productos para guardar en el inventario.');
      return;
    }

    try {
      setConfirmingCarga(true);
      setError(null);
      await api.cargarInventario(selectedAreaId, {
        fechaInventario: new Date(`${fechaCarga}T12:00:00Z`).toISOString(),
        observaciones: observacionesCarga.trim() || undefined,
        items: itemsCarga,
      });
      showToast('Inventario físico guardado y agregado al historial.');
      setExcelPreview(null);
      setObservacionesCarga('');
      setItemsCarga([]);
      setSubTab('actual');
      await loadAreaInventory(selectedAreaId, '');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el inventario.');
    } finally {
      setConfirmingCarga(false);
    }
  };

  const handleOpenHistorico = async (id: number) => {
    try {
      setLoadingHistorial(true);
      const detail = await api.getInventarioById(id);
      setSelectedHistorico(detail);
    } catch (err: any) {
      setError(err.message || 'Error al abrir el inventario histórico.');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleExportExcel = async (inventarioId?: number) => {
    if (!selectedAreaId) return;
    try {
      await api.exportarInventarioExcel(inventarioId ? { inventarioId } : { areaId: selectedAreaId });
    } catch (err: any) {
      setError(err.message || 'No se pudo exportar a Excel.');
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (initLoading) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
        Cargando inventario del área...
      </div>
    );
  }

  if (noAreaAssigned || !selectedAreaId) {
    return (
      <div className="bg-white rounded-2xl p-8 max-w-lg mx-auto text-center border border-slate-200 shadow-xs mt-8">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {canVerTodos ? 'No hay áreas activas registradas' : 'Necesitas un área asignada'}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {canVerTodos
            ? 'No hay áreas activas disponibles para consultar en este momento.'
            : 'Actualmente no estás asignado a ningún área activa y no cuentas con permiso para ver todos los inventarios. Solicita a un administrador que te asigne a un área o habilite el permiso correspondiente.'}
        </p>
      </div>
    );
  }

  const fechaUltimaActualizacion = ultimoInventario
    ? new Date(ultimoInventario.fechaInventario).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Sin inventarios físicos registrados aún';

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      {/* Encabezado Print-Only para PDF limpio */}
      <div className="hidden print:block mb-4 border-b border-slate-300 pb-3">
        <h1 className="text-xl font-bold text-slate-900">
          GRUPO APOSTÓLICO OMEGA — Inventario de Área: {selectedHistorico ? selectedHistorico.areaNombre : selectedAreaNombre}
        </h1>
        <p className="text-sm text-slate-600">
          Fecha del inventario:{' '}
          {selectedHistorico
            ? new Date(selectedHistorico.fechaInventario).toLocaleDateString('es-MX')
            : ultimoInventario
            ? new Date(ultimoInventario.fechaInventario).toLocaleDateString('es-MX')
            : new Date().toLocaleDateString('es-MX')}
        </p>
      </div>

      {/* Header Principal */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center space-x-2">
              <Package className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="truncate">Inventario: {selectedAreaNombre}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Última actualización: <strong className="text-slate-700">{fechaUltimaActualizacion}</strong></span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {canVerTodos && areasActivas.length > 0 && (
              <select
                value={selectedAreaId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const found = areasActivas.find((a) => a.id === id);
                  setSelectedAreaId(id);
                  setSelectedAreaNombre(found?.nombre || '');
                  setSubTab('actual');
                }}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {areasActivas.map((a) => (
                  <option key={a.id} value={a.id}>
                    Área: {a.nombre}
                  </option>
                ))}
              </select>
            )}

            {/* Sub-Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSubTab('actual');
                  setSelectedHistorico(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  subTab === 'actual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Existencias
              </button>
              {canFisico && (
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('cargar');
                    setSelectedHistorico(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer ${
                    subTab === 'cargar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Cargar Inventario</span>
                </button>
              )}
              {canHistorial && (
                <button
                  type="button"
                  onClick={() => setSubTab('historial')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer ${
                    subTab === 'historial' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="print:hidden p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold px-2">×</button>
        </div>
      )}

      {successMsg && (
        <div className="print:hidden p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ==================== TAB 1: EXISTENCIAS ACTUALES ==================== */}
      {subTab === 'actual' && (
        <div className="space-y-4">
          {/* Barra de búsqueda y acciones */}
          <div className="print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto en esta área..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition cursor-pointer"
              >
                Buscar
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {canRegistrar && (
                <button
                  type="button"
                  onClick={handleOpenCreateProducto}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Producto</span>
                </button>
              )}
              {canExportar && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExportExcel()}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {loadingData ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Cargando productos...
            </div>
          ) : productos.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No hay productos registrados en esta área</p>
              <p className="text-xs text-slate-500">
                {canRegistrar || canFisico
                  ? 'Registra productos manualmente o carga un archivo Excel en "Cargar Inventario".'
                  : 'Aún no se han cargado existencias para esta área.'}
              </p>
            </div>
          ) : (
            <>
              {/* Móvil: Tarjetas */}
              <div className="md:hidden print:hidden space-y-2.5">
                {productos.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Unidad: <span className="font-semibold text-slate-700">{p.unidadMedida}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2.5 shrink-0">
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-900 font-bold text-sm">
                        {p.cantidadActual}
                      </span>
                      {canEditar && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditProducto(p)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Editar producto"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop / Print: Tabla */}
              <div className="hidden md:block print:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-right">Cantidad actual</th>
                      <th className="py-3 px-4">Unidad de medida</th>
                      {canEditar && <th className="py-3 px-4 text-right print:hidden">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {productos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.nombre}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{p.cantidadActual}</td>
                        <td className="py-3 px-4 text-slate-600">{p.unidadMedida}</td>
                        {canEditar && (
                          <td className="py-3 px-4 text-right print:hidden">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProducto(p)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
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
      )}

      {/* ==================== TAB 2: CARGAR INVENTARIO FÍSICO / EXCEL ==================== */}
      {subTab === 'cargar' && canFisico && (
        <div className="print:hidden bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Nueva Carga de Inventario Físico</h3>
              <p className="text-xs text-slate-500">
                Sube un archivo Excel con las columnas <strong>Producto</strong>, <strong>Cantidad</strong> y <strong>Unidad de medida</strong>. Los inventarios anteriores se conservarán en el historial.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Excel de Ejemplo</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingExcel}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingExcel ? 'Leyendo Excel...' : 'Seleccionar Archivo Excel'}</span>
              </button>
            </div>
          </div>

          {/* Fecha y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha del inventario *</label>
              <input
                type="date"
                value={fechaCarga}
                onChange={(e) => setFechaCarga(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones (opcional)</label>
              <input
                type="text"
                value={observacionesCarga}
                onChange={(e) => setObservacionesCarga(e.target.value)}
                placeholder="Ej. Conteo mensual de noviembre"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Errores de validación Excel */}
          {excelPreview && excelPreview.totalErrores > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-red-800">
                Se encontraron {excelPreview.totalErrores} error(es) en el archivo Excel. Corrige el archivo antes de guardar:
              </p>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {excelPreview.errores.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Vista previa de datos a guardar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                Vista Previa ({itemsCarga.length} producto{itemsCarga.length === 1 ? '' : 's'})
              </h4>
              {excelPreview && excelPreview.totalErrores === 0 && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                  Excel validado correctamente
                </span>
              )}
            </div>

            {itemsCarga.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                Selecciona un archivo Excel para previsualizar los productos antes de guardar.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Producto</th>
                      <th className="py-2.5 px-4 text-right">Cantidad</th>
                      <th className="py-2.5 px-4">Unidad de medida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {itemsCarga.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{item.producto}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.cantidad}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemsCarga((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, cantidad: isNaN(val) ? 0 : val } : it))
                              );
                            }}
                            className="w-24 text-right px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{item.unidadMedida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleConfirmCarga}
                disabled={confirmingCarga || itemsCarga.length === 0 || (excelPreview?.totalErrores ?? 0) > 0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {confirmingCarga ? 'Guardando Inventario...' : 'Confirmar y Guardar Inventario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: HISTORIAL ==================== */}
      {subTab === 'historial' && canHistorial && (
        <div className="space-y-4">
          {selectedHistorico ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="print:hidden p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedHistorico(null)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Inventario del {new Date(selectedHistorico.fechaInventario).toLocaleDateString('es-MX')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Registrado por {selectedHistorico.usuarioNombre}
                      {selectedHistorico.observaciones ? ` • ${selectedHistorico.observaciones}` : ''}
                    </p>
                  </div>
                </div>

                {canExportar && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleExportExcel(selectedHistorico.id)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPdf}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Móvil: Tarjetas histórico */}
              <div className="md:hidden print:hidden p-4 space-y-2.5">
                {selectedHistorico.detalles.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{d.nombreProducto}</p>
                      <p className="text-xs text-slate-500">{d.unidadMedida}</p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 font-bold text-sm text-slate-900">
                      {d.cantidad}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop/Print: Tabla histórico */}
              <div className="hidden md:block print:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4">Unidad de medida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {selectedHistorico.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="py-3 px-4 font-semibold text-slate-800">{d.nombreProducto}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{d.cantidad}</td>
                        <td className="py-3 px-4 text-slate-600">{d.unidadMedida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : loadingHistorial ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Cargando historial...
            </div>
          ) : historial.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              No hay inventarios históricos registrados para esta área aún.
            </div>
          ) : (
            <>
              {/* Móvil: Tarjetas historial */}
              <div className="md:hidden space-y-2.5">
                {historial.map((h) => (
                  <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {new Date(h.fechaInventario).toLocaleDateString('es-MX')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                        {h.totalProductos} productos
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Registrado por: {h.usuarioNombre}</p>
                    {h.observaciones && <p className="text-xs text-slate-600 italic">{h.observaciones}</p>}
                    <button
                      type="button"
                      onClick={() => handleOpenHistorico(h.id)}
                      className="w-full mt-1 py-2 bg-slate-900 text-amber-400 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Detalle</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop: Tabla historial */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="py-3 px-4">Fecha de Inventario</th>
                      <th className="py-3 px-4">Registrado por</th>
                      <th className="py-3 px-4">Observaciones</th>
                      <th className="py-3 px-4 text-right">Productos</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {historial.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {new Date(h.fechaInventario).toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{h.usuarioNombre}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{h.observaciones || '-'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">{h.totalProductos}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenHistorico(h.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Consultar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Registrar / Editar Producto */}
      {showProductoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingProducto ? 'Editar Producto' : 'Registrar Producto'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductoModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProducto} className="p-5 space-y-4">
              {prodError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {prodError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  placeholder="Ej. Hojas blancas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad actual *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={prodCantidad}
                    onChange={(e) => setProdCantidad(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidad de medida *</label>
                  <input
                    type="text"
                    value={prodUnidad}
                    onChange={(e) => setProdUnidad(e.target.value)}
                    placeholder="Pieza, Caja, Litro..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProd}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {savingProd ? 'Guardando...' : editingProducto ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
