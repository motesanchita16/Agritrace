import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearStoredTokens, getStoredAccessToken, setStoredTokens } from './api';
import type { AuthResponse, AuthUser, Role } from '../types/api';

const USER_STORAGE_KEY = 'agritrace_auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, role: Role) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as AuthUser;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync user from backend /auth/me on initial load if token exists
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    api<{ user: AuthUser }>('/auth/me')
      .then((res) => {
        setUser(res.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
      })
      .catch(() => {
        // Token is invalid/expired
        clearStoredTokens();
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredTokens(res.accessToken, res.refreshToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: Role,
  ): Promise<AuthUser> => {
    const res = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    setStoredTokens(res.accessToken, res.refreshToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      clearStoredTokens();
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const res = await api<{ user: AuthUser }>('/auth/me');
      setUser(res.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch {
      // If refresh fails, user might be suspended/deleted
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
