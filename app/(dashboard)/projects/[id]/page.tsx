'use client';

// CANONICAL project detail: the countdown, the edit form, and the one-click release invoice.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, type MeData } from '@/lib/core/api';
import { formatMoney, formatMoneyExact, formatDate, todayIso, addDaysIso } from '@/lib/core/format';
import type { ProjectWithEligibility, ReleaseInvoiceRow, ReleaseInvoiceWithProject } from '@/lib/db/types';

interface DetailData {
  project: ProjectWithEligibility;
  invoices: ReleaseInvoiceRow[];
}
interface UpdateData {
  project: ProjectWithEligibility;
}
interface CreateInvoiceData {
  invoice: ReleaseInvoiceWithProject;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

const PROJECT_BADGE: Record<string, string> = {
  active: 'bg-slate-100 text-slate-700',
  invoiced: 'bg-blue-100 text-blue-700',
  collected: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-400',
};
const INVOICE_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-slate-100 text-slate-400',
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithEligibility | null>(null);
  const [invoices, setInvoices] = useState<ReleaseInvoiceRow[]>([]);
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, tone: 'ok' | 'err' = 'ok') {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4500);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    const [detailRes, meRes] = await Promise.all([
      apiFetch<DetailData>(`/api/projects/${params.id}`),
      apiFetch<MeData>('/api/me'),
    ]);
    if (!detailRes.ok || !detailRes.data) {
      setLoadError(detailRes.error);
      setLoading(false);
      return;
    }
    setProject(detailRes.data.project);
    setInvoices(detailRes.data.invoices);
    if (meRes.ok) setMe(meRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function openEdit() {
    if (!project) return;
    setForm({
      name: project.name,
      project_number: project.project_number ?? '',
      gc_name: project.gc_name,
      gc_email: project.gc_email ?? '',
      contract_value: String(project.contract_value),
      retainage_pct: String(project.retainage_pct),
      completion_date: project.completion_date ?? '',
      release_hold_days: String(project.release_hold_days),
      notes: project.notes ?? '',
    });
    setFieldErrors({});
    setFormError(null);
    setEditing(true);
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  const editPreviewDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.completion_date ?? '')) return null;
    const hold = Number(form.release_hold_days || '0');
    if (!Number.isFinite(hold) || hold < 0) return form.completion_date;
    return addDaysIso(form.completion_date, hold);
  }, [form.completion_date, form.release_hold_days]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload: Record<string, unknown> = {
      name: form.name,
      gc_name: form.gc_name,
      contract_value: form.contract_value,
      retainage_pct: form.retainage_pct,
      release_hold_days: form.release_hold_days,
      project_number: form.project_number,
      gc_email: form.gc_email,
      notes: form.notes,
      completion_date: form.completion_date ? form.completion_date : null,
    };
    const res = await apiFetch<UpdateData>(`/api/projects/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok || !res.data) {
      setFormError(res.error);
      if (res.fields) setFieldErrors(res.fields);
      return;
    }
    setProject(res.data.project);
    setEditing(false);
    showToast('Saved. Numbers and dates are up to date.');
  }

  async function createInvoice() {
    if (!project) return;
    setCreating(true);
    const res = await apiFetch<CreateInvoiceData>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ project_id: project.id }),
    });
    setCreating(false);
    if (!res.ok || !res.data) {
      if (res.code === 'UPGRADE_REQUIRED') {
        setShowPreview(true);
        showToast(res.error ?? 'Upgrade to create numbered invoices.', 'err');
        return;
      }
      showToast(res.error ?? 'We could not create that invoice.', 'err');
      return;
    }
    showToast(`Invoice ${res.data.invoice.invoice_number} is ready to send.`);
    router.push(`/invoices/${res.data.invoice.id}`);
  }

  async function setStatus(status: 'active' | 'archived') {
    setBusy(true);
    const res = await apiFetch<UpdateData>(`/api/projects/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      showToast(res.error ?? 'We could not update the project.', 'err');
      return;
    }
    setProject(res.data.project);
    showToast(status === 'archived' ? 'Project archived. Restore it anytime.' : 'Project is active again.');
  }

  async function handleDelete() {
    if (!window.confirm('Delete this project and its invoices? This cannot be undone.')) return;
    setBusy(true);
    const res = await apiFetch<{ deleted: boolean }>(`/api/projects/${params.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error ?? 'We could not delete that project.', 'err');
      return;
    }
    router.push('/projects');
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 w-64 rounded-lg bg-slate-200 shimmer" />
        <div className="h-32 rounded-xl bg-slate-200 shimmer" />
        <div className="h-64 rounded-xl bg-slate-200 shimmer" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError ?? 'We could not find that project.'}</p>
        <Link href="/projects" className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to projects</Link>
      </div>
    );
  }

  const canInvoice = me?.plan.can_create_invoices ?? false;
  const days = project.days_until_eligible;
  const canCreate = project.status === 'active' || project.status === 'invoiced';
  const liveInvoice = invoices.find((i) => i.status === 'draft' || i.status === 'sent' || i.status === 'paid');

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <span aria-hidden="true">&larr;</span> All projects
      </Link>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl text-slate-900 sm:text-3xl">{project.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PROJECT_BADGE[project.status]}`}>{project.status}</span>
          </div>
          <p className="mt-1 text-slate-600">
            {project.gc_name}
            {project.project_number ? ` · #${project.project_number}` : ''}
          </p>
        </div>
        <button onClick={openEdit} className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Edit project
        </button>
      </div>

      {project.status === 'active' && project.is_eligible && (
        <div className="rr-pop rounded-2xl bg-emerald-600 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">Claimable today</p>
          <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatMoney(project.retainage_amount)}</p>
          <p className="mt-1 text-emerald-100">Eligible since {formatDate(project.release_eligible_date)}. The invoice takes one click.</p>
          <button
            onClick={canInvoice ? createInvoice : () => setShowPreview(true)}
            disabled={creating}
            className="mt-4 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {creating ? 'Creating...' : canInvoice ? 'Create the release invoice' : 'Preview the release invoice'}
          </button>
        </div>
      )}

      {project.status === 'active' && !project.is_eligible && project.release_eligible_date && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Counting down</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {formatMoney(project.retainage_amount)} unlocks in {days} day{days === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-amber-800">Eligible on {formatDate(project.release_eligible_date)}. We will have the invoice ready.</p>
        </div>
      )}

      {project.status === 'active' && !project.release_eligible_date && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">No countdown yet</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(project.retainage_amount)} is waiting on a completion date</p>
          <p className="mt-1 text-orange-800">Add the completion date and we calculate the exact day you can bill.</p>
          <button onClick={openEdit} className="mt-4 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
            Add completion date
          </button>
        </div>
      )}

      {project.status === 'invoiced' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Invoice out the door</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(project.retainage_amount)} invoiced</p>
          {liveInvoice && (
            <Link href={`/invoices/${liveInvoice.id}`} className="mt-3 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              View invoice {liveInvoice.invoice_number}
            </Link>
          )}
        </div>
      )}

      {project.status === 'collected' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Collected</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatMoney(project.retainage_amount)} came home</p>
          <p className="mt-1 text-emerald-800">That is money most subs never see. Nice work.</p>
        </div>
      )}

      {editing && (
        <form onSubmit={handleSave} className="rr-pop rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg text-slate-900">Edit project</h2>
          {formError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              { id: 'name', label: 'Project name', type: 'text' },
              { id: 'gc_name', label: 'General contractor', type: 'text' },
              { id: 'contract_value', label: 'Contract value ($)', type: 'number' },
              { id: 'retainage_pct', label: 'Retainage held (%)', type: 'number' },
              { id: 'completion_date', label: 'Completion date', type: 'date' },
              { id: 'release_hold_days', label: 'Hold period (days)', type: 'number' },
              { id: 'project_number', label: 'Project number', type: 'text' },
              { id: 'gc_email', label: 'GC billing email', type: 'email' },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={`edit_${f.id}`} className={labelCls}>{f.label}</label>
                <input
                  id={`edit_${f.id}`}
                  className={inputCls}
                  type={f.type}
                  step={f.type === 'number' ? 'any' : undefined}
                  value={form[f.id] ?? ''}
                  onChange={(e) => set(f.id, e.target.value)}
                />
                {fieldErrors[f.id] && <p className="mt-1 text-xs text-red-600">{fieldErrors[f.id]}</p>}
              </div>
            ))}
            <div className="md:col-span-2">
              <label htmlFor="edit_notes" className={labelCls}>Notes</label>
              <textarea id="edit_notes" className={inputCls} rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
              {fieldErrors.notes && <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>}
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            With these dates, this retainage becomes eligible {editPreviewDate ? `on ${formatDate(editPreviewDate)}` : 'once a completion date is set'}.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg text-slate-900">The numbers</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-sm text-slate-500">Contract value</dt><dd className="mt-0.5 font-semibold text-slate-900">{formatMoney(project.contract_value)}</dd></div>
          <div><dt className="text-sm text-slate-500">Retainage held</dt><dd className="mt-0.5 font-semibold text-slate-900">{Number(project.retainage_pct)}%</dd></div>
          <div><dt className="text-sm text-slate-500">Retainage amount</dt><dd className="mt-0.5 font-semibold text-emerald-600">{formatMoneyExact(project.retainage_amount)}</dd></div>
          <div><dt className="text-sm text-slate-500">Completion date</dt><dd className="mt-0.5 font-semibold text-slate-900">{formatDate(project.completion_date)}</dd></div>
          <div><dt className="text-sm text-slate-500">Hold period</dt><dd className="mt-0.5 font-semibold text-slate-900">{project.release_hold_days} days</dd></div>
          <div><dt className="text-sm text-slate-500">Release eligible date</dt><dd className="mt-0.5 font-semibold text-slate-900">{formatDate(project.release_eligible_date)}</dd></div>
        </dl>
        {project.notes && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{project.notes}</p>}
      </section>

      {canCreate && !project.is_eligible && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-600">Need the invoice early? Some GCs accept the release invoice ahead of the date.</p>
          <button
            onClick={canInvoice ? createInvoice : () => setShowPreview(true)}
            disabled={creating}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {creating ? 'Creating...' : canInvoice ? 'Create release invoice' : 'Preview release invoice'}
          </button>
        </div>
      )}

      {showPreview && !canInvoice && (
        <section className="rr-pop rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg text-slate-900">Release invoice preview</h2>
            <button onClick={() => setShowPreview(false)} className="text-sm text-slate-400 hover:text-slate-600" aria-label="Close preview">Close</button>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-xl font-bold text-slate-900">RELEASE INVOICE</p>
                <p className="text-sm text-slate-500">Number assigned on upgrade</p>
              </div>
              <div className="text-sm text-slate-600 sm:text-right">
                <p>Issue date: {formatDate(todayIso())}</p>
                <p>Due: net 30</p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</p>
                <p className="mt-1 font-semibold text-slate-900">{me?.profile.company_name || me?.profile.full_name || 'Your company'}</p>
                {!me?.profile.company_name && (
                  <Link href="/settings" className="text-xs text-amber-700 underline">Add your company details in Settings</Link>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
                <p className="mt-1 font-semibold text-slate-900">{project.gc_name}</p>
                {project.gc_email && <p className="text-sm text-slate-600">{project.gc_email}</p>}
              </div>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-700">
                  Retainage release for {project.name}: {Number(project.retainage_pct)}% retainage held on contract value of {formatMoneyExact(project.contract_value)}
                </p>
                <p className="whitespace-nowrap font-semibold text-slate-900">{formatMoneyExact(project.retainage_amount)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <p className="font-bold text-slate-900">Amount due</p>
                <p className="text-xl font-bold text-emerald-600">{formatMoneyExact(project.retainage_amount)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-slate-900 px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-white">Upgrade once to Lifetime and this becomes a numbered, saved, ready-to-send invoice.</p>
            <Link href="/billing" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-400">
              Go Lifetime
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg text-slate-900">Invoices for this project</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No invoices yet. When the money is eligible, one click creates it.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">{inv.invoice_number}</p>
                    <p className="text-sm text-slate-500">Issued {formatDate(inv.issue_date)} · due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{formatMoneyExact(inv.amount)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${INVOICE_BADGE[inv.status]}`}>{inv.status}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg text-slate-900">Housekeeping</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {project.status === 'archived' ? (
            <button onClick={() => setStatus('active')} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              Restore to active
            </button>
          ) : (
            <button onClick={() => setStatus('archived')} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              Archive project
            </button>
          )}
          <button onClick={handleDelete} disabled={busy} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
            Delete project
          </button>
        </div>
      </section>

      {toast && (
        <div className={`rr-pop fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
