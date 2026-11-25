import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Pencil,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Check,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { User, RolPersonalizado } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MODULOS_DISPONIBLES = [
  { id: 'dashboard', nombre: 'Dashboard General', descripcion: 'Panel general con balances y gráficos' },
  { id: 'ventas', nombre: 'Ventas y Pedidos', descripcion: 'Gestión de jornadas de venta, productos, pedidos y entradas' },
  { id: 'cajas', nombre: 'Cajas de Tesorería', descripcion: 'Listado, creación y configuración de cajas' },
  { id: 'conteo', nombre: 'Conteo Físico de Efectivo', descripcion: 'Arqueos y desglose de monedas, billetes y bolsas' },
  { id: 'operaciones', nombre: 'Movimientos por Caja', descripcion: 'Entradas, salidas y transferencias' },
  { id: 'reportes', nombre: 'Reportes y Excel', descripcion: 'Auditorías y exportación de archivos Excel' },
  { id: 'usuarios', nombre: 'Usuarios y Permisos', descripcion: 'Gestión de usuarios y personalización de roles' },
  { id: 'entradas', nombre: 'Realizar Entradas', descripcion: 'Permiso para realizar y registrar entradas de dinero a cajas y desde Ventas' },
  // Módulo Áreas
  { id: 'areas', nombre: 'Áreas: Ver áreas', descripcion: 'Permite acceder al módulo Áreas y consultar su información' },
  { id: 'areas_crear', nombre: 'Áreas: Crear áreas', descripcion: 'Permite crear nuevas áreas' },
  { id: 'areas_editar', nombre: 'Áreas: Editar áreas', descripcion: 'Permite modificar nombre y descripción de áreas' },
  { id: 'areas_desactivar', nombre: 'Áreas: Desactivar áreas', descripcion: 'Permite activar o desactivar áreas conservando su historial' },
  { id: 'areas_coordinador', nombre: 'Áreas: Asignar coordinadores', descripcion: 'Permite asignar o cambiar el coordinador de un área' },
  { id: 'areas_integrantes', nombre: 'Áreas: Administrar integrantes del área', descripcion: 'Permite al coordinador agregar y retirar integrantes de su propia área' },
  // Módulo Inventarios
  { id: 'inventarios', nombre: 'Inventarios: Ver inventario', descripcion: 'Permite consultar el inventario del área asignada' },
  { id: 'inventarios_ver_todos', nombre: 'Inventarios: Ver todos los inventarios', descripcion: 'Permite consultar los inventarios de todas las áreas activas aunque no tenga un área asignada' },
  { id: 'inventarios_registrar', nombre: 'Inventarios: Registrar productos', descripcion: 'Permite dar de alta nuevos productos en el área' },
  { id: 'inventarios_editar', nombre: 'Inventarios: Editar productos', descripcion: 'Permite modificar nombre, unidad y cantidad de productos' },
  { id: 'inventarios_fisico', nombre: 'Inventarios: Realizar inventarios físicos', descripcion: 'Permite cargar inventarios por fecha mediante Excel o captura' },
  { id: 'inventarios_historial', nombre: 'Inventarios: Consultar historial', descripcion: 'Permite ver inventarios anteriores por fecha' },
  { id: 'inventarios_exportar', nombre: 'Inventarios: Exportar reportes', descripcion: 'Permite descargar inventarios en Excel y PDF' },
];

