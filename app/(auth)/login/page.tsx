'use client'

// CANONICAL: login page for RetainageRecover.
// Email + password plus Google OAuth. Honors ?redirect= deep links
// set by middleware. useSearchParams is wrapped in <Suspense> (Next 14 rule).
// CSRF note: all auth calls ride Supabase SameSite cookies over same-origin
// fetches; no cross-site form posts touch session state.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Note: no `export const dynamic` here — Next only honors segment config in
// server files, and exporting it from a 'use client' module can silently
// break across versions (#QA-026). The <Suspense> boundary around the
// useSearchParams reader already keeps `next build` from CSR-bailing.

const ERROR_COPY: Record<string, string> = {
  confirm_invalid: 'That link was missing some pieces. Open the newest email we sent and try again.',
  confirm_failed:
    'That confirmation link expired or was already used. Log in below, or enter your email and resend a fresh one.',
  auth_callback: 'We could not finish signing you in. Please try again.',
  oauth: 'That sign in method did not go through. Try again, or use your email and password.',
}

const MESSAGE_COPY: Record<string, string> = {
  password_updated: 'Password updated. Log in with your new password.',
}

function safeInternalPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '/dashboard'
  return raw
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeInternalPath(searchParams.get('redirect'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    const code = searchParams.get('error')
    if (!code) return null
    return ERROR_COPY[code] ?? 'Something on our side hiccuped. Please try again.'
  })
  const [infoMsg, setInfoMsg] = useState<string | null>(() => {
    const code = searchParams.get('message')
    return code ? MESSAGE_COPY[code] ?? null : null
  })
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrorMsg(null)
    setInfoMsg(null)
    setNeedsConfirmation(false)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (error) {
      const raw = error.message.toLowerCase()
      if (raw.includes('invalid login credentials')) {
        setErrorMsg('That email and password do not match our records. Check for typos, or reset your password below.')
      } else if (raw.includes('email not confirmed')) {
        setErrorMsg('Your email is not confirmed yet. Click the link we sent you, or resend it now.')
        setNeedsConfirmation(true)
      } else {
        setErrorMsg(`That did not work: ${error.message}. Please try again.`)
      }
      setSubmitting(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleResendConfirmation() {
    if (resendCooldown > 0 || !email.trim()) return
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setErrorMsg(`We could not resend the email: ${error.message}`)
      return
    }
    setErrorMsg(null)
    setInfoMsg(`Fresh confirmation link sent to ${email.trim()}. It can take a minute to arrive.`)
    setNeedsConfirmation(false)
    setResendCooldown(60)
  }

  async function handleOAuth(provider: 'google') {
    setOauthLoading(provider)
    setErrorMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setErrorMsg(`We could not start that sign in: ${error.message}`)
      setOauthLoading(null)
    }
  }

  const signupHref =
    redirectTo === '/dashboard' ? '/signup' : `/signup?redirect=${encodeURIComponent(redirectTo)}`

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-slate-600">Log in to see which releases are ready to invoice.</p>

      {infoMsg && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {infoMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMsg}
          {needsConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendCooldown > 0}
              className="mt-2 block font-semibold text-red-900 underline underline-offset-2 disabled:no-underline disabled:opacity-60"
            >
              {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend confirmation email'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourcompany.com"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-amber-700 underline-offset-2 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-16 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Spinner /> Logging in...
            </>
          ) : (
            'Log in'
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or continue with
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={oauthLoading !== null}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {oauthLoading === 'google' ? <Spinner /> : <GoogleIcon />} Google
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link href={signupHref} className="font-semibold text-amber-700 underline-offset-2 hover:underline">
          Create your free account
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />}>
      <LoginForm />
    </Suspense>
  )
}
