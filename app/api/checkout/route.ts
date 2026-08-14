// CANONICAL: POST /api/checkout
// Central payments mode: this product holds NO Stripe key and imports NO
// Stripe SDK. We authenticate the buyer, load the plan from the database
// (prices live in retainagerecover_plans, never in env vars), then ask the
// central payments proxy for a Checkout URL. The central webhook writes
// retainagerecover_payments and flips retainagerecover_subscriptions.plan_key;
// this product only reads those tables.
// PATCH: cancel_url now uses ?checkout=cancelled to match what the billing
// client checks for; previously the cancel toast never fired.
//
// Contract for the client (billing page, pricing CTA):
//   POST /api/checkout   body: { "plan_key": "lifetime" }   (optional, defaults to "lifetime")
//   200 -> { data: { url: "https://checkout.stripe.com/..." }, error: null }  -> navigate to url
//   4xx/5xx -> { data: null, error: "human readable message" }
// After payment the buyer returns to /billing?checkout=success (or ?checkout=cancelled).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitCheck, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = 'retainagerecover'

export async function POST(request: Request) {
  const verdict = await rateLimitCheck('retainagerecover_billing', clientIp(request), 30, 2000)
  if (!verdict.allowed) {
    return NextResponse.json(
      { data: null, error: 'Too many requests for today. The counter resets tomorrow.' },
      { status: 429 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ data: null, error: 'Please log in to upgrade.' }, { status: 401 })
  }

  let planKey = 'lifetime'
  try {
    const body = await request.json()
    if (body && typeof body.plan_key === 'string') planKey = body.plan_key.trim().toLowerCase()
  } catch {
    // Empty body is fine: we default to the lifetime plan.
  }
  if (!/^[a-z0-9_-]{1,40}$/.test(planKey)) {
    return NextResponse.json({ data: null, error: 'That plan name does not look right.' }, { status: 400 })
  }

  // Server-side validation against the catalog: the client can never set a price.
  const { data: plan, error: planError } = await supabase
    .from('retainagerecover_plans')
    .select('plan_key, name, billing_type, price_cents, currency')
    .eq('plan_key', planKey)
    .eq('is_active', true)
    .maybeSingle()

  if (planError || !plan) {
    return NextResponse.json(
      { data: null, error: 'We could not find that plan. Refresh the page and try again.' },
      { status: 404 }
    )
  }
  if (plan.billing_type === 'free' || plan.price_cents <= 0) {
    return NextResponse.json(
      { data: null, error: 'The Free plan is already yours. Just start tracking projects.' },
      { status: 400 }
    )
  }

  // Never charge someone twice for a one time purchase.
  const { data: subscription } = await supabase
    .from('retainagerecover_subscriptions')
    .select('plan_key, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subscription?.plan_key === plan.plan_key) {
    return NextResponse.json(
      { data: null, error: 'You already own this plan. Every feature is unlocked.' },
      { status: 409 }
    )
  }

  const { data: existingPayment } = await supabase
    .from('retainagerecover_payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('plan_key', plan.plan_key)
    .eq('status', 'succeeded')
    .limit(1)
    .maybeSingle()

  if (existingPayment) {
    return NextResponse.json(
      {
        data: null,
        error: 'Your payment already went through. Access unlocks within a minute or two, no need to pay again.',
      },
      { status: 409 }
    )
  }

  const paymentsUrl = process.env.PAYMENTS_URL
  const proxyToken = process.env.PAYMENTS_PROXY_TOKEN
  if (!paymentsUrl || !proxyToken) {
    console.error('[checkout] central payments proxy is not configured')
    return NextResponse.json(
      { data: null, error: 'Checkout is warming up. Nothing was charged. Please try again in a minute.' },
      { status: 503 }
    )
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, '')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const proxyResponse = await fetch(paymentsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proxyToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        product_slug: PRODUCT_SLUG,
        price_id: plan.plan_key,
        user_id: user.id,
        user_email: user.email ?? undefined,
        plan_key: plan.plan_key,
        mode: plan.billing_type === 'recurring' ? 'subscription' : 'payment',
        amount_cents: plan.price_cents,
        currency: plan.currency,
        product_name: `RetainageRecover ${plan.name}`,
        success_url: `${siteUrl}/billing?checkout=success`,
        cancel_url: `${siteUrl}/billing?checkout=cancelled`,
        metadata: {
          product: PRODUCT_SLUG,
          plan_key: plan.plan_key,
          user_id: user.id,
        },
      }),
    })

    if (!proxyResponse.ok) {
      console.error(`[checkout] payments proxy responded ${proxyResponse.status}`)
      return NextResponse.json(
        { data: null, error: 'Our payment desk did not answer. Nothing was charged. Please try again in a minute.' },
        { status: 502 }
      )
    }

    const payload = await proxyResponse.json().catch(() => null)
    const checkoutUrl: unknown = payload?.url ?? payload?.data?.url

    if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('https://')) {
      console.error('[checkout] payments proxy returned no checkout url')
      return NextResponse.json(
        { data: null, error: 'We could not open checkout. Nothing was charged. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ data: { url: checkoutUrl }, error: null })
  } catch (err) {
    console.error('[checkout] payments proxy call failed', err)
    return NextResponse.json(
      { data: null, error: 'Checkout took too long to answer. Nothing was charged. Please try again.' },
      { status: 504 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
