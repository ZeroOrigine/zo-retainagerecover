// CANONICAL Supabase server client for RetainageRecover.
// Used by Server Components, Server Actions, and Route Handlers.
//
// Uses the @supabase/ssr getAll/setAll cookie contract. Never use the
// deprecated get/set/remove adapter and never use
// @supabase/auth-helpers-nextjs, which is deprecated and has an
// incompatible cookie format.

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Thrown at request time, never at module load time, so builds without
    // runtime env vars still succeed.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is a no-op inside Server Components where the cookie
            // store is read only. Session refresh happens in middleware via
            // lib/supabase/middleware.ts, so this is safe to ignore.
          }
        },
      },
    }
  );
}

// Compatibility alias. The auth and billing route handlers were written
// against `const supabase = await createClient()`. Async wrapper keeps that
// call shape working while there is exactly one client construction path.
export async function createClient(): Promise<SupabaseClient> {
  return createSupabaseServerClient();
}

// Convenience helper for route handlers: one call returns both the
// RLS-scoped client and the verified user. getUser() validates the JWT
// against Supabase instead of trusting the cookie alone.
export async function getSessionUser(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
