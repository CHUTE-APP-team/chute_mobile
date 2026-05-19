import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { login as loginService, logout as logoutService, register as registerService } from '../services/authService';
import { getCurrentUser, UserProfile } from '../services/userService';
import { getToken, removeToken } from '../services/tokenService';

interface AuthContextData {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const token = await getToken();
        if (token) {
          const profile = await getCurrentUser();
          setUser(profile);
        }
      } catch (err) {
        console.warn('[AuthContext] Failed to restore session, clearing token:', err);
        await removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  async function login(email: string, password: string) {
    await loginService(email, password);
    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch (err) {
      console.warn('[AuthContext] login: failed to fetch profile after login:', err);
      throw err;
    }
  }

  async function register(name: string, email: string, password: string, role?: string) {
    await registerService(name, email, password, role);
    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch (err) {
      console.warn('[AuthContext] register: failed to fetch profile after register:', err);
      throw err;
    }
  }

  async function logout() {
    await logoutService();
    setUser(null);
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
