import { clearAuth, getToken } from "./auth";

/** Base URL for SpendWise API. Empty string uses Vite proxy in dev. */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

type ApiErrorBody = { error?: string };

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return body?.error ?? `Request failed (${res.status})`;
}

function authHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response, auth: boolean): Promise<T> {
  if (res.status === 401 && auth) {
    clearAuth();
  }
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string, auth = false): Promise<T> {
  const headers: HeadersInit = {};
  if (auth) {
    const token = getToken();
    if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers });
  return handleResponse<T>(res, auth);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  auth = false,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (auth) {
    const token = getToken();
    if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, auth);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  auth = false,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, auth);
}

export async function apiDelete(path: string, auth = false): Promise<void> {
  const headers: HeadersInit = {};
  if (auth) {
    const token = getToken();
    if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers,
  });
  await handleResponse<void>(res, auth);
}
