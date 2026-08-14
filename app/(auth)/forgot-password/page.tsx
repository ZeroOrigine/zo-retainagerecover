'use client'

// CANONICAL: forgot password page for RetainageRecover.
// Sends a recovery email that lands on /auth/callback?next=/reset-password.
// Never confirms whether an email has an account (no enumeration).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function sendReset() {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    return error
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrorMsg(null)
    const error = await sendReset()
    setSubmitting(false)
    if (error) {
      setErrorMsg(`We could not send the reset email: ${error.message}. Please try again.`)
      return
    }
    setSent(true)
    setCooldown(60)
  }

  async function handleResend() {
    if (cooldown > 0) return
    setErrorMsg(null)
    setInfoMsg(null)
    const error = await sendReset()
    if (error) {
      setErrorMsg(`We could not resend the email: ${error.message}. Please try again.`)
      return
    }
    setInfoMsg('Sent again. Give it a minute, and peek in spam if it hides.')
    setCooldown(60)
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="zo-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Reset link on the way</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          If <span className="font-semibold text-slate-900">{email.trim()}</span> has a RetainageRecover account, a password reset link is heading to it now. It usually lands within a minute.
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

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="mt-5 text-sm font-semibold text-amber-700 underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend the email'}
        </button>

        <p className="mt-4 text-sm text-slate-600">
          <Link href="/login" className="font-semibold text-slate-800 underline-offset-2 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-slate-600">Type your email and we will send you a reset link.</p>

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMsg}
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
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Spinner /> Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-amber-700 underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
