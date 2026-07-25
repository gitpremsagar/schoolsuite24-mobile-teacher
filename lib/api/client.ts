import {
  clearTokens,
  emitSessionExpired,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/session";
import { assertApiUrl } from "@/lib/config";
import type { ApiError } from "@/lib/types";

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export class SessionExpiredError extends ApiRequestError {
  constructor(message = "Session expired. Please sign in again.") {
    super(401, message, "SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function endSession(): Promise<never> {
  await clearTokens();
  emitSessionExpired();
  throw new SessionExpiredError();
}

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      const base = assertApiUrl();
      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!data.accessToken || !data.refreshToken) return null;
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const base = assertApiUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const useAuth = options.auth !== false;
  const token = options.token ?? (useAuth ? await getAccessToken() : null);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (res.status === 401 && useAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, token: refreshed });
    }
    await endSession();
  }
  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      data.error || "Request failed",
      data.code,
    );
  }
  return data;
}
