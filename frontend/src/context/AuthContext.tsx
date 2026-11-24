import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface AuthUser {
  userName: string;
  nombre: string;
  rol: 'Administrador' | 'Tesorero' | 'Consulta';
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isTesorero: boolean;
  canOperate: boolean;
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
      userName: res.userName,
      nombre: res.nombre,
      rol: res.rol,
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

  const isAdmin = user?.rol === 'Administrador';
  const isTesorero = user?.rol === 'Tesorero' || isAdmin;
  const canOperate = isAdmin || user?.rol === 'Tesorero';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isTesorero, canOperate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
