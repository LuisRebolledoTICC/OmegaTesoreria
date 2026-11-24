import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { User, RolPersonalizado } from '../types';
import { api } from '../services/api';

const MODULOS_DISPONIBLES = [
  { id: 'dashboard', nombre: 'Dashboard General', descripcion: 'Panel general con balances y gráficos' },
  { id: 'ventas', nombre: 'Ventas y Pedidos', descripcion: 'Gestión de jornadas de venta, productos, pedidos y entradas' },
  { id: 'cajas', nombre: 'Cajas de Tesorería', descripcion: 'Listado, creación y configuración de cajas' },
  { id: 'conteo', nombre: 'Conteo Físico de Efectivo', descripcion: 'Arqueos y desglose de monedas, billetes y bolsas' },
  { id: 'operaciones', nombre: 'Movimientos por Caja', descripcion: 'Entradas, salidas y transferencias' },
  { id: 'reportes', nombre: 'Reportes y Excel', descripcion: 'Auditorías y exportación de archivos Excel' },
  { id: 'usuarios', nombre: 'Usuarios y Permisos', descripcion: 'Gestión de usuarios y personalización de roles' },
];

export const UsuariosView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RolPersonalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState<string>('Tesorero');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
    setEditNombre(u.nombre);
    setEditRol(u.rol);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForEdit) return;

    if (!editNombre.trim()) {
      setEditError('El nombre completo es requerido.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await api.updateUser(userForEdit.id, {
        nombre: editNombre.trim(),
        rol: editRol,
        activo: userForEdit.activo,
      });
      setUserForEdit(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar usuario.');
    } finally {
      setSavingEdit(false);
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
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-700">Cuentas Registradas en el Sistema</h3>
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Nombre Completo</th>
                  <th className="p-3">Rol de Acceso</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha de Creación</th>
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
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
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
                            className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition font-medium flex items-center space-x-1 text-[11px]"
                            title="Cambiar contraseña de este usuario"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Contraseña</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-medium flex items-center space-x-1 text-[11px]"
                            title="Editar datos del usuario"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          {u.userName.toLowerCase() !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                                u.activo ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
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
      )}

      {/* SUBTAB 2: ROLES Y PERMISOS DE MÓDULOS */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
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
              Modifica el nombre y rol para <strong className="text-slate-800">{userForEdit.userName}</strong>.
            </p>

            {editError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
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
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear / Configurar Rol */}
      {showRolModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
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
