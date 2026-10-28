const BASE: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const ACCESS_TOKEN_KEY = 'agritrace_access_token';
const REFRESH_TOKEN_KEY = 'agritrace_refresh_token';

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/** Typed fetch wrapper with JWT bearer injection and automatic token refresh. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAccessToken();
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the AgriTrace API. Is the backend running?');
  }

  // Attempt token refresh on 401 if we have a refresh token and did not already fail on an auth route
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = (await refreshRes.json()) as {
              data: { accessToken: string; refreshToken: string };
            };
            setStoredTokens(data.data.accessToken, data.data.refreshToken);
            onRefreshed(data.data.accessToken);
            isRefreshing = false;

            // Retry original request with new token
            headers.set('Authorization', `Bearer ${data.data.accessToken}`);
            res = await fetch(`${BASE}${path}`, { ...init, headers });
          } else {
            clearStoredTokens();
            isRefreshing = false;
          }
        } catch {
          clearStoredTokens();
          isRefreshing = false;
        }
      } else {
        // Wait for active refresh
        const newToken = await new Promise<string>((resolve) => {
          refreshSubscribers.push(resolve);
        });
        headers.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(`${BASE}${path}`, { ...init, headers });
      }
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string; code?: string };
    } | null;
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  }

  const body = (await res.json()) as { data: T };
  return body.data;
}

export const formatKg = (grams: number): string =>
  `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
