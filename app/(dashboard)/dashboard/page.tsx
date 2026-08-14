'use client';

// CANONICAL dashboard: how much retainage is out there and what is claimable today.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type MeData } from '@/lib/core/api';
import { formatMoney, formatDate, eligibilityLabel, eligibilityTone } from '@/lib/core/format';
import type { ProjectWithEligibility } from '@/lib/db/types';

interface ProjectListData {
  projects: ProjectWithEligibility[];
  total: number;
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your dashboard">
      <div className="h-9 w-72 rounded-lg bg-slate-200 shimmer" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200 shimmer" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-slate-200 shimmer" />
    </div>
  );
}

export default function DashboardPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [projects, setProjects] = useState<ProjectWithEligibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const meRes = await apiFetch<MeData>('/api/me');
    if (!meRes.ok) {
      setError(meRes.error ?? 'We hit a snag loading your dashboard.');
      setLoading(false);
      return;
    }
    const all: ProjectWithEligibility[] = [];
    let pageNum = 1;
    const limit = 100;
    // Fetch every eligible-sorted page so users with >100 projects see complete lists.
    for (;;) {
      const listRes = await apiFetch<ProjectListData>(`/api/projects?eligible=true&limit=${limit}&page=${pageNum}`);
      if (!listRes.ok) {
        setError(listRes.error ?? 'We hit a snag loading your dashboard.');
        setLoading(false);
        return;
      }
      const page = listRes.data?.projects ?? [];
      all.push(...page);
      const total = listRes.data?.total ?? all.length;
      pageNum += 1;
      if (page.length === 0 || all.length >= total) break;
    }
    setMe(meRes.data);
    setProjects(all);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={load} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
          Try again
        </button>
      </div>
    );
  }

  const totals = me?.totals;
  const eligible = projects.filter((p) => p.is_eligible);
  const upcoming = projects
    .filter((p) => p.status === 'active' && p.days_until_eligible !== null && p.days_until_eligible > 0)
    .sort((a, b) => (a.days_until_eligible ?? 0) - (b.days_until_eligible ?? 0));
  const missingDate = projects.filter((p) => p.status === 'active' && p.release_eligible_date === null);

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rr-pop rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Your money is waiting on a date</p>
          <h1 className="mt-2 text-3xl text-slate-900 sm:text-4xl">Never leave retainage behind again.</h1>
          <p className="mt-4 text-lg text-slate-600">
            A 10% hold on an $85,000 job is <span className="font-semibold text-emerald-600">$8,500</span> of your money sitting with the GC after closeout. Most subs forget to bill for it. You will not.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Add the job', d: 'Contract value, retainage %, completion date. Takes 30 seconds.' },
              { n: '2', t: 'We do the math', d: 'The exact dollars held and the exact date you can bill for them.' },
              { n: '3', t: 'Send the invoice', d: 'A numbered release invoice, ready on the eligible date.' },
            ].map((s) => (
              <div key={s.n} className="rounded-xl bg-slate-50 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">{s.n}</span>
                <p className="mt-2 font-semibold text-slate-900">{s.t}</p>
                <p className="mt-1 text-sm text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
          <Link
            href="/projects"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Track your first project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl text-slate-900 sm:text-3xl">Your retainage money</h1>
        <p className="mt-1 text-slate-600">
          You are tracking {totals?.outstanding_count ?? 0} job{(totals?.outstanding_count ?? 0) === 1 ? '' : 's'} with{' '}
          <span className="font-semibold text-slate-900">{formatMoney(totals?.outstanding_amount)}</span> in retainage still out there.
        </p>
      </div>

      {eligible.length > 0 && (
        <div className="rr-pop rounded-2xl bg-emerald-600 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">Claimable today</p>
          <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatMoney(totals?.eligible_now_amount)}</p>
          <p className="mt-1 text-emerald-100">
            {eligible.length} release{eligible.length === 1 ? ' is' : 's are'} past the eligible date. Send the invoices and bring it home.
          </p>
        </div>
      )}

      <section aria-label="Retainage totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">Eligible now</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatMoney(totals?.eligible_now_amount)}</p>
          <p className="mt-1 text-xs text-emerald-600">{totals?.eligible_now_count ?? 0} project{(totals?.eligible_now_count ?? 0) === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-700">On the way</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{formatMoney(totals?.upcoming_amount)}</p>
          <p className="mt-1 text-xs text-amber-600">{totals?.upcoming_count ?? 0} release{(totals?.upcoming_count ?? 0) === 1 ? '' : 's'} counting down</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-medium text-orange-700">Needs a date</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">{formatMoney(totals?.missing_date_amount)}</p>
          <p className="mt-1 text-xs text-orange-600">{totals?.missing_date_count ?? 0} without a completion date</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">Collected</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(totals?.collected_amount)}</p>
          <p className="mt-1 text-xs text-slate-500">{totals?.collected_count ?? 0} release{(totals?.collected_count ?? 0) === 1 ? '' : 's'} brought home</p>
        </div>
      </section>

      <section aria-label="Ready to invoice" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg text-slate-900">Ready to invoice today</h2>
          <Link href="/projects" className="text-sm font-medium text-amber-700 hover:text-amber-800">All projects</Link>
        </div>
        {eligible.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            Nothing is eligible today.{' '}
            {upcoming.length > 0
              ? `Your next release unlocks ${formatDate(upcoming[0].release_eligible_date)}: ${formatMoney(upcoming[0].retainage_amount)} on ${upcoming[0].name}.`
              : 'Add completion dates and the countdown starts.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eligible.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-emerald-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    <p className="truncate text-sm text-slate-500">{p.gc_name} · eligible since {formatDate(p.release_eligible_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-600">{formatMoney(p.retainage_amount)}</span>
                    <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Invoice it</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-label="Upcoming releases" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg text-slate-900">Coming up</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {upcoming.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    <p className="truncate text-sm text-slate-500">{p.gc_name} · unlocks {formatDate(p.release_eligible_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{formatMoney(p.retainage_amount)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${eligibilityTone(p.days_until_eligible, p.status, p.release_eligible_date !== null)}`}>
                      {eligibilityLabel(p.days_until_eligible, p.status, p.release_eligible_date !== null)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missingDate.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-6 py-4">
          <p className="text-sm text-orange-800">
            {missingDate.length} project{missingDate.length === 1 ? ' has' : 's have'} no completion date yet, so {formatMoney(totals?.missing_date_amount)} has no countdown.{' '}
            <Link href={`/projects/${missingDate[0].id}`} className="font-semibold underline">Add a date</Link> and we start the clock.
          </p>
        </div>
      )}

      {me && me.plan.plan_key === 'free' && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-600">
            Free plan: {me.usage.project_count} of {me.usage.project_limit ?? 'unlimited'} projects used.
          </p>
          <Link href="/billing" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            Go Lifetime: unlimited projects
          </Link>
        </div>
      )}
    </div>
  );
}
