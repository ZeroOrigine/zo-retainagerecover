'use client'

// CANONICAL: reset password page. Users land here from the recovery email
// after /auth/callback (or /auth/confirm) establishes their session. If the
// link expired, we guide them back to /forgot-password instead of erroring.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'no_session' | 'done'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setStatus(user ? 'ready' : 'no_session')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'done') return
    const timer = setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1600)
    return () => clearTimeout(timer)
  }, [status, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setErrorMsg(null)
    if (password.length < 8) {
      setErrorMsg('Use at least 8 characters for your new password.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Those two passwords do not match. Type them again.')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      const raw = error.message.toLowerCase()
      if (raw.includes('should be different') || raw.includes('different from the old')) {
        setErrorMsg('Your new password matches the old one. Pick something different.')
      } else {
        setErrorMsg(`We could not update your password: ${error.message}. Please try again.`)
      }
      return
    }
    setStatus('done')
  }

  if (status === 'checking') {
    return <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
  }

  if (status === 'no_session') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="zo-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">This reset link expired</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Reset links work once and for a short window. Request a new one and you will be back in within a minute.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99]"
        >
          Request a new link
        </Link>
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/login" className="font-semibold text-slate-800 underline-offset-2 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="zo-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-slate-600">You are logged in. Taking you to your dashboard now.</p>
        <button
          type="button"
          onClick={() => {
            router.push('/dashboard')
            router.refresh()
          }}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99]"
        >
          Go to dashboard now
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-slate-600">Make it something you will remember at 6 AM on a job site.</p>

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            New password
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
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
            Type it again
          </label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same password"
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
              <Spinner /> Updating...
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </div>
  )
}
