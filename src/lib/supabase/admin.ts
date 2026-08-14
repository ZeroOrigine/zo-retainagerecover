import { createClient } from '@supabase/supabase-js';
import { PROJECT_CONFIG, SERVER_CONFIG } from '@/lib/config';

// Every admin read must be LIVE. Next.js caches fetch() in its Data Cache;
// on pages without a `revalidate` export that froze registry data at the
// last deploy (RigFile showed "deploy failed" days after it was launched).
// cache:'no-store' at the client level makes every page that reads through
// this client correct by construction. No per-page revalidate to remember.
export function createAdminClient() {
  return createClient(
    PROJECT_CONFIG.supabaseUrl,
    SERVER_CONFIG.supabaseServiceRoleKey,
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
