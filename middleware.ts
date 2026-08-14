// CANONICAL: Next.js middleware for RetainageRecover.
// Refreshes the Supabase session cookie on every request (getAll/setAll pattern
// required by @supabase/ssr), protects dashboard pages and API routes, and
// preserves full deep links (path + query) through the login flow.
// PATCH: /api/plans added to the public API list. It is the declared public
// pricing catalog (anon RLS read) and the landing page fetches it while
// signed out; without this the middleware 401s anonymous pricing reads.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PAGE_PREFIXES = [
  '/dashboard',
  '/projects',
  '/invoices',
  '/billing',
  '/settings',
  '/account',
]

const AUTH_PAGES = ['/login', '/signup', '/forgot-password']

// Public API surfaces: webhook receivers (none locally in central payments
// mode, kept for safety), auth flow endpoints like signout, and the public
// pricing catalog.
const PUBLIC_API_PREFIXES = ['/api/webhooks', '/api/auth', '/api/plans']

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// Open-redirect guard: internal paths only.
function safeInternalPath(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return null
  return raw
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    // Never crash the edge runtime over configuration: pass through.
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the session if needed. Keep no logic between client creation and
  // this call: refreshed cookies must land on every response we return.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Any redirect or JSON response we hand back must carry the refreshed
  // auth cookies, otherwise the session silently rots.
  const carryAuthCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  // API routes get JSON answers, never redirects.
  if (pathname.startsWith('/api')) {
    if (matchesPrefix(pathname, PUBLIC_API_PREFIXES)) {
      return supabaseResponse
    }
    if (!user) {
      return carryAuthCookies(
        NextResponse.json({ data: null, error: 'Please log in to do that.' }, { status: 401 })
      )
    }
    return supabaseResponse
  }

  // Signed-in users skip the auth pages.
  if (matchesPrefix(pathname, AUTH_PAGES) && user) {
    const target = safeInternalPath(request.nextUrl.searchParams.get('redirect')) ?? '/dashboard'
    return carryAuthCookies(NextResponse.redirect(new URL(target, request.url)))
  }

  // Protected pages: guests go to login with the FULL original destination
  // (path plus query string) preserved, so /invoices/abc?tab=sent survives.
  if (matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', `${pathname}${search}`)
    return carryAuthCookies(NextResponse.redirect(loginUrl))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf)$).*)',
  ],
}
