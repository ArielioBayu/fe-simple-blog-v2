import { apiFetch, setCookie, deleteCookie } from '@/lib/api';
import {
  LoginRequest,
  LoginResponseData,
  SignUpRequest,
  UserProfile,
  UpdateProfileRequest,
  ApiResponse,
} from '@/types';

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

  /**
   * Fetches complete user profile and dynamic stats from backend.
   * Primary: /accounts/profile
   * Fallback: /accounts/user or /memberships/get-user
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const res = await apiFetch<UserProfile>('/accounts/profile');
      if (res.data) return res.data;
    } catch {
      // Fallback if /accounts/profile fails
    }

    try {
      const fallbackRes = await apiFetch<UserProfile>('/accounts/user');
      if (fallbackRes.data) return fallbackRes.data;
    } catch {
      // Fallback to legacy
    }

    try {
      const legacyRes = await apiFetch<UserProfile>('/memberships/get-user');
      return legacyRes.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Fetches profile by user ID: GET /accounts/profile/:id (or /accounts/user/:id)
   */
  async getUserProfileById(userId: number | string): Promise<UserProfile | null> {
    try {
      const res = await apiFetch<UserProfile>(`/accounts/profile/${userId}`);
      if (res.data) return res.data;
    } catch {
      // Fallback
    }

    try {
      const fallback = await apiFetch<UserProfile>(`/accounts/user/${userId}`);
      return fallback.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Updates user profile (bio, username, avatar_url, banner_url)
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    return await apiFetch<UserProfile>('/accounts/edit/profile', {
      method: 'PUT',
      body: data,
    });
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      deleteCookie('access_token');
    }
  },
};
