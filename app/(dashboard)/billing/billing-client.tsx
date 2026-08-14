'use client';

// CANONICAL billing client: plan status, one-time upgrade, checkout return handling.
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/core/api';
import { formatMoney } from '@/lib/core/format';
import { zoEvent } from '@/components/ZoBeacon';
import type { PlanRow } from '@/lib/db/types';

interface BillingStatusData {
  entitlement: string;
  is_lifetime: boolean;
  pending_upgrade: boolean;
  plan: PlanRow | null;
  plans: PlanRow[];
  usage: { projects_used: number; project_limit: number | null };
  latest_payment: {
    amount_cents: number;
    currency: string;
    status: string;
    paid_at: string | null;
    receipt_url: string | null;
    plan_key: string;
  } | null;
}

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');
  const [me, setMe] = useState<BillingStatusData | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);
  const firedPayment = useRef(false);

  function showToast(msg: string, tone: 'ok' | 'err' = 'ok') {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 6000);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    const res = await apiFetch<BillingStatusData>('/api/billing/status');
    if (!res.ok || !res.data) {
      setLoadError(res.error ?? 'We hit a snag loading billing.');
      setLoading(false);
      return;
    }
    setMe(res.data);
    setPlans(res.data.plans ?? []);
    setLoading(false);
    return res.data;
  }

  useEffect(() => {
    async function boot() {
      const current = await load();
      if (checkout === 'success' && !firedPayment.current) {
        firedPayment.current = true;
        zoEvent('payment');
        router.replace('/billing');
        showToast('Payment received. Unlocking Lifetime now.');
        if (current && current.entitlement === 'free') {
          setConfirming(true);
          for (let attempt = 0; attempt < 5; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            const statusRes = await apiFetch<BillingStatusData>('/api/billing/status');
            if (statusRes.ok && statusRes.data) {
              setMe(statusRes.data);
              setPlans(statusRes.data.plans ?? []);
              if (statusRes.data.entitlement !== 'free') break;
            }
          }
          setConfirming(false);
        }
      }
      if (checkout === 'cancelled') {
        showToast('No charge was made. Your projects are right where you left them.');
      }
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout]);

  async function startCheckout(planKey: string) {
    setUpgrading(true);
    const res = await apiFetch<{ url?: string; checkout_url?: string }>('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_key: planKey }),
    });
    const url = res.data?.url ?? res.data?.checkout_url ?? null;
    if (!res.ok || !url) {
      setUpgrading(false);
      showToast(res.error ?? 'We could not start checkout. Give it a moment and try again.', 'err');
      return;
    }
    window.location.href = url;
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 w-48 rounded-lg bg-slate-200 shimmer" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-72 rounded-xl bg-slate-200 shimmer" />
          <div className="h-72 rounded-xl bg-slate-200 shimmer" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <button onClick={() => load()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Try again</button>
      </div>
    );
  }

  const isLifetime = me?.is_lifetime ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-slate-900 sm:text-3xl">Billing</h1>
        <p className="mt-1 text-slate-600">Pay once, keep it forever. No subscription, no monthly bill.</p>
      </div>

      {(confirming || me?.pending_upgrade) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-800">Confirming your payment with Stripe. This usually takes a few seconds.</p>
        </div>
      )}

      {isLifetime && (
        <div className="rr-pop rounded-2xl bg-emerald-600 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">You are on {me?.plan?.name ?? 'Lifetime'}</p>
          <p className="mt-1 text-2xl font-bold">Unlimited projects and ready-to-send invoices, forever.</p>
          <p className="mt-1 text-emerald-100">One payment, every future update included. Go collect that retainage.</p>
          {me?.latest_payment && (
            <p className="mt-3 text-sm text-emerald-100">
              Paid {formatMoney(me.latest_payment.amount_cents / 100)}
              {me.latest_payment.paid_at ? ` on ${new Date(me.latest_payment.paid_at).toLocaleDateString()}` : ''}.{' '}
              {me.latest_payment.receipt_url && (
                <a href={me.latest_payment.receipt_url} target="_blank" rel="noreferrer" className="font-semibold underline">
                  View receipt
                </a>
              )}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = me?.entitlement === plan.plan_key;
          const isPaid = plan.billing_type !== 'free';
          return (
            <div
              key={plan.plan_key}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${isPaid ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-slate-900">{plan.name}</h2>
                {isCurrent && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">Current plan</span>}
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {plan.price_cents === 0 ? 'Free' : formatMoney(plan.price_cents / 100)}
                {plan.price_cents > 0 && <span className="text-sm font-medium text-slate-500"> once</span>}
              </p>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {(plan.features ?? []).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 text-emerald-600" aria-hidden="true">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {isPaid && !isCurrent && (
                <button
                  onClick={() => startCheckout(plan.plan_key)}
                  disabled={upgrading}
                  className="mt-6 rounded-lg bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
                >
                  {upgrading ? 'Opening checkout...' : `Buy Lifetime: ${formatMoney(plan.price_cents / 100)} once`}
                </button>
              )}
              {isCurrent && !isPaid && (
                <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  You are using {me?.usage.projects_used} of {me?.usage.project_limit ?? 'unlimited'} free projects.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">Payments are processed by Stripe. One retainage release usually covers the price many times over.</p>

      {toast && (
        <div className={`rr-pop fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
