// CANONICAL: GET /auth/confirm
// Handles Supabase email links that carry token_hash + type (the recommended
// email template format). The sibling /auth/callback handles ?code= links.
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
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
  // #1057: recovery links carry the session in the URL FRAGMENT (invisible to
  // this server route, re-attached by the browser across redirects). Route
  // recovery traffic to the reset page BEFORE any param validation.
  const zoRecover = new URL(request.url)
  if (zoRecover.searchParams.get('type') === 'recovery' && !zoRecover.searchParams.get('token_hash') && !zoRecover.searchParams.get('code')) {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  const url = new URL(request.url)
  const base = siteBase(url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = safeInternalPath(url.searchParams.get('next'))

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${base}/login?error=confirm_invalid`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(`${base}/login?error=confirm_failed`)
  }

  if (type === 'recovery') {
    return NextResponse.redirect(`${base}${next ?? '/reset-password'}`)
  }

  return NextResponse.redirect(`${base}${next ?? '/dashboard'}`)
}
