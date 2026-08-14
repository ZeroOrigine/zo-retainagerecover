'use client';

// CANONICAL projects page: track jobs and watch retainage math happen live.
// NOTE: No route segment config (e.g. `export const dynamic`) is set here — this
// is a client component and this page does not use useSearchParams, so segment
// config is unnecessary and intentionally omitted (see QA-015).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type MeData } from '@/lib/core/api';
import { formatMoney, formatDate, addDaysIso, eligibilityLabel, eligibilityTone } from '@/lib/core/format';
import { zoEvent } from '@/components/ZoBeacon';
import type { ProjectWithEligibility } from '@/lib/db/types';

interface ProjectListData {
  projects: ProjectWithEligibility[];
  total: number;
}
interface CreateData {
  project: ProjectWithEligibility;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'invoiced', label: 'Invoiced' },
  { key: 'collected', label: 'Collected' },
  { key: 'archived', label: 'Archived' },
];

const EMPTY_FORM = {
  name: '',
  project_number: '',
  gc_name: '',
  gc_email: '',
  contract_value: '',
  retainage_pct: '10',
  completion_date: '',
  release_hold_days: '0',
  notes: '',
};

export default function ProjectsPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [projects, setProjects] = useState<ProjectWithEligibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, tone: 'ok' | 'err' = 'ok') {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4500);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    const meRes = await apiFetch<MeData>('/api/me');
    if (meRes.ok) setMe(meRes.data);
    const PAGE_SIZE = 100;
    const all: ProjectWithEligibility[] = [];
    let page = 1;
    let total = Infinity;
    while (all.length < total) {
      const listRes = await apiFetch<ProjectListData>(`/api/projects?page=${page}&limit=${PAGE_SIZE}`);
      if (!listRes.ok) {
        setLoadError(listRes.error);
        setLoading(false);
        return;
      }
      const batch = listRes.data?.projects ?? [];
      total = listRes.data?.total ?? batch.length;
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }
    setProjects(all);
    if (all.length === 0) setShowForm(true);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter]
  );

  const previewAmount = useMemo(() => {
    const cv = Number(form.contract_value);
    const pct = Number(form.retainage_pct);
    if (!Number.isFinite(cv) || !Number.isFinite(pct) || cv <= 0 || pct <= 0) return null;
    return Math.round(cv * pct) / 100;
  }, [form.contract_value, form.retainage_pct]);

  const previewDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.completion_date)) return null;
    const hold = Number(form.release_hold_days || '0');
    if (!Number.isFinite(hold) || hold < 0) return form.completion_date;
    return addDaysIso(form.completion_date, hold);
  }, [form.completion_date, form.release_hold_days]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});
    const payload: Record<string, unknown> = {
      name: form.name,
      gc_name: form.gc_name,
      contract_value: form.contract_value,
      retainage_pct: form.retainage_pct,
    };
    if (form.project_number.trim()) payload.project_number = form.project_number;
    if (form.gc_email.trim()) payload.gc_email = form.gc_email;
    if (form.completion_date) payload.completion_date = form.completion_date;
    if (form.release_hold_days.trim() !== '') payload.release_hold_days = form.release_hold_days;
    if (form.notes.trim()) payload.notes = form.notes;

    const res = await apiFetch<CreateData>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok || !res.data) {
      setFormError(res.error);
      if (res.fields) setFieldErrors(res.fields);
      return;
    }
    const created = res.data.project;
    const wasFirst = projects.length === 0;
    setProjects((prev) => [created, ...prev]);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    showToast(`Tracking ${created.name}. ${formatMoney(created.retainage_amount)} is on the books.`);
    if (wasFirst) zoEvent('activation');
    const meRes = await apiFetch<MeData>('/api/me');
    if (meRes.ok) setMe(meRes.data);
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 w-56 rounded-lg bg-slate-200 shimmer" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200 shimmer" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <button onClick={load} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Try again</button>
      </div>
    );
  }

  const atLimit = me ? !me.usage.can_add_project : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl text-slate-900 sm:text-3xl">Projects</h1>
          <p className="mt-1 text-slate-600">Every job with retainage held, sorted by the money that unlocks soonest.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          {showForm ? 'Close form' : 'Add project'}
        </button>
      </div>

      {atLimit && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-900">
            Your {me?.plan.plan_name} plan tracks up to {me?.usage.project_limit} projects and you are using {me?.usage.project_count}.{' '}
            <Link href="/billing" className="font-semibold underline">Upgrade once to Lifetime</Link> for unlimited projects.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="rr-pop rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg text-slate-900">Add a job with retainage held</h2>
          <p className="mt-1 text-sm text-slate-500">Type the numbers from your contract. We calculate the money and the date as you go.</p>
          {formError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelCls}>Project name</label>
              <input id="name" className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Riverside Office Build-Out" required aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'name-error' : undefined} />
              {fieldErrors.name && <p id="name-error" className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="gc_name" className={labelCls}>General contractor</label>
              <input id="gc_name" className={inputCls} value={form.gc_name} onChange={(e) => set('gc_name', e.target.value)} placeholder="Meridian Builders LLC" required aria-invalid={!!fieldErrors.gc_name} aria-describedby={fieldErrors.gc_name ? 'gc_name-error' : undefined} />
              {fieldErrors.gc_name && <p id="gc_name-error" className="mt-1 text-xs text-red-600">{fieldErrors.gc_name}</p>}
            </div>
            <div>
              <label htmlFor="contract_value" className={labelCls}>Contract value ($)</label>
              <input id="contract_value" className={inputCls} type="number" min="0" step="0.01" inputMode="decimal" value={form.contract_value} onChange={(e) => set('contract_value', e.target.value)} placeholder="85000" required aria-invalid={!!fieldErrors.contract_value} aria-describedby={fieldErrors.contract_value ? 'contract_value-error' : undefined} />
              {fieldErrors.contract_value && <p id="contract_value-error" className="mt-1 text-xs text-red-600">{fieldErrors.contract_value}</p>}
            </div>
            <div>
              <label htmlFor="retainage_pct" className={labelCls}>Retainage held (%)</label>
              <input id="retainage_pct" className={inputCls} type="number" min="0" max="50" step="0.01" inputMode="decimal" value={form.retainage_pct} onChange={(e) => set('retainage_pct', e.target.value)} required aria-invalid={!!fieldErrors.retainage_pct} aria-describedby={fieldErrors.retainage_pct ? 'retainage_pct-error' : undefined} />
              {fieldErrors.retainage_pct && <p id="retainage_pct-error" className="mt-1 text-xs text-red-600">{fieldErrors.retainage_pct}</p>}
            </div>
            <div>
              <label htmlFor="completion_date" className={labelCls}>Completion date</label>
              <input id="completion_date" className={inputCls} type="date" value={form.completion_date} onChange={(e) => set('completion_date', e.target.value)} aria-invalid={!!fieldErrors.completion_date} aria-describedby={fieldErrors.completion_date ? 'completion_date-error' : undefined} />
              <p className="mt-1 text-xs text-slate-400">Leave blank if the job is still running. You can add it later.</p>
              {fieldErrors.completion_date && <p id="completion_date-error" className="mt-1 text-xs text-red-600">{fieldErrors.completion_date}</p>}
            </div>
            <div>
              <label htmlFor="release_hold_days" className={labelCls}>Hold period after completion (days)</label>
              <input id="release_hold_days" className={inputCls} type="number" min="0" max="730" step="1" value={form.release_hold_days} onChange={(e) => set('release_hold_days', e.target.value)} aria-invalid={!!fieldErrors.release_hold_days} aria-describedby={fieldErrors.release_hold_days ? 'release_hold_days-error' : undefined} />
              <p className="mt-1 text-xs text-slate-400">From your contract. Zero means eligible on the completion date.</p>
              {fieldErrors.release_hold_days && <p id="release_hold_days-error" className="mt-1 text-xs text-red-600">{fieldErrors.release_hold_days}</p>}
            </div>
            <div>
              <label htmlFor="project_number" className={labelCls}>Project number (optional)</label>
              <input id="project_number" className={inputCls} value={form.project_number} onChange={(e) => set('project_number', e.target.value)} placeholder="PO-2214" aria-invalid={!!fieldErrors.project_number} aria-describedby={fieldErrors.project_number ? 'project_number-error' : undefined} />
              {fieldErrors.project_number && <p id="project_number-error" className="mt-1 text-xs text-red-600">{fieldErrors.project_number}</p>}
            </div>
            <div>
              <label htmlFor="gc_email" className={labelCls}>GC billing email (optional)</label>
              <input id="gc_email" className={inputCls} type="email" value={form.gc_email} onChange={(e) => set('gc_email', e.target.value)} placeholder="ap@meridianbuilders.com" aria-invalid={!!fieldErrors.gc_email} aria-describedby={fieldErrors.gc_email ? 'gc_email-error' : undefined} />
              {fieldErrors.gc_email && <p id="gc_email-error" className="mt-1 text-xs text-red-600">{fieldErrors.gc_email}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="notes" className={labelCls}>Notes (optional)</label>
              <textarea id="notes" className={inputCls} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Punch list signed off 3/12. Retainage per section 9.2." aria-invalid={!!fieldErrors.notes} aria-describedby={fieldErrors.notes ? 'notes-error' : undefined} />
              {fieldErrors.notes && <p id="notes-error" className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>}
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Retainage on this job</p>
              <p className="text-2xl font-bold text-emerald-400">{previewAmount !== null ? formatMoney(previewAmount) : '$0'}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">You can invoice it on</p>
              <p className="text-lg font-semibold">{previewDate ? formatDate(previewDate) : 'Add a completion date'}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Start tracking this money'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === f.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && projects.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-slate-500">No {filter} projects right now.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-amber-300 hover:shadow sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    {p.project_number && <span className="text-xs text-slate-400">#{p.project_number}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {p.gc_name} · {Number(p.retainage_pct)}% of {formatMoney(p.contract_value)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">{formatMoney(p.retainage_amount)}</span>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${eligibilityTone(p.days_until_eligible, p.status, p.release_eligible_date !== null)}`}>
                    {eligibilityLabel(p.days_until_eligible, p.status, p.release_eligible_date !== null)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <div className={`rr-pop fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
