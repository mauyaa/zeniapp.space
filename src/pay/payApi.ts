import { payApiUrl } from '../lib/runtime';

export type PayUser = {
  id: string;
  name: string;
  role: 'user' | 'agent' | 'admin' | 'finance';
};

export type PayTransaction = {
  _id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  ref?: string;
  receiptId?: string;
  purpose?: string;
  referenceId?: string;
  createdAt?: string;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFlags?: string[];
  approvals?: Array<{ userId: string; action: string; at: string }>;
};

export type PayReceipt = {
  _id: string;
  transactionId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
  hash: string;
};

export type PaySession = {
  _id: string;
  userAgent?: string;
  ip?: string;
  createdAt?: string;
  lastUsedAt?: string;
  stepUpVerifiedAt?: string;
};

const ACCESS_KEY = 'pay_access_token';
const REFRESH_KEY = 'pay_refresh_token';
const USER_KEY = 'pay_user';

export function getStoredPayAuth() {
  try {
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as PayUser) : null;
    return { accessToken, refreshToken, user };
  } catch (err) {
    // Corrupt storage should not brick the pay portal; clear and continue.
    console.warn('Resetting corrupted pay auth storage', err);
    clearStoredPayAuth();
    return { accessToken: null, refreshToken: null, user: null };
  }
}

export function setStoredPayAuth(data: {
  accessToken: string;
  refreshToken: string;
  user: PayUser;
}) {
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearStoredPayAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredPayAuth();
  if (!refreshToken) return null;
  const res = await fetch(payApiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.accessToken && data?.refreshToken && data?.user) {
    setStoredPayAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.accessToken as string;
  }
  return null;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { accessToken } = getStoredPayAuth();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(payApiUrl(path), { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export const payApi = {
  login: (emailOrPhone: string, password: string) =>
    fetch(payApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone, password }),
    }).then((res) => {
      if (!res.ok) throw new Error('Login failed');
      return res.json() as Promise<{ accessToken: string; refreshToken: string; user: PayUser }>;
    }),
  me: () => request<{ user: PayUser }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  stepUp: (code: string) =>
    request<{ ok: boolean; verifiedAt: string }>('/auth/step-up', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  sessions: () => request<PaySession[]>('/auth/sessions'),
  logoutAll: () => request<void>('/auth/logout-all', { method: 'POST' }),
  initiatePayment: (
    payload: {
      amount: number;
      currency: string;
      method: string;
      phone?: string;
      purpose?: string;
      referenceId?: string;
    },
    idempotencyKey: string
  ) =>
    request<PayTransaction & { clientSecret?: string }>('/transactions/initiate', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    }),
  listTransactions: () => request<PayTransaction[]>('/transactions'),
  getTransaction: (id: string) => request<PayTransaction>(`/transactions/${id}`),
  getReceipt: (id: string) => request<PayReceipt>(`/receipts/${id}`),
  getAccount: () => request('/account'),
  updateAccount: (body: {
    defaultCurrency?: string;
    defaultMethod?: 'mpesa_stk' | 'card' | 'bank_transfer';
  }) => request('/account', { method: 'PATCH', body: JSON.stringify(body) }),
  reconcile: () =>
    request<{ pending: PayTransaction[]; failed: PayTransaction[] }>('/admin/reconcile'),
  resolve: (id: string, status: 'paid' | 'failed') =>
    request<PayTransaction | { pendingApproval: boolean; tx: PayTransaction; message?: string }>(
      `/admin/resolve/${id}`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      }
    ),
  refund: (id: string) =>
    request<PayTransaction | { pendingApproval: boolean; tx: PayTransaction; message?: string }>(
      `/admin/refund/${id}`,
      {
        method: 'POST',
      }
    ),
  insights: () =>
    request<{
      pending: number;
      stalePending: number;
      failed: number;
      missingReceipts: number;
      lastStaleRun?: string;
      lastReceiptScan?: string;
    }>('/admin/insights'),
};
