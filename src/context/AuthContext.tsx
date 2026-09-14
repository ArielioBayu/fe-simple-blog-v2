"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import { UserProfile, LoginRequest } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    const profile = await authService.getUserProfile();
    if (profile) {
      setUser(profile);
      try {
        localStorage.setItem('username', profile.username);
      } catch {
        // ignore
      }
    } else {
      const storedName = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
      if (storedName) {
        setUser({
          id: 0,
          username: storedName,
          email: `${storedName}@example.com`,
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  useEffect(() => {
    let ignore = false;

    async function initAuth() {
      try {
        const profile = await authService.getUserProfile();
        if (!ignore) {
          if (profile) {
            setUser(profile);
            localStorage.setItem('username', profile.username);
          } else {
            const storedName = localStorage.getItem('username');
            if (storedName) {
              setUser({
                id: 0,
                username: storedName,
                email: `${storedName}@example.com`,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      ignore = true;
    };
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      await authService.signIn(credentials);
      await refreshProfile();
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
