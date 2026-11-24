import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, CheckCircle2, AlertCircle, KeyRound, Pencil, Lock, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

export const UsuariosView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states - Crear usuario
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<'Administrador' | 'Tesorero' | 'Consulta'>('Tesorero');
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
  const [editRol, setEditRol] = useState<'Administrador' | 'Tesorero' | 'Consulta'>('Tesorero');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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
      setRol('Tesorero');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    setUserForPassword(user);
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

  const handleOpenEditModal = (user: User) => {
    setUserForEdit(user);
    setEditNombre(user.nombre);
    setEditRol(user.rol);
    setEditNewPassword('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForEdit) return;
    if (!editNombre.trim()) {
      setEditError('El nombre no puede estar vacío.');
      return;
    }

    if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
      setEditError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await api.updateUser(userForEdit.id, {
        nombre: editNombre.trim(),
        rol: editRol,
        activo: userForEdit.activo,
        newPassword: editNewPassword.trim() || undefined,
      });
      setUserForEdit(null);
      loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Error al editar usuario.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (!window.confirm(`¿Deseas ${user.activo ? 'desactivar' : 'activar'} el usuario "${user.userName}"?`)) {
      return;
    }
    try {
      await api.toggleUserStatus(user.id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>Administración de Usuarios y Permisos</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de accesos, actualización de contraseñas y asignación de roles.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-xs"
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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.rol === 'Administrador'
                          ? 'bg-amber-100 text-amber-900'
                          : u.rol === 'Tesorero'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
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
                      {/* Botón Cambiar Contraseña */}
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal(u)}
                        className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition font-medium flex items-center space-x-1 text-[11px]"
                        title={`Cambiar contraseña de ${u.userName}`}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Contraseña</span>
                      </button>

                      {/* Botón Editar Datos */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        title={`Editar nombre y rol de ${u.userName}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      {/* Botón Activar / Desactivar */}
                      {u.userName.toLowerCase() !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition ${
                            u.activo ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
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

      {/* Modal Cambiar Contraseña */}
      {userForPassword && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-base">Actualizar Contraseña</h3>
                  <p className="text-xs text-amber-100 font-medium">Usuario: @{userForPassword.userName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserForPassword(null)}
                className="text-white/80 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setUserForPassword(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{savingPassword ? 'Guardando...' : 'Cambiar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {userForEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Editar Usuario</h3>
                <p className="text-xs text-amber-400">@{userForEdit.userName}</p>
              </div>
              <button
                type="button"
                onClick={() => setUserForEdit(null)}
                className="text-white/80 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol de Acceso *</label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Tesorero">Tesorero (Operativo: Conteos, Movimientos, Reportes)</option>
                  <option value="Administrador">Administrador (Total: Gestión de Cajas, Usuarios, Respaldos)</option>
                  <option value="Consulta">Consulta (Solo lectura)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nueva Contraseña (Opcional)
                </label>
                <input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="Dejar en blanco para conservar la actual"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Solo llena este campo si deseas cambiar su contraseña (mínimo 6 caracteres).
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setUserForEdit(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-slate-900 text-amber-400 font-bold rounded-lg text-xs shadow-xs transition disabled:opacity-50"
                >
                  {savingEdit ? 'Guardando...' : 'Actualizar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Registrar Nuevo Usuario</h3>
                <p className="text-xs text-amber-400">Credenciales de acceso al sistema</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Usuario (Login) *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ej. juan.tesorero"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rol en el Sistema *</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Tesorero">Tesorero (Operativo: Conteos, Movimientos, Reportes)</option>
                  <option value="Administrador">Administrador (Total: Gestión de Cajas, Usuarios, Respaldos)</option>
                  <option value="Consulta">Consulta (Solo lectura)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 text-amber-400 font-bold rounded-lg text-xs"
                >
                  {submitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
