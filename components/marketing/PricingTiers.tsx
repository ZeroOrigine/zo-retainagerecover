'use client'

// CANONICAL: shared marketing pricing cards for RetainageRecover.
// PATCH: the previous version invented Pro/$29 and Enterprise/$99 monthly
// plans that do not exist. The product sells exactly two plans (Free and $49
// one-time Lifetime). These cards now fetch the REAL catalog from /api/plans
// so marketing can never drift from what checkout sells, with a fallback that
// mirrors the seed exactly. If the seed changes, change FALLBACK_PLANS in the
// same commit.

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface MarketingPlan {
  plan_key: string
  name: string
  description: string
  billing_type: string
  price_cents: number
  project_limit: number | null
  features: string[]
}

const FALLBACK_PLANS: MarketingPlan[] = [
  {
    plan_key: 'free',
    name: 'Free',
    description:
      'Track your first projects, see the exact date each retainage release becomes eligible, and preview your release invoice.',
    billing_type: 'free',
    price_cents: 0,
    project_limit: 3,
    features: [
      'Track up to 3 projects',
      'Automatic retainage math',
      'Release eligibility countdown',
      'Release invoice preview',
      'No credit card required',
    ],
  },
  {
    plan_key: 'lifetime',
    name: 'Lifetime',
    description:
      'Pay once and keep it. Unlimited projects and ready-to-send release invoices for every closeout.',
    billing_type: 'one_time',
    price_cents: 4900,
    project_limit: null,
    features: [
      'Unlimited projects',
      'Ready-to-send release invoices',
      'Automatic invoice numbering',
      'Sent and paid tracking',
      'Every future update included',
    ],
  },
]

function CheckIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round' className='mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' aria-hidden='true'>
      <path d='M5 13l4 4L19 7' />
    </svg>
  )
}

function priceLabel(cents: number): string {
  if (cents === 0) return '$0'
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

export default function PricingTiers() {
  const [plans, setPlans] = useState<MarketingPlan[]>(FALLBACK_PLANS)

  useEffect(() => {
    let cancelled = false
    fetch('/api/plans', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const rows = body?.data?.plans
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return
        const mapped: MarketingPlan[] = rows.map((row: Record<string, unknown>) => ({
          plan_key: String(row.plan_key ?? ''),
          name: String(row.name ?? ''),
          description: String(row.description ?? ''),
          billing_type: String(row.billing_type ?? 'free'),
          price_cents: Number(row.price_cents ?? 0),
          project_limit: row.project_limit === null ? null : Number(row.project_limit),
          features: Array.isArray(row.features) ? row.features.map(String) : [],
        }))
        if (mapped.every((p) => p.plan_key && p.name)) setPlans(mapped)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <div className='mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2'>
        {plans.map((plan) => {
          const isPaid = plan.billing_type !== 'free' && plan.price_cents > 0
          return (
            <div
              key={plan.plan_key}
              className={
                'relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm lg:p-8 dark:bg-slate-900 ' +
                (isPaid ? 'border-amber-500 shadow-lg ring-1 ring-amber-500' : 'border-slate-200 dark:border-slate-800')
              }
            >
              {isPaid ? (
                <span className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-950'>
                  Pay once, keep it
                </span>
              ) : null}
              <h3 className='text-lg font-semibold text-slate-900 dark:text-white'>{plan.name}</h3>
              <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{plan.description}</p>
              <div className='mt-6 flex items-baseline gap-2'>
                <span className='text-4xl font-bold tracking-tight text-slate-900 dark:text-white'>{priceLabel(plan.price_cents)}</span>
                <span className='text-sm text-slate-500 dark:text-slate-400'>{isPaid ? 'one payment, yours forever' : 'forever'}</span>
              </div>
              <ul className='mt-6 flex-1 space-y-3'>
                {plan.features.map((feature) => (
                  <li key={feature} className='flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300'>
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={isPaid ? '/signup?redirect=/billing' : '/signup'}
                className={
                  'mt-8 inline-flex min-h-[44px] items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition ' +
                  (isPaid
                    ? 'bg-amber-500 text-slate-950 shadow-md hover:-translate-y-0.5 hover:bg-amber-400'
                    : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800')
                }
              >
                {isPaid ? `Get ${plan.name}` : 'Start free'}
              </Link>
            </div>
          )
        })}
      </div>

      <p className='mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500 dark:text-slate-400'>
        The free plan is a real plan: full retainage math, the eligibility countdown, and invoice previews for up to 3 projects. Lifetime is a single payment processed by Stripe. No subscription, nothing recurring. Prices in USD.
      </p>
    </div>
  )
}
