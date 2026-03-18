import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginService, logout as logoutService, register as registerService } from '../services/authService';
import { getCurrentUser, UserProfile } from '../services/userService';
import { getToken } from '../services/tokenService';

interface AuthContextData {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
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
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  async function login(email: string, password: string) {
    await loginService(email, password);
    const profile = await getCurrentUser();
    setUser(profile);
  }

  async function register(name: string, email: string, password: string) {
    await registerService(name, email, password);
    const profile = await getCurrentUser();
    setUser(profile);
  }

  async function logout() {
    await logoutService();
    setUser(null);
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
