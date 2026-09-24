import { getFriendlyErrorMessage, isNetworkError, NETWORK_ERROR_MESSAGE } from './errors';
export { getFriendlyErrorMessage, HTTP_ERROR_MESSAGES, isNetworkError, NETWORK_ERROR_MESSAGE } from './errors';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9888';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (API_BASE_URL + '/api/v1');

export function getMediaUrl(filePath?: string | null): string | null {
  if (!filePath || typeof filePath !== 'string') return null;
  const trimmed = filePath.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  // Replace Windows backslashes with forward slashes for valid URL paths
  const normalized = trimmed.replace(/\\/g, '/');
  const cleanPath = normalized.replace(/^\/+/, '');
  return `${API_BASE_URL}/${cleanPath}`;
}

export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
  pagination?: {
    limit: number;
    offset: number;
  };
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

// Helper to get cookies on client side
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Helper to set cookies on client side
export function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

// Helper to clear cookies
export function deleteCookie(name: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function isTokenExpired(token: string | null, bufferSeconds = 10): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return false;
    // Buffer of bufferSeconds (default 10s) before actual expiration to prevent race conditions
    return Date.now() >= (decoded.exp * 1000 - bufferSeconds * 1000);
  } catch {
    return true;
  }
}

export function isAuthEndpoint(path: string): boolean {
  return (
    path.includes('/sign-in') ||
    path.includes('/sign-up') ||
    path.includes('/login') ||
    path.includes('/register') ||
    path.includes('/verify-otp') ||
    path.includes('/resend-otp') ||
    path.includes('/refresh') ||
    path.includes('/sign-out') ||
    path.includes('/logout')
  );
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Concurrency-safe: return existing in-flight refresh promise if already underway
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        logoutRedirect();
        return null;
      }

      let refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!refreshRes.ok) {
        // Fallback for legacy backend route
        refreshRes = await fetch(`${BASE_URL}/memberships/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token: refreshToken }),
        });
      }

      if (!refreshRes.ok) {
        throw new Error('Refresh token invalid or expired');
      }

      const refreshData = await refreshRes.json();
      const newAccessToken: string | undefined =
        refreshData.data?.access_token || refreshData.access_token;

      if (!newAccessToken) {
        throw new Error('Invalid refresh response payload');
      }

      // Save new token in cookie (24 hours)
      setCookie('access_token', newAccessToken, 86400);

      // If backend rotated refresh_token, persist it
      const newRefreshToken: string | undefined =
        refreshData.data?.refresh_token || refreshData.refresh_token;
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken);
      }

      return newAccessToken;
    } catch {
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
      deleteCookie('access_token');
      logoutRedirect();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;

  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 1. Proactive Token Refresh:
  // If not a public auth endpoint, ensure we have a valid non-expired access token before sending request
  if (!isAuthEndpoint(path) && typeof window !== 'undefined') {
    let currentToken = getCookie('access_token');
    const hasRefreshToken = !!localStorage.getItem('refresh_token');

    // If access token is missing or expired, but we have a refresh token, refresh it proactively
    if (hasRefreshToken && (!currentToken || isTokenExpired(currentToken))) {
      currentToken = await refreshAccessToken();
    }

    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
  } else {
    const token = getCookie('access_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const { body, ...restOptions } = options;
  const fetchConfig: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include',
  };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData || typeof body === 'string' || body instanceof Blob || body instanceof ArrayBuffer) {
      fetchConfig.body = body as BodyInit;
    } else {
      fetchConfig.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, fetchConfig);

    // 2. Reactive 401 fallback (in case token was revoked server-side or clock skew occurred)
    if (response.status === 401 && !isAuthEndpoint(path)) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        throw new ApiError('Sesi Anda telah berakhir. Silakan masuk kembali.', 401);
      }

      headers.set('Authorization', `Bearer ${newToken}`);
      try {
        const retryResponse = await fetch(url, { ...fetchConfig, headers });
        if (!retryResponse.ok) {
          const errData = await retryResponse.json().catch(() => ({}));
          const friendlyMsg = errData.message || getFriendlyErrorMessage(retryResponse.status);
          throw new ApiError(friendlyMsg, retryResponse.status, errData);
        }

        const contentType = retryResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return (await retryResponse.json()) as ApiResponse<T>;
        }
        return { status: retryResponse.status, message: 'success' } as unknown as ApiResponse<T>;
      } catch (retryErr: unknown) {
        if (retryErr instanceof ApiError) throw retryErr;
        // If retrying a stream/FormData throws a TypeError, do not let it masquerade as a network outage
        throw new ApiError('Sesi berhasil diperbarui. Silakan ulangi tindakan Anda.', 401);
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const backendMsg: string | undefined = errData.message;
      const friendlyMsg = backendMsg || getFriendlyErrorMessage(response.status);
      throw new ApiError(friendlyMsg, response.status, errData);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return { status: response.status, message: 'success' };
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (isNetworkError(err)) {
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }
}

export function logoutRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    deleteCookie('access_token');
    if (
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/register' &&
      window.location.pathname !== '/verify-otp'
    ) {
      window.location.href = '/login?session=expired';
    }
  }
}


