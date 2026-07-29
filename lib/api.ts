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
  opts: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; token?: string | null } = {}
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
  return apiFetch<{ ok: boolean; channel: string; exists?: boolean }>('/api/rider-auth/request-otp', {
    method: 'POST',
    body: { mobile },
  });
}

export function verifyOtp(mobile: string, otp: string) {
  return apiFetch<{ ok: boolean; token: string; name: string; tester?: boolean; new_rider?: boolean }>('/api/rider-auth/verify', {
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
  status: string;
  hub: { name: string; city: string | null } | null;
  vehicle: { ev_number: string; model: string | null; assigned_date: string; allotment_code: string | null } | null;
  kyc: { submitted: boolean; docs_verified: boolean; vehicle_pref: 'low_speed' | 'high_speed' | null };
  documents: {
    pan: { on_file: boolean; verified: boolean };
    dl: { on_file: boolean; verified: boolean };
  };
};

/** Add or replace PAN / DL after KYC (each needs number + photo together). */
export function updateDocuments(
  token: string,
  body: { pan?: string; pan_key?: string; dl_number?: string; dl_front_key?: string; dl_back_key?: string }
) {
  return apiFetch<{ ok: boolean }>('/api/rider/me/documents', { method: 'PATCH', body, token });
}

export type KycSubmission = {
  name: string;
  current_address: string;
  permanent_address?: string;
  employer?: string;
  vehicle_pref: 'low_speed' | 'high_speed';
  aadhaar: string;
  pan?: string;
  dl_number?: string;
  family_ref_name: string;
  family_ref_mobile: string;
  local_ref_name?: string;
  local_ref_mobile?: string;
  bank: string;
  ifsc: string;
  account_number: string;
  profile_photo_key?: string;
  aadhaar_front_key: string;
  aadhaar_back_key: string;
  pan_key?: string;
  dl_front_key?: string;
  dl_back_key?: string;
};

export function submitKyc(token: string, body: KycSubmission) {
  return apiFetch<{ ok: boolean }>('/api/rider/me/kyc', { method: 'PATCH', body, token });
}

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

// ---- Payment claims ----

export type PaymentClaim = {
  id: string;
  amount: number;
  utr: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  date: string;
};

export function getMyClaims(token: string) {
  return apiFetch<{ claims: PaymentClaim[] }>('/api/rider/me/payment-claims', { token });
}

export function submitPaymentClaim(token: string, body: { amount: number; utr?: string | null; screenshot_key: string }) {
  return apiFetch<{ ok: boolean; claim_id: string }>('/api/rider/me/payment-claims', {
    method: 'POST',
    body,
    token,
  });
}

/** Upload an image (payment proof or KYC doc); returns the S3 key. */
export async function uploadScreenshot(token: string, uri: string, purpose: 'claims' | 'kyc' = 'claims'): Promise<{ key: string }> {
  const form = new FormData();
  form.append('purpose', purpose);
  if (uri.startsWith('data:') || uri.startsWith('blob:')) {
    // Web (Expo web preview): picker returns a blob/data URI.
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'proof.jpg');
  } else {
    // Native: React Native FormData file descriptor.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', { uri, name: 'proof.jpg', type: 'image/jpeg' } as any);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // photo over 2G needs headroom
  try {
    const res = await fetch(`${API_BASE_URL}/api/rider/me/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data?.error ?? 'Upload failed', res.status, data?.code);
    return data as { key: string };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('Upload failed — check your internet', 0);
  } finally {
    clearTimeout(timer);
  }
}
