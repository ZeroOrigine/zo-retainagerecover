// CANONICAL: POST /api/auth/signout
// POST only (CSRF hygiene: state changes never ride GET). Clears the caller's
// Supabase session and sends them home with a 303 so form posts land on GET /.
// rate-limit-exempt: session-scoped idempotent signout; it only clears the caller's own session cookie
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, '')
  return NextResponse.redirect(`${base}/`, { status: 303 })
}
