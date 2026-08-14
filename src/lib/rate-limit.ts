// THE SHARED RATE-LIMIT HELPER (security block, 2026-07-16). Every public
// write-or-expensive route calls this before doing work — the pipeline's
// RATE-LIMIT SCORECARD refuses to launch an unsafe public endpoint that
// neither calls it nor carries a `// rate-limit-exempt: <reason>` pragma.
//
// One durable Postgres primitive underneath (rate_limit_check RPC on the
// shared Supabase): atomic fixed-window counters, per-key AND global daily
// ceilings, keyed on the Netlify-set x-nf-client-connection-ip (unspoofable).
// Privacy: keys are stored as daily-rotating md5 pseudonyms, never raw IPs,
// and nothing outlives the day it counted.
//
// Usage in a route handler:
//   const verdict = await rateLimitCheck('myproduct_lesson', clientIp(request), 20, 500);
//   if (!verdict.allowed) return friendly429(verdict);

import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type RateVerdict = {
  allowed: boolean;
  reason: 'ok' | 'key_cap' | 'global_cap' | 'check_failed';
};

/** Platform-verified caller key: Netlify edge IP first, never a spoofable chain. */
export function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-nf-client-connection-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Durable shared rate limit. FAIL-CLOSED: if the check cannot run, the caller
 * waits — "could not check" is never "checked and fine" (Rule 14 at the
 * product layer; the shared model account is what this protects).
 */
export async function rateLimitCheck(
  bucket: string,
  key: string,
  limitPerWindow = 20,
  globalLimit = 500,
  windowSecs = 86400
): Promise<RateVerdict> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return { allowed: false, reason: 'check_failed' };
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc('rate_limit_check', {
      p_bucket: bucket,
      p_key: key,
      p_limit_per_window: limitPerWindow,
      p_window_secs: windowSecs,
      p_global_limit: globalLimit,
    });
    if (error || !data || typeof data.allowed !== 'boolean') {
      console.error('[rate-limit] check failed:', error?.message ?? 'no data');
      return { allowed: false, reason: 'check_failed' };
    }
    return {
      allowed: data.allowed,
      reason: (data.reason ?? (data.allowed ? 'ok' : 'key_cap')) as RateVerdict['reason'],
    };
  } catch (err) {
    console.error('[rate-limit] check threw:', err);
    return { allowed: false, reason: 'check_failed' };
  }
}
