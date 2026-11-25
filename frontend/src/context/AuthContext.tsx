import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface AuthUser {
  id?: number;
  userName: string;
  nombre: string;
  rol: string;
  roles?: string[];
  modulosPermitidos?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  updateSession: (res: { id?: number; token: string; userName: string; nombre: string; rol: string; roles?: string[]; modulosPermitidos?: string[] }) => void;
  hasRole: (roleName: string) => boolean;
  isAdmin: boolean;
  isTesorero: boolean;
  canOperate: boolean;
  canAccessModule: (modulo: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('omega_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('omega_token');
  });

  const login = async (u: string, p: string) => {
    const res = await api.login(u, p);
    const authUser: AuthUser = {
      id: res.id,
      userName: res.userName,
      nombre: res.nombre,
      rol: res.rol,
      roles: res.roles,
      modulosPermitidos: res.modulosPermitidos,
    };
    setUser(authUser);
    setToken(res.token);
    localStorage.setItem('omega_user', JSON.stringify(authUser));
    localStorage.setItem('omega_token', res.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('omega_user');
    localStorage.removeItem('omega_token');
  };

  const updateSession = (res: { id?: number; token: string; userName: string; nombre: string; rol: string; roles?: string[]; modulosPermitidos?: string[] }) => {
    const authUser: AuthUser = {
      id: res.id,
      userName: res.userName,
      nombre: res.nombre,
      rol: res.rol,
      roles: res.roles,
      modulosPermitidos: res.modulosPermitidos,
    };
    setUser(authUser);
    setToken(res.token);
    localStorage.setItem('omega_user', JSON.stringify(authUser));
    localStorage.setItem('omega_token', res.token);
  };

  const getUserRoles = (): string[] => {
    if (!user) return [];
    if (user.roles && user.roles.length > 0) return user.roles;
    return (user.rol || '')
      .split(/[,;|]/)
      .map((r) => r.trim())
      .filter(Boolean);
  };

  const hasRole = (roleName: string): boolean => {
    return getUserRoles().some((r) => r.toLowerCase() === roleName.toLowerCase());
  };

  const isAdmin = hasRole('Administrador');
  const isTesorero = hasRole('Tesorero') || isAdmin;
  const canOperate = isAdmin || hasRole('Tesorero') || (user?.modulosPermitidos?.includes('conteo') ?? false);

  const canAccessModule = (modulo: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (user.modulosPermitidos && user.modulosPermitidos.length > 0) {
      return user.modulosPermitidos.includes(modulo);
    }
    // Fallback por defecto si no vienen modulos explícitos
    if (modulo === 'dashboard' || modulo === 'cajas' || modulo === 'reportes') return true;
    if (modulo === 'conteo' || modulo === 'operaciones' || modulo === 'entradas') return isTesorero;
    if (modulo === 'usuarios') return isAdmin;
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateSession, hasRole, isAdmin, isTesorero, canOperate, canAccessModule }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
