/** Auth token helpers — memory + localStorage (MVP demo pattern). */

const TOKEN_KEY = "spendwise_token";

let memoryToken: string | null = null;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setAuth(token: string, user: AuthUser): void {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("spendwise_user", JSON.stringify(user));
  } catch {
    // private mode / storage blocked — memory still works for this session
  }
}

export function clearAuth(): void {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("spendwise_user");
  } catch {
    // ignore
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("spendwise_user");
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}