export const UsuariosView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RolPersonalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search, sort, Excel role filter, pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRolesFilter, setSelectedRolesFilter] = useState<string[]>([]);
  const [showRoleFilterMenu, setShowRoleFilterMenu] = useState(false);
  const [roleFilterPos, setRoleFilterPos] = useState<{ top: number; left: number } | null>(null);
  const roleFilterRef = useRef<HTMLDivElement>(null);
  const roleFilterBtnRef = useRef<HTMLButtonElement>(null);
  const [sortField, setSortField] = useState<'nombre' | 'userName' | 'rol' | 'activo' | 'fechaCreacion'>('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form states - Crear usuario
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<string>('Tesorero');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // States - Cambiar Contraseña
  const [userForPassword, setUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // States - Editar Usuario
  const [userForEdit, setUserForEdit] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState<string>('Tesorero');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // States - Eliminar Usuario
  const [userForDelete, setUserForDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // States - Roles y Permisos
  const [showRolModal, setShowRolModal] = useState(false);
  const [rolEdit, setRolEdit] = useState<RolPersonalizado | null>(null);
  const [rolNombre, setRolNombre] = useState('');
  const [rolDescripcion, setRolDescripcion] = useState('');
  const [rolModulos, setRolModulos] = useState<string[]>(['dashboard', 'cajas']);
  const [rolError, setRolError] = useState<string | null>(null);
  const [savingRol, setSavingRol] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !rol) {
        setRol(rolesData[0].nombre);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(event.target as Node)) {
        setShowRoleFilterMenu(false);
      }
    };
    if (showRoleFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRoleFilterMenu]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRolesFilter, pageSize]);

  const availableRoleNames = useMemo(() => {
    const set = new Set<string>();
    roles.forEach((r) => {
      if (r.nombre) set.add(r.nombre);
    });
    users.forEach((u) => {
      if (u.rol) set.add(u.rol);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [roles, users]);

  const filteredAndSortedUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (selectedRolesFilter.length > 0 && !selectedRolesFilter.includes(u.rol)) {
        return false;
      }
      if (!term) return true;
      return (
        u.nombre.toLowerCase().includes(term) ||
        u.userName.toLowerCase().includes(term) ||
        u.rol.toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'nombre') {
        cmp = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        if (cmp === 0) cmp = a.userName.localeCompare(b.userName, 'es', { sensitivity: 'base' });
      } else if (sortField === 'userName') {
        cmp = a.userName.localeCompare(b.userName, 'es', { sensitivity: 'base' });
      } else if (sortField === 'rol') {
        cmp = a.rol.localeCompare(b.rol, 'es', { sensitivity: 'base' });
      } else if (sortField === 'activo') {
        cmp = (a.activo === b.activo) ? 0 : a.activo ? -1 : 1;
      } else if (sortField === 'fechaCreacion') {
        cmp = new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [users, searchTerm, selectedRolesFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, safePage, pageSize]);

  const handleSort = (field: 'nombre' | 'userName' | 'rol' | 'activo' | 'fechaCreacion') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleRoleInFilter = (roleName: string) => {
    setSelectedRolesFilter((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  const isCurrentUser = (u: User) =>
    (currentUser?.id && u.id === currentUser.id) ||
    (currentUser?.userName && u.userName.toLowerCase() === currentUser.userName.toLowerCase());

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !password || !nombre.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createUser({
        userName: userName.trim(),
        password,
        nombre: nombre.trim(),
        rol,
      });
      setShowModal(false);
      setUserName('');
      setPassword('');
      setNombre('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPasswordModal = (u: User) => {
    setUserForPassword(u);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPassword) return;

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    try {
      await api.updateUser(userForPassword.id, {
        nombre: userForPassword.nombre,
        userName: userForPassword.userName,
        rol: userForPassword.rol,
        activo: userForPassword.activo,
        newPassword: newPassword.trim(),
      });
      setPasswordSuccess(`¡Contraseña de "${userForPassword.userName}" actualizada exitosamente!`);
      setTimeout(() => {
        setUserForPassword(null);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleOpenEditModal = (u: User) => {
    setUserForEdit(u);
    setEditUserName(u.userName);
    setEditNombre(u.nombre);
    setEditRol(u.rol);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForEdit) return;

    if (!editUserName.trim()) {
      setEditError('El nombre de usuario es requerido.');
      return;
    }

    if (!editNombre.trim()) {
      setEditError('El nombre completo es requerido.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await api.updateUser(userForEdit.id, {
        userName: editUserName.trim(),
        nombre: editNombre.trim(),
        rol: editRol,
        activo: userForEdit.activo,
      });
      setUserForEdit(null);
      setActionToast({ type: 'success', text: `Usuario "${editNombre.trim()}" actualizado correctamente.` });
      setTimeout(() => setActionToast(null), 3500);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar usuario.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDeleteModal = (u: User) => {
    setUserForDelete(u);
    setDeleteError(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userForDelete) return;
    setDeletingUser(true);
    setDeleteError(null);
    try {
      const res = await api.deleteUser(userForDelete.id);
      setActionToast({
        type: 'success',
        text: res.message || `Cuenta "${userForDelete.userName}" eliminada permanentemente.`,
      });
      setTimeout(() => setActionToast(null), 4000);
      setUserForDelete(null);
      loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'No se pudo eliminar el usuario.');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await api.toggleUserStatus(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Handlers de Roles ---
  const handleOpenCreateRolModal = () => {
    setRolEdit(null);
    setRolNombre('');
    setRolDescripcion('');
    setRolModulos(['dashboard', 'cajas']);
    setRolError(null);
    setShowRolModal(true);
  };

  const handleOpenEditRolModal = (r: RolPersonalizado) => {
    setRolEdit(r);
    setRolNombre(r.nombre);
    setRolDescripcion(r.descripcion);
    setRolModulos(r.modulosPermitidos || []);
    setRolError(null);
    setShowRolModal(true);
  };

  const handleToggleModulo = (modId: string) => {
    if (rolModulos.includes(modId)) {
      setRolModulos(rolModulos.filter(m => m !== modId));
    } else {
      setRolModulos([...rolModulos, modId]);
    }
  };

  const handleSaveRol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rolNombre.trim()) {
      setRolError('El nombre del rol es obligatorio.');
      return;
    }

    setSavingRol(true);
    setRolError(null);
    try {
      if (rolEdit) {
        await api.updateRol(rolEdit.id, {
          nombre: rolNombre.trim(),
          descripcion: rolDescripcion.trim(),
          modulosPermitidos: rolModulos,
        });
      } else {
        await api.createRol({
          nombre: rolNombre.trim(),
          descripcion: rolDescripcion.trim(),
          modulosPermitidos: rolModulos,
        });
      }
      setShowRolModal(false);
      loadData();
    } catch (err: any) {
      setRolError(err.message || 'Error al guardar el rol.');
    } finally {
      setSavingRol(false);
    }
  };

  const handleDeleteRol = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el rol "${nombre}"?`)) return;
    try {
      await api.deleteRol(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el rol.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <span>Administración de Usuarios y Permisos</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de usuarios, cuentas de acceso y definición de roles con permisos específicos por módulo.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('usuarios')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
              activeSubTab === 'usuarios'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
              activeSubTab === 'roles'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Roles y Módulos ({roles.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: USUARIOS */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-4">
          {actionToast && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                actionToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                {actionToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{actionToast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionToast(null)}
                className="font-bold px-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Cuentas Registradas en el Sistema</h3>
              <p className="text-[11px] text-slate-500">
                Mostrando {filteredAndSortedUsers.length} de {users.length} cuenta(s)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, usuario o rol..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Nuevo Usuario</span>
              </button>
            </div>
          </div>

          {/* Barra de filtro activo / filtro móvil */}
          {(selectedRolesFilter.length > 0 || availableRoleNames.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-2 md:hidden bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-amber-600" />
                <span>Filtrar por rol:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableRoleNames.map((roleName) => {
                  const selected = selectedRolesFilter.includes(roleName);
                  return (
                    <button
                      key={roleName}
                      type="button"
                      onClick={() => toggleRoleInFilter(roleName)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        selected
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {roleName}
                    </button>
                  );
                })}
                {selectedRolesFilter.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedRolesFilter([])}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedRolesFilter.length > 0 && (
            <div className="hidden md:flex items-center justify-between bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs text-amber-900">
              <div className="flex items-center flex-wrap gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold">Roles filtrados:</span>
                {selectedRolesFilter.map((r) => (
                  <span key={r} className="px-2 py-0.5 bg-white border border-amber-300 rounded-md font-bold text-[11px]">
                    {r}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedRolesFilter([])}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                Limpiar filtro de roles
              </button>
            </div>
          )}

          {/* Vista Móvil en Tarjetas (< md) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                Cargando usuarios...
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                No se encontraron usuarios con los filtros aplicados.
              </div>
            ) : (
              paginatedUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                        {u.nombre.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.nombre}</p>
                        <p className="text-xs text-slate-500 truncate">
                          <span className="font-mono">#{u.id}</span> • @{u.userName}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rol:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        <Shield className="w-3 h-3 mr-1" />
                        {u.rol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Creación:</span>
                      <span>{new Date(u.fechaCreacion).toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Último acceso:</span>
                      <span className="text-right">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-MX') : 'Nunca'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenPasswordModal(u)}
                      className="flex-1 py-2 px-3 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition font-bold flex items-center justify-center space-x-1.5 text-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Contraseña</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="flex-1 py-2 px-3 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-bold flex items-center justify-center space-x-1.5 text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    {!isCurrentUser(u) && u.userName.toLowerCase() !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                          u.activo ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                    {!isCurrentUser(u) && (
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(u)}
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition flex items-center justify-center space-x-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar Cuenta</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop/Tablet en Tabla (>= md) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-visible min-h-[526px]">
            <div className="overflow-x-auto overflow-y-visible min-h-[526px]">
              <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('userName')}
                      className="inline-flex items-center space-x-1 hover:text-slate-950 cursor-pointer"
                    >
                      <span>Usuario</span>
                      {sortField === 'userName' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('nombre')}
                      className="inline-flex items-center space-x-1 hover:text-slate-950 cursor-pointer"
                    >
                      <span>Nombre Completo</span>
                      {sortField === 'nombre' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 relative">
                    <div className="inline-flex items-center space-x-1.5" ref={roleFilterRef}>
                      <button
                        type="button"
                        onClick={() => handleSort('rol')}
                        className="inline-flex items-center space-x-1 hover:text-slate-950 cursor-pointer"
                      >
                        <span>Rol de Acceso</span>
                        {sortField === 'rol' ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      <button
                        ref={roleFilterBtnRef}
                        type="button"
                        onClick={() => {
                          if (!showRoleFilterMenu && roleFilterBtnRef.current) {
                            const rect = roleFilterBtnRef.current.getBoundingClientRect();
                            setRoleFilterPos({
                              top: rect.bottom + 6,
                              left: Math.min(rect.left, window.innerWidth - 256),
                            });
                          }
                          setShowRoleFilterMenu((prev) => !prev);
                        }}
                        title="Filtrar por rol de acceso"
                        className={`p-1 rounded-md border transition cursor-pointer ${
                          selectedRolesFilter.length > 0
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white text-slate-500 border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>

                      {showRoleFilterMenu && roleFilterPos && (
                        <div
                          style={{ top: roleFilterPos.top, left: roleFilterPos.left }}
                          className="fixed w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2.5 normal-case font-normal"
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-700 uppercase">Filtrar por Rol</span>
                            <button
                              type="button"
                              onClick={() => setShowRoleFilterMenu(false)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {availableRoleNames.map((roleName) => {
                              const checked = selectedRolesFilter.includes(roleName);
                              return (
                                <label
                                  key={roleName}
                                  className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleRoleInFilter(roleName)}
                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  <span className="truncate font-medium">{roleName}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedRolesFilter(availableRoleNames)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              Seleccionar todos
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedRolesFilter([])}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              Limpiar filtro
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('activo')}
                      className="inline-flex items-center space-x-1 hover:text-slate-950 cursor-pointer"
                    >
                      <span>Estado</span>
                      {sortField === 'activo' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('fechaCreacion')}
                      className="inline-flex items-center space-x-1 hover:text-slate-950 cursor-pointer"
                    >
                      <span>Fecha de Creación</span>
                      {sortField === 'fechaCreacion' ? (
                        sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Último Acceso</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No se encontraron usuarios con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 h-12">
                      <td className="p-3 font-mono text-slate-500">#{u.id}</td>
                      <td className="p-3 font-bold text-slate-900">{u.userName}</td>
                      <td className="p-3 text-slate-700">{u.nombre}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Shield className="w-3 h-3 mr-1" />
                          {u.rol}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{new Date(u.fechaCreacion).toLocaleDateString('es-MX')}</td>
                      <td className="p-3 text-slate-600">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-MX') : 'Nunca'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(u)}
                            className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition font-medium flex items-center space-x-1 text-[11px] cursor-pointer"
                            title="Restablecer o cambiar contraseña de este usuario"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Contraseña</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-medium flex items-center space-x-1 text-[11px] cursor-pointer"
                            title="Editar datos del usuario"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          {!isCurrentUser(u) && u.userName.toLowerCase() !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                u.activo ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                          {!isCurrentUser(u) && (
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(u)}
                              className="p-1.5 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition font-medium flex items-center space-x-1 text-[11px] cursor-pointer"
                              title="Eliminar usuario permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Paginación */}
          {!loading && filteredAndSortedUsers.length > 0 && (
            <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-600">
                <span>
                  Mostrando{' '}
                  <strong>{(safePage - 1) * pageSize + 1}</strong>
                  {' - '}
                  <strong>{Math.min(safePage * pageSize, filteredAndSortedUsers.length)}</strong>
                  {' de '}
                  <strong>{filteredAndSortedUsers.length}</strong> usuario(s)
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="px-2.5 py-1 font-bold text-slate-700">
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ROLES Y PERMISOS DE MÓDULOS */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Roles Configurados y Módulos Visibles</h3>
              <p className="text-xs text-slate-500">
                Define qué secciones de la aplicación puede ver cada perfil de usuario al iniciar sesión.
              </p>
            </div>
            <button
              onClick={handleOpenCreateRolModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Nuevo Rol</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>{r.nombre}</span>
                    </span>
                    {r.esSistema ? (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200">
                        Sistema
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full border border-blue-200">
                        Personalizado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                    {r.descripcion || 'Sin descripción.'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Módulos Visibles:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {MODULOS_DISPONIBLES.map((m) => {
                        const tieneAcceso = r.nombre === 'Administrador' || r.modulosPermitidos.includes(m.id);
                        return (
                          <span
                            key={m.id}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium border ${
                              tieneAcceso
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
                            }`}
                          >
                            {tieneAcceso && <Check className="w-3 h-3 mr-1 text-emerald-600" />}
                            {m.nombre}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditRolModal(r)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Configurar Módulos</span>
                  </button>
                  {!r.esSistema && (
                    <button
                      onClick={() => handleDeleteRol(r.id, r.nombre)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Eliminar rol"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Registrar Nuevo Usuario</h3>
            <p className="text-xs text-slate-500 mb-4">Ingresa las credenciales y asigna el rol correspondiente.</p>

            {error && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario (Login):</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="ej. maria.tesoreria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej. María González"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña Inicial:</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol de Acceso:</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {submitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Contraseña */}
      {userForPassword && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cambiar Contraseña</h3>
                <p className="text-xs text-slate-500">
                  Usuario: <strong className="text-slate-800">{userForPassword.userName}</strong> ({userForPassword.nombre})
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva Contraseña:</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirmar Nueva Contraseña:</label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserForPassword(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {savingPassword ? 'Guardando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {userForEdit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Editar Datos del Usuario</h3>
            <p className="text-xs text-slate-500 mb-4">
              Modifica el usuario, nombre y rol para <strong className="text-slate-800">@{userForEdit.userName}</strong>.
            </p>

            {editError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Usuario (Login):</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol de Acceso:</label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserForEdit(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación Permanente de Usuario */}
      {userForDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Eliminar Cuenta Permanentemente</h3>
                <p className="text-xs text-red-600 font-semibold">Esta acción es permanente y no se puede deshacer.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5 mb-4">
              <p>
                Estás a punto de eliminar definitivamente la cuenta de:
              </p>
              <p className="font-bold text-slate-900 text-sm">
                {userForDelete.nombre} <span className="font-mono text-xs text-slate-500">(@{userForDelete.userName})</span>
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Los registros históricos de inventarios, movimientos y auditorías realizados por este usuario se conservarán intactos.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserForDelete(null)}
                disabled={deletingUser}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={deletingUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {deletingUser ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear / Configurar Rol */}
      {showRolModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {rolEdit ? `Configurar Permisos: ${rolEdit.nombre}` : 'Crear Nuevo Rol'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Elige los módulos a los que tendrán acceso los usuarios asignados a este rol.
            </p>

            {rolError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rolError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRol} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Rol:</label>
                <input
                  type="text"
                  required
                  disabled={rolEdit?.esSistema}
                  value={rolNombre}
                  onChange={(e) => setRolNombre(e.target.value)}
                  placeholder="ej. Supervisor, Auxiliar Contable"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción:</label>
                <input
                  type="text"
                  value={rolDescripcion}
                  onChange={(e) => setRolDescripcion(e.target.value)}
                  placeholder="Breve detalle de las responsabilidades del rol"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Módulos y Secciones Permitidas:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto p-1">
                  {MODULOS_DISPONIBLES.map((m) => {
                    const checked = rolNombre === 'Administrador' || rolModulos.includes(m.id);
                    const disabled = rolNombre === 'Administrador';
                    return (
                      <div
                        key={m.id}
                        onClick={() => !disabled && handleToggleModulo(m.id)}
                        className={`flex items-start space-x-3 p-3 rounded-xl border transition cursor-pointer ${
                          checked
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        <div className="mt-0.5">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{m.nombre}</p>
                          <p className="text-[11px] text-slate-500">{m.descripcion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRolModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRol}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {savingRol ? 'Guardando...' : 'Guardar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
