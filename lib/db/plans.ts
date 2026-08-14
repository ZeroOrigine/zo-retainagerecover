// CANONICAL plan catalog and entitlement authority for RetainageRecover.
//
// Every quota or capability decision in the product flows through
// getEntitlement. Billing status surfaces, dashboards, and API guards import
// from this file instead of re-implementing counts, so there is exactly one
// definition of "how many projects does this account have and what is it
// allowed to do".
//
// The project count here intentionally mirrors the database trigger
// retainagerecover_enforce_project_limit: it counts every project row the
// user owns, in every status, archived included. If one side changes, change
// both, or quotas will drift.
//
// Entitlement flows from subscriptions.plan_key alone. The Stripe webhook
// (auth step, service role) is the only writer of plan_key, so plan_key is
// the single entitlement source for both this code and the database trigger.

import type { SupabaseClient } from '@supabase/supabase-js';
import { translateDatabaseError } from '@/lib/db/errors';
import type { Entitlement, PlanRow } from '@/lib/db/types';

const PLAN_COLUMNS =
  'id, plan_key, name, description, billing_type, price_cents, currency, project_limit, features, is_active, sort_order';

export async function listActivePlans(
  supabase: SupabaseClient
): Promise<PlanRow[]> {
  const { data, error } = await supabase
    .from('retainagerecover_plans')
    .select(PLAN_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load pricing right now. Give it a moment and try again.'
    );
  }
  return (data ?? []) as PlanRow[];
}

export async function getPlanByKey(
  supabase: SupabaseClient,
  planKey: string
): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from('retainagerecover_plans')
    .select(PLAN_COLUMNS)
    .eq('plan_key', planKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not load that plan right now. Give it a moment and try again.'
    );
  }
  return (data as PlanRow | null) ?? null;
}

// Authoritative project count. Counts all statuses, matching the database
// trigger exactly. Never count by created_at, status subsets, or any other
// derived rule anywhere else in the product.
export async function countProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('retainagerecover_projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw translateDatabaseError(
      error,
      'We could not check your project count. Give it a moment and try again.'
    );
  }
  return count ?? 0;
}

export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string
): Promise<Entitlement> {
  const [{ data: subscription, error: subscriptionError }, projectCount] =
    await Promise.all([
      supabase
        .from('retainagerecover_subscriptions')
        .select('plan_key, status')
        .eq('user_id', userId)
        .maybeSingle(),
      countProjects(supabase, userId),
    ]);

  if (subscriptionError) {
    throw translateDatabaseError(
      subscriptionError,
      'We could not load your plan. Give it a moment and try again.'
    );
  }

  const planKey = (subscription?.plan_key as string | undefined) ?? 'free';

  let plan = await getPlanByKey(supabase, planKey);
  if (!plan && planKey !== 'free') {
    plan = await getPlanByKey(supabase, 'free');
  }

  // Mirror the trigger fallback: when no plan row resolves at all, the
  // trigger's limit stays NULL, which means unlimited.
  const projectLimit = plan ? plan.project_limit : null;
  const billingType = plan?.billing_type ?? 'free';

  return {
    plan_key: plan?.plan_key ?? planKey,
    plan_name: plan?.name ?? 'Free',
    billing_type: billingType,
    price_cents: plan?.price_cents ?? 0,
    project_limit: projectLimit,
    project_count: projectCount,
    can_add_project: projectLimit === null || projectCount < projectLimit,
    // Persisted, numbered, ready-to-send release invoices are a paid
    // capability. Free accounts see the invoice preview rendered from
    // project data in the UI instead.
    can_create_invoices: billingType !== 'free',
  };
}
