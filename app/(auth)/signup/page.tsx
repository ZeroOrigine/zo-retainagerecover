'use client'

// CANONICAL: signup page for RetainageRecover.
// Three fields at most (company optional, email, password), email confirmation
// flow with a celebration state, OAuth parity with login, and the signup
// beacon (zoEvent) fired exactly once on success.

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zoEvent } from '@/components/ZoBeacon'

// QA-032: no segment-config export here — Next.js only officially honors
// `export const dynamic` in server files, and this is a 'use client' file,
// so the export could silently stop working across versions. The <Suspense>
// boundary around <SignupForm> already prevents the build CSR-bail for
// useSearchParams (parity with the login page).

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

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeInternalPath(searchParams.get('redirect'))

  const [stage, setStage] = useState<'form' | 'check'>('form')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [alreadyExists, setAlreadyExists] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const beaconFired = useRef(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const loginHref =
    redirectTo === '/dashboard' ? '/login' : `/login?redirect=${encodeURIComponent(redirectTo)}`

  function fireSignupBeacon() {
    if (beaconFired.current) return
    beaconFired.current = true
    try {
      zoEvent('signup')
    } catch {
      // The beacon never blocks the user.
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setErrorMsg(null)
    setAlreadyExists(false)

    if (password.length < 8) {
      setErrorMsg('Use at least 8 characters for your password.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        data: company.trim() ? { company_name: company.trim() } : undefined,
      },
    })

    if (error) {
      const raw = error.message.toLowerCase()
      if (raw.includes('already registered')) {
        setErrorMsg('You already have an account with this email. Log in instead, or reset your password if you forgot it.')
        setAlreadyExists(true)
      } else {
        setErrorMsg(`We could not create your account: ${error.message}. Please try again.`)
      }
      setSubmitting(false)
      return
    }

    // Supabase obfuscates existing confirmed accounts: user comes back with
    // zero identities. Treat it honestly and point the person to login.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setErrorMsg('You already have an account with this email. Log in instead, or reset your password if you forgot it.')
      setAlreadyExists(true)
      setSubmitting(false)
      return
    }

    fireSignupBeacon()

    if (data.session) {
      // Email confirmation is off: straight to the product.
      router.push(redirectTo)
      router.refresh()
      return
    }

    setSentTo(email.trim())
    setStage('check')
    setResendCooldown(60)
    setSubmitting(false)
  }

  async function handleResend() {
    if (resendCooldown > 0 || !sentTo) return
    setInfoMsg(null)
    setErrorMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: sentTo,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setErrorMsg(`We could not resend the email: ${error.message}`)
      return
    }
    setInfoMsg('Fresh link sent. Give it a minute, and peek in spam if it hides.')
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
      setErrorMsg(`We could not start that sign up: ${error.message}`)
      setOauthLoading(null)
    }
  }

  if (stage === 'check') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="zo-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We sent a confirmation link to <span className="font-semibold text-slate-900">{sentTo}</span>. Click it and your account is live, free plan ready the moment you land.
        </p>

        {infoMsg && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            {infoMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="mt-5 flex justify-center gap-3 text-sm">
          <a
            href="https://mail.google.com/mail/u/0/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-3.5 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Open Gmail
          </a>
          <a
            href="https://outlook.live.com/mail/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-3.5 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Open Outlook
          </a>
        </div>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="mt-5 text-sm font-semibold text-amber-700 underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
        >
          {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend the email'}
        </button>

        <p className="mt-3 text-xs text-slate-500">
          Wrong address?{' '}
          <button type="button" onClick={() => setStage('form')} className="font-semibold text-slate-700 underline underline-offset-2">
            Use a different email
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Start collecting your retainage</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Create a free account, add a project, and know the exact day you can invoice the release.
      </p>

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMsg}
          {alreadyExists && (
            <Link href={loginHref} className="mt-2 block font-semibold text-red-900 underline underline-offset-2">
              Go to login
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-slate-700">
            Company name <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="company"
            type="text"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Smith Electrical LLC"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          <p className="mt-1.5 text-xs text-slate-500">Shows on your release invoices. You can add it later.</p>
        </div>
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
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
          <p className={`mt-1.5 text-xs ${password.length >= 8 ? 'text-emerald-600' : 'text-slate-500'}`}>
            {password.length >= 8 ? 'Good password length.' : 'Use at least 8 characters.'}
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Spinner /> Creating your account...
            </>
          ) : (
            'Create free account'
          )}
        </button>
        <p className="text-center text-xs text-slate-500">Free plan, no card needed.</p>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or sign up with
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
        Already have an account?{' '}
        <Link href={loginHref} className="font-semibold text-amber-700 underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />}>
      <SignupForm />
    </Suspense>
  )
}
