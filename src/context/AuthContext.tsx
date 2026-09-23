"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import { UserProfile, LoginRequest, UpdateProfileRequest } from '@/types';

import { getCookie } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;  
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const profile = await authService.getUserProfile();
      if (profile) {
        setUser(profile);
        try {
          localStorage.setItem('username', profile.username);
        } catch {
          // ignore
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function initAuth() {
      try {
        const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refresh_token');
        const hasAccessToken = typeof window !== 'undefined' && !!getCookie('access_token');

        // If no tokens exist at all, user is definitely unauthenticated
        if (!hasRefreshToken && !hasAccessToken) {
          if (!ignore) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Validate session with backend
        const profile = await authService.getUserProfile();
        if (!ignore) {
          if (profile) {
            setUser(profile);
            try {
              localStorage.setItem('username', profile.username);
            } catch {
              // ignore
            }
          } else {
            // Sesi kedaluwarsa atau token tidak valid -> bersihkan sesi & redirect
            setUser(null);
            authService.logout();
          }
        }
      } catch {
        if (!ignore) {
          setUser(null);
          authService.logout();
        }
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

  const updateProfile = async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const res = await authService.updateProfile(data);
    const updated = res.data;
    if (updated) {
      setUser(updated);
      try {
        localStorage.setItem('username', updated.username);
      } catch {
        // ignore
      }
      return updated;
    }
    await refreshProfile();
    return user!;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.replace('/login');
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
        updateProfile,
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
