import { apiFetch, setCookie, deleteCookie, ApiError } from '@/lib/api';
import {
  LoginRequest,
  LoginResponseData,
  SignUpRequest,
  UserProfile,
  UpdateProfileRequest,
  ApiResponse,
  VerifyOtpRequest,
  ResendOtpRequest,
} from '@/types';

export const authService = {
  /**
   * Logs in a user: POST /auth/sign-in
   * Fallback: POST /memberships/sign-in
   */
  async signIn(data: LoginRequest): Promise<LoginResponseData> {
    let res: ApiResponse<LoginResponseData>;
    try {
      res = await apiFetch<LoginResponseData>('/auth/sign-in', {
        method: 'POST',
        body: data,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        res = await apiFetch<LoginResponseData>('/memberships/sign-in', {
          method: 'POST',
          body: data,
        });
      } else {
        throw err;
      }
    }

    const tokens = res.data;
    if (tokens?.access_token) {
      setCookie('access_token', tokens.access_token, 86400); // 24 hours
    }
    if (tokens?.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }

    return tokens || { access_token: '', refresh_token: '' };
  },

  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponseData>> {
    const tokens = await this.signIn(credentials);
    return {
      status: 200,
      message: 'login success',
      data: tokens,
    };
  },

  /**
   * Registers a new user: POST /auth/sign-up
   * Fallback: POST /memberships/sign-up
   */
  async signUp(data: SignUpRequest): Promise<ApiResponse<void>> {
    try {
      return await apiFetch<void>('/auth/sign-up', {
        method: 'POST',
        body: data,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return await apiFetch<void>('/memberships/sign-up', {
          method: 'POST',
          body: data,
        });
      }
      throw err;
    }
  },

  async register(data: SignUpRequest): Promise<ApiResponse<void>> {
    return await this.signUp(data);
  },

  /**
   * Verifies user OTP: POST /auth/verify-otp
   */
  async verifyOtp(data: VerifyOtpRequest): Promise<ApiResponse<void>> {
    try {
      return await apiFetch<void>('/auth/verify-otp', {
        method: 'POST',
        body: data,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return await apiFetch<void>('/memberships/verify-otp', {
          method: 'POST',
          body: data,
        });
      }
      throw err;
    }
  },

  /**
   * Resends OTP code to email: POST /auth/resend-otp
   */
  async resendOtp(data: ResendOtpRequest): Promise<ApiResponse<void>> {
    try {
      return await apiFetch<void>('/auth/resend-otp', {
        method: 'POST',
        body: data,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return await apiFetch<void>('/memberships/resend-otp', {
          method: 'POST',
          body: data,
        });
      }
      throw err;
    }
  },

  /**
   * Logs out user: calls POST /auth/sign-out then clears tokens and cookie
   */
  async logout(): Promise<void> {
    try {
      await apiFetch<void>('/auth/sign-out', {
        method: 'POST',
      });
    } catch {
      // ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        deleteCookie('access_token');
      }
    }
  },

  /**
   * Fetches current authenticated user profile: GET /accounts/profile
   * Fallback: GET /memberships/profile, GET /memberships/get-user
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const res = await apiFetch<UserProfile>('/accounts/profile');
      if (res.data) return res.data;
    } catch {
      // Fallback
    }

    try {
      const legacyRes = await apiFetch<UserProfile>('/memberships/profile');
      if (legacyRes.data) return legacyRes.data;
    } catch {
      // Fallback
    }

    try {
      const olderRes = await apiFetch<UserProfile>('/memberships/get-user');
      return olderRes.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Fetches profile by user ID: GET /accounts/profile/:id (or /profile/:id)
   */
  async getUserProfileById(userId: number | string): Promise<UserProfile | null> {
    try {
      const res = await apiFetch<UserProfile>(`/accounts/profile/${userId}`);
      if (res.data) return res.data;
    } catch {
      // Fallback
    }

    try {
      const directRes = await apiFetch<UserProfile>(`/profile/${userId}`);
      if (directRes.data) return directRes.data;
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
    try {
      return await apiFetch<UserProfile>('/accounts/edit/profile', {
        method: 'PUT',
        body: data,
      });
    } catch {
      return await apiFetch<UserProfile>('/memberships/profile', {
        method: 'PUT',
        body: data,
      });
    }
  },
};
