// CANONICAL Supabase session refresh helper for RetainageRecover.
// middleware.ts (owned by the auth step) imports updateSession from here.
// This file only refreshes the session and reports the user. Redirect
// decisions belong to middleware.ts, not to this helper.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Without configuration we cannot refresh sessions. Pass the request
    // through untouched; route handlers will surface a clear error.
    return { response, user: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() revalidates the token with Supabase. Do not replace this with
  // getSession(), which only reads the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
