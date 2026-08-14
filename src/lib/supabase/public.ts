import { createClient } from '@supabase/supabase-js';
import { PROJECT_CONFIG } from '@/lib/config';

// Public, read-only Supabase client for the ZeroOrigine flagship site.
//
// The flagship's ecosystem data (products, projects, spend, the machine's
// thoughts, the treasury, receipts) is PUBLIC and is exposed through read-only
// views (v_products, v_projects, v_cost_logs, v_pipeline_events, v_mind_logs,
// v_donations_public, v_ethics_reviews, v_config_public) plus the get_receipt
// RPC. None of it needs the service-role key, so this client uses the ANON key.
// That lets the flagship run with NO SUPABASE_SERVICE_ROLE_KEY at all — the
// service key stays with forked products, which need it for their own billing.
//
// cache:'no-store' keeps every read live (Next.js Data Cache otherwise freezes
// data at deploy time — the reason the registry once showed "deploy failed"
// days after launch).
export function createPublicClient() {
  return createClient(
    PROJECT_CONFIG.supabaseUrl,
    PROJECT_CONFIG.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    },
  );
}
