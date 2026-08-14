// CANONICAL: GET /auth/callback
// Exchanges the ?code= from OAuth sign-ins and default Supabase email links
// for a session, then forwards to the validated internal destination.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function siteBase(requestUrl: URL): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin).replace(/\/+$/, '')
}

function safeInternalPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return null
  return raw
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const base = siteBase(url)
  const code = url.searchParams.get('code')
  const next = safeInternalPath(url.searchParams.get('next')) ?? '/dashboard'

  // Provider-side failures (user canceled consent, provider misconfigured).
  if (url.searchParams.get('error') || url.searchParams.get('error_description')) {
    return NextResponse.redirect(`${base}/login?error=oauth`)
  }

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=confirm_invalid`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${base}/login?error=auth_callback`)
  }

  return NextResponse.redirect(`${base}${next}`)
}
