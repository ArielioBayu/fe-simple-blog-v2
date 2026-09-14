import { apiFetch, setCookie, deleteCookie } from '@/lib/api';
import { LoginRequest, LoginResponseData, SignUpRequest, UserProfile, ApiResponse } from '@/types';

export const authService = {
  async signIn(data: LoginRequest): Promise<LoginResponseData> {
    const res = await apiFetch<LoginResponseData>('/memberships/sign-in', {
      method: 'POST',
      body: data,
    });

    const tokens = res.data;
    if (tokens?.access_token) {
      setCookie('access_token', tokens.access_token, 86400); // 24 hours
    }
    if (tokens?.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }

    return tokens || { access_token: '', refresh_token: '' };
  },

  async signUp(data: SignUpRequest): Promise<ApiResponse<void>> {
    return await apiFetch<void>('/memberships/sign-up', {
      method: 'POST',
      body: data,
    });
  },

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const res = await apiFetch<UserProfile>('/memberships/get-user');
      return res.data || null;
    } catch {
      return null;
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      deleteCookie('access_token');
    }
  },
};
