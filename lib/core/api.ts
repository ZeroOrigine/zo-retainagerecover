// CANONICAL browser API helper and shared response shapes for RetainageRecover.
import type { ProfileRow, ProjectTotals } from '@/lib/db/types';

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  code: string | null;
  fields: Record<string, string> | null;
}

// [QA-006] Short-lived in-memory cache so quick navigations (dashboard -> projects)
// do not refire the same expensive endpoints. Browser-only; any mutation clears it.
const CACHE_TTL_MS = 15_000;
const CACHEABLE_PATHS = new Set<string>(['/api/me']);
const responseCache = new Map<string, { expires: number; result: ApiResult<unknown> }>();

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const cacheable =
    typeof window !== 'undefined' && method === 'GET' && CACHEABLE_PATHS.has(path);
  if (cacheable) {
    const hit = responseCache.get(path);
    if (hit && hit.expires > Date.now()) {
      return hit.result as ApiResult<T>;
    }
    if (hit) responseCache.delete(path);
  } else if (method !== 'GET') {
    // Mutations can change profile/usage/totals; drop any stale cached reads.
    responseCache.clear();
  }
  try {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      cache: 'no-store',
    });
    let body: {
      data?: T;
      error?: string;
      code?: string;
      fields?: Record<string, string>;
    } | null = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: body?.error ?? 'We hit a snag on our end. Give it a moment and try again.',
        code: body?.code ?? null,
        fields: body?.fields ?? null,
      };
    }
    const result: ApiResult<T> = {
      ok: true,
      status: res.status,
      data: (body?.data ?? null) as T,
      error: null,
      code: null,
      fields: null,
    };
    if (cacheable) {
      responseCache.set(path, { expires: Date.now() + CACHE_TTL_MS, result });
    }
    return result;
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'We could not reach the server. Check your connection and try again.',
      code: 'NETWORK',
      fields: null,
    };
  }
}

export interface MePlan {
  plan_key: string;
  plan_name: string;
  billing_type: string;
  price_cents: number;
  can_create_invoices: boolean;
}

export interface MeUsage {
  project_count: number;
  project_limit: number | null;
  can_add_project: boolean;
}

export interface MeData {
  profile: ProfileRow;
  plan: MePlan;
  usage: MeUsage;
  totals: ProjectTotals;
}
