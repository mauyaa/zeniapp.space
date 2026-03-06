const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_USER_KEY = 'auth_user';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getSafeStorage = (kind: 'local' | 'session'): StorageLike | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const safeGet = (kind: 'local' | 'session', key: string): string | null => {
  const storage = getSafeStorage(kind);
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (kind: 'local' | 'session', key: string, value: string): void => {
  const storage = getSafeStorage(kind);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore quota or blocked storage errors.
  }
};

const safeRemove = (kind: 'local' | 'session', key: string): void => {
  const storage = getSafeStorage(kind);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore blocked storage errors.
  }
};

const getFromAnyStorage = (key: string): string | null =>
  safeGet('session', key) ?? safeGet('local', key);

export type StoredAuthUser = {
  id: string;
  name: string;
  role: 'user' | 'agent' | 'admin';
  availability?: 'active' | 'paused';
  agentVerification?: string;
  mfaEnabled?: boolean;
  avatarUrl?: string;
};

export function getStoredToken(): string | null {
  return getFromAnyStorage(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return getFromAnyStorage(REFRESH_TOKEN_KEY);
}

export function getStoredAuthUser(): StoredAuthUser | null {
  const raw = getFromAnyStorage(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function persistAuthSession(
  payload: { token: string; refreshToken?: string; user?: StoredAuthUser },
  rememberMe: boolean
): void {
  const target: 'local' | 'session' = rememberMe ? 'local' : 'session';
  const other: 'local' | 'session' = rememberMe ? 'session' : 'local';

  safeSet(target, TOKEN_KEY, payload.token);
  safeRemove(other, TOKEN_KEY);

  if (payload.refreshToken) {
    safeSet(target, REFRESH_TOKEN_KEY, payload.refreshToken);
    safeRemove(other, REFRESH_TOKEN_KEY);
  } else {
    safeRemove(target, REFRESH_TOKEN_KEY);
    safeRemove(other, REFRESH_TOKEN_KEY);
  }

  if (payload.user) {
    safeSet(target, AUTH_USER_KEY, JSON.stringify(payload.user));
    safeRemove(other, AUTH_USER_KEY);
  }
}

export function clearStoredAuthSession(): void {
  safeRemove('local', TOKEN_KEY);
  safeRemove('local', REFRESH_TOKEN_KEY);
  safeRemove('local', AUTH_USER_KEY);
  safeRemove('session', TOKEN_KEY);
  safeRemove('session', REFRESH_TOKEN_KEY);
  safeRemove('session', AUTH_USER_KEY);
}

export function isSessionBackedAuth(): boolean {
  return Boolean(safeGet('session', TOKEN_KEY));
}
