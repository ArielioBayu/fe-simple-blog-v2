export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9888';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (API_BASE_URL + '/api/v1');

/**
 * Resolves a backend relative media file path (e.g., "uploads/xxx.jpg")
 * to a fully qualified browser image URL.
 */
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

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;

  // Build headers
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Dual-auth support: Attach Bearer token from cookie if not already set
  const token = getCookie('access_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const { body, ...restOptions } = options;
  const fetchConfig: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include', // Vital for HttpOnly and Lax cookies
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

    // If 401 and we are not trying to log in or refresh token or logout
    if (
      response.status === 401 &&
      !path.includes('/sign-in') &&
      !path.includes('/sign-up') &&
      !path.includes('/refresh') &&
      !path.includes('/sign-out')
    ) {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          isRefreshing = false;
          logoutRedirect();
          throw new Error('Unauthorized');
        }

        try {
          let refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ token: refreshToken }),
          });

          if (!refreshRes.ok) {
            // Legacy fallback
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
            throw new Error('Refresh failed');
          }

          const refreshData = await refreshRes.json();
          // Extract token from standardized envelope or direct property
          const newAccessToken = refreshData.data?.access_token || refreshData.access_token;
          
          if (!newAccessToken) {
            throw new Error('Invalid refresh response');
          }

          // Save new token in cookie (24 hours)
          setCookie('access_token', newAccessToken, 86400);
          
          isRefreshing = false;
          onRefreshed(newAccessToken);
        } catch (refreshErr) {
          isRefreshing = false;
          localStorage.removeItem('refresh_token');
          deleteCookie('access_token');
          logoutRedirect();
          throw refreshErr;
        }
      }

      // Wait for refresh to complete, then retry
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryRes = await fetch(url, fetchConfig);
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => ({}));
              reject(new Error(errData.message || 'Request failed after refresh'));
            } else {
              resolve(await retryRes.json());
            }
          } catch (retryErr: unknown) {
            reject(retryErr instanceof Error ? retryErr : new Error(String(retryErr)));
          }
        });
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return { status: response.status, message: 'success' };
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }
}

function logoutRedirect() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}


