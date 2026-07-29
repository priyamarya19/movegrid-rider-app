import { API_BASE_URL } from '@/constants/config';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Global 401 handling — the auth context registers signOut here on mount.
type UnauthorizedHandler = (code?: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

const TIMEOUT_MS = 15000;

async function apiFetch<T>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'rider-mobile',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && opts.token) unauthorizedHandler?.(data?.code);
    if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data?.code);
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError('Network timeout — try again', 0);
    throw new ApiError('No connection — check your internet', 0);
  } finally {
    clearTimeout(timer);
  }
}

// ---- Auth ----

export function requestOtp(mobile: string) {
  return apiFetch<{ ok: boolean; channel: string }>('/api/rider-auth/request-otp', {
    method: 'POST',
    body: { mobile },
  });
}

export function verifyOtp(mobile: string, otp: string) {
  return apiFetch<{ ok: boolean; token: string; name: string; tester?: boolean }>('/api/rider-auth/verify', {
    method: 'POST',
    body: { mobile, otp },
  });
}

// ---- UAT tester mode (server 404s these on production) ----

export type TestRider = { id: string; name: string; rider_code: string | null; mobile: string; ev_number: string | null };

export function getTestRiders(testerToken: string) {
  return apiFetch<{ riders: TestRider[] }>('/api/rider-auth/test-riders', { token: testerToken });
}

export function testLoginAs(testerToken: string, riderId: string) {
  return apiFetch<{ ok: boolean; token: string; name: string }>('/api/rider-auth/test-login', {
    method: 'POST',
    body: { rider_id: riderId },
    token: testerToken,
  });
}

// ---- Me ----

export type RiderMe = {
  name: string;
  rider_code: string | null;
  mobile: string;
  hub: { name: string; city: string | null } | null;
  vehicle: { ev_number: string; model: string | null; assigned_date: string; allotment_code: string | null } | null;
};

export function getMe(token: string) {
  return apiFetch<RiderMe>('/api/rider/me', { token });
}

export type RentWeek = {
  week_no: number;
  period_start: string;
  period_end: string;
  due_date: string | null;
  amount: number;
  paid: number;
  status: 'Collected' | 'Partial' | 'Overdue' | 'Pending';
};

export type RiderRent = {
  has_active_assignment: boolean;
  daily_rent: number | null;
  rent_credit: number;
  paid_through_date: string | null;
  next_due_date: string | null;
  outstanding_now: number;
  weeks: RentWeek[];
  payments: { amount: number; mode: string | null; date: string; period_start: string | null; period_end: string | null }[];
  total_paid: number;
};

export function getMyRent(token: string) {
  return apiFetch<RiderRent>('/api/rider/me/rent', { token });
}
