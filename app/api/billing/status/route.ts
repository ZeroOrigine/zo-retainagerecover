// CANONICAL: GET /api/billing/status
// The single source of truth for the client's view of billing and usage.
// The usage numbers follow the EXACT rule the database trigger
// retainagerecover_enforce_project_limit applies: total projects per user
// compared against the plan's project_limit (NULL means unlimited). Do not
// invent a different counting rule anywhere in the UI.
//
// Response contract:
// {
//   data: {
//     product: 'retainagerecover',
//     entitlement: 'free' | 'lifetime',
//     is_lifetime: boolean,
//     pending_upgrade: boolean,   // a succeeded payment exists but the webhook has not flipped the plan yet
//     plan: { plan_key, name, description, billing_type, price_cents, currency, project_limit, features, sort_order } | null,
//     plans: PlanRow[],           // active catalog, sorted, for rendering upgrade UI from the database
//     subscription: { plan_key, status, current_period_end, cancel_at_period_end } | null,
//     usage: { projects_used, project_limit, projects_remaining, can_add_project },
//     latest_payment: { amount_cents, currency, status, paid_at, receipt_url, plan_key } | null
//   },
//   error: null
// }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PlanRow = {
  plan_key: string
  name: string
  description: string
  billing_type: string
  price_cents: number
  currency: string
  project_limit: number | null
  features: unknown
  sort_order: number
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ data: null, error: 'Please log in to see your billing.' }, { status: 401 })
  }

  const [subscriptionResult, plansResult, projectCountResult, paymentResult] = await Promise.all([
    supabase
      .from('retainagerecover_subscriptions')
      .select('plan_key, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('retainagerecover_plans')
      .select('plan_key, name, description, billing_type, price_cents, currency, project_limit, features, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('retainagerecover_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('retainagerecover_payments')
      .select('amount_cents, currency, status, paid_at, receipt_url, plan_key')
      .eq('user_id', user.id)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (plansResult.error) {
    console.error('[billing/status] failed to load plans', plansResult.error)
    return NextResponse.json(
      { data: null, error: 'We could not load your billing details. Please try again.' },
      { status: 500 }
    )
  }

  const plans = (plansResult.data ?? []) as PlanRow[]
  const subscription = subscriptionResult.data ?? null

  // Entitlement mirrors what the database trigger enforces: subscriptions.plan_key.
  const entitlement = subscription?.plan_key ?? 'free'
  const plan =
    plans.find((p) => p.plan_key === entitlement) ?? plans.find((p) => p.plan_key === 'free') ?? null

  const projectsUsed = projectCountResult.count ?? 0
  const projectLimit = plan?.project_limit ?? null
  const projectsRemaining = projectLimit === null ? null : Math.max(0, projectLimit - projectsUsed)
  const canAddProject = projectLimit === null || projectsUsed < projectLimit

  const latestPayment = paymentResult.data ?? null
  const pendingUpgrade = Boolean(latestPayment && latestPayment.plan_key !== entitlement)

  return NextResponse.json({
    data: {
      product: 'retainagerecover',
      entitlement,
      is_lifetime: entitlement === 'lifetime',
      pending_upgrade: pendingUpgrade,
      plan,
      plans,
      subscription,
      usage: {
        projects_used: projectsUsed,
        project_limit: projectLimit,
        projects_remaining: projectsRemaining,
        can_add_project: canAddProject,
      },
      latest_payment: latestPayment,
    },
    error: null,
  })
}
