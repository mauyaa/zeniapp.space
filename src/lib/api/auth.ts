/**
 * Auth API — login, register, sessions, password reset, MFA.
 */

import { request, clearTokens } from './client';

export type AuthResponse = {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    role: 'user' | 'agent' | 'admin';
    availability?: 'active' | 'paused';
    agentVerification?: string;
  };
};

export function login(emailOrPhone: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrPhone, password }),
  });
}

export function loginWithGoogle(credential: string) {
  return request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export function register(body: Record<string, unknown>) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function me() {
  return request<{
    user: AuthResponse['user'];
  }>('/auth/me');
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' }).finally(() => clearTokens());
}

export function listAuthSessions() {
  return request<{
    sessions: Array<{
      _id: string;
      userAgent?: string;
      ip?: string;
      createdAt?: string;
      lastUsedAt?: string;
      stepUpVerifiedAt?: string;
    }>;
  }>('/auth/sessions');
}

export function revokeAuthSession(id: string) {
  return request<void>(`/auth/sessions/${id}`, { method: 'DELETE' });
}

export function revokeAllAuthSessions() {
  return request<void>('/auth/sessions/logout-all', { method: 'POST' }).finally(() =>
    clearTokens()
  );
}

export function forgotPassword(emailOrPhone: string) {
  return request<{ status: string; resetToken?: string; expiresAt?: string }>(
    '/auth/password/forgot',
    { method: 'POST', body: JSON.stringify({ emailOrPhone }) }
  );
}

export function resetPassword(token: string, password: string) {
  return request<{
    token: string;
    refreshToken?: string;
    user: { id: string; name: string; role: 'user' | 'agent' | 'admin' };
    refreshExpiresAt?: string;
  }>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// Admin MFA / step-up
export function adminStepUp(code: string) {
  return request<{ ok: boolean; verifiedAt: string }>('/auth/step-up', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function adminMfaSetup() {
  return request<{ secret: string; otpauthUrl: string }>('/auth/mfa/setup');
}

export function adminMfaEnable(secret: string, token: string) {
  return request<{ ok: boolean; recoveryCodes: string[] }>('/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ secret, token }),
  });
}

export function adminMfaDisable(code: string) {
  return request<{ ok: boolean }>('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
