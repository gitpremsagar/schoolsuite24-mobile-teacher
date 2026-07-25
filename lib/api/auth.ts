import {
  apiFetch,
  ApiRequestError,
  SessionExpiredError,
} from "@/lib/api/client";
import {
  clearTokens,
  emitSessionExpired,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/session";
import { assertApiUrl } from "@/lib/config";
import type { AuthResponse, PublicUser } from "@/lib/types";

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  if (!data.accessToken || !data.refreshToken) {
    await clearTokens();
    throw new Error(
      "Login response missing refreshToken. Redeploy the API so mobile can renew sessions.",
    );
  }
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST", auth: false });
  } finally {
    await clearTokens();
  }
}

export async function refreshSession() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearTokens();
    emitSessionExpired();
    throw new SessionExpiredError("Refresh token missing");
  }
  const base = assertApiUrl();
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = (await res.json().catch(() => ({}))) as AuthResponse & {
    error?: string;
  };
  if (!res.ok || !data.accessToken || !data.refreshToken) {
    await clearTokens();
    emitSessionExpired();
    throw new SessionExpiredError(data.error || "Failed to refresh session");
  }
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function getMe() {
  return apiFetch<{ user: PublicUser & Record<string, unknown> }>("/auth/me");
}

export { ApiRequestError, SessionExpiredError };
