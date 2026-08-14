'use client';

// CANONICAL invoice detail: the ready-to-send document, printable and trackable.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, type MeData } from '@/lib/core/api';
import { formatMoneyExact, formatDate } from '@/lib/core/format';
import type { ReleaseInvoiceWithProject } from '@/lib/db/types';

interface InvoiceData {
  invoice: ReleaseInvoiceWithProject;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';
const actionCls =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60';

const INVOICE_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-slate-100 text-slate-400',
};

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<ReleaseInvoiceWithProject | null>(null);
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, tone: 'ok' | 'err' = 'ok') {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4500);
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    const [invRes, meRes] = await Promise.all([
      apiFetch<InvoiceData>(`/api/invoices/${params.id}`),
      apiFetch<MeData>('/api/me'),
    ]);
    if (!invRes.ok || !invRes.data) {
      setLoadError(invRes.error);
      setLoading(false);
      return;
    }
    setInvoice(invRes.data.invoice);
    if (meRes.ok) setMe(meRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(status: 'sent' | 'paid' | 'void') {
    setBusy(true);
    const res = await apiFetch<InvoiceData>(`/api/invoices/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      showToast(res.error ?? 'We could not update that invoice.', 'err');
      return;
    }
    setInvoice(res.data.invoice);
    if (status === 'sent') showToast('Marked sent. Now watch for the check.');
    if (status === 'paid') showToast(`Paid! ${formatMoneyExact(res.data.invoice.amount)} collected. That is retainage that came home.`);
    if (status === 'void') showToast('Voided. The project is free for a fresh invoice.');
  }

  async function handleDelete() {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setBusy(true);
    const res = await apiFetch<{ deleted: boolean; resync_pending?: boolean }>(`/api/invoices/${params.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setBusy(false);
      showToast(res.error ?? 'We could not delete that invoice.', 'err');
      return;
    }
    if (res.data?.resync_pending) {
      showToast('Project status may be stale — refresh the project page', 'err');
      window.setTimeout(() => router.push('/invoices'), 2000);
      return;
    }
    router.push('/invoices');
  }

  function openEdit() {
    if (!invoice) return;
    setForm({
      invoice_number: invoice.invoice_number,
      amount: String(invoice.amount),
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      bill_to_name: invoice.bill_to_name,
      bill_to_email: invoice.bill_to_email ?? '',
      line_description: invoice.line_description,
    });
    setFieldErrors({});
    setFormError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const res = await apiFetch<InvoiceData>(`/api/invoices/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        invoice_number: form.invoice_number,
        amount: form.amount,
        issue_date: form.issue_date,
        due_date: form.due_date,
        bill_to_name: form.bill_to_name,
        bill_to_email: form.bill_to_email,
        line_description: form.line_description,
      }),
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setFormError(res.error);
      if (res.fields) setFieldErrors(res.fields);
      return;
    }
    setInvoice(res.data.invoice);
    setEditing(false);
    showToast('Invoice updated.');
  }

  function copyText() {
    if (!invoice) return;
    const from = me?.profile;
    const lines = [
      `RELEASE INVOICE ${invoice.invoice_number}`,
      '',
      `From: ${from?.company_name || from?.full_name || 'Your company'}`,
      from?.company_address ? from.company_address : '',
      from?.company_phone ? from.company_phone : '',
      from?.email ? from.email : '',
      '',
      `Bill to: ${invoice.bill_to_name}`,
      invoice.bill_to_email ? invoice.bill_to_email : '',
      '',
      invoice.line_description,
      '',
      `Amount due: ${formatMoneyExact(invoice.amount)}`,
      `Issue date: ${formatDate(invoice.issue_date)}`,
      `Due date: ${formatDate(invoice.due_date)}`,
    ];
    navigator.clipboard
      .writeText(lines.filter(Boolean).join('\n'))
      .then(() => showToast('Copied. Paste it straight into an email to the GC.'))
      .catch(() => showToast('Copy did not work in this browser. Use Print instead.', 'err'));
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 w-64 rounded-lg bg-slate-200 shimmer" />
        <div className="h-96 rounded-xl bg-slate-200 shimmer" />
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError ?? 'We could not find that invoice.'}</p>
        <Link href="/invoices" className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to invoices</Link>
      </div>
    );
  }

  const from = me?.profile;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link href="/invoices" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            <span aria-hidden="true">&larr;</span> All invoices
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl text-slate-900">{invoice.invoice_number}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${INVOICE_BADGE[invoice.status]}`}>{invoice.status}</span>
          </div>
          {invoice.project && (
            <p className="mt-0.5 text-sm text-slate-500">
              For <Link href={`/projects/${invoice.project.id}`} className="underline hover:text-slate-700">{invoice.project.name}</Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={actionCls}>Print or save PDF</button>
          <button onClick={copyText} className={actionCls}>Copy as text</button>
          {invoice.status === 'draft' && (
            <>
              <button onClick={openEdit} className={actionCls} disabled={busy}>Edit</button>
              <button onClick={() => updateStatus('sent')} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                Mark sent
              </button>
            </>
          )}
          {invoice.status === 'sent' && (
            <button onClick={() => updateStatus('paid')} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              Mark paid
            </button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <button onClick={() => updateStatus('void')} disabled={busy} className={actionCls}>Void</button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'void') && (
            <button onClick={handleDelete} disabled={busy} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
              Delete
            </button>
          )}
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="no-print rr-pop rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg text-slate-900">Edit draft invoice</h2>
          {formError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              { id: 'invoice_number', label: 'Invoice number', type: 'text' },
              { id: 'amount', label: 'Amount ($)', type: 'number' },
              { id: 'issue_date', label: 'Issue date', type: 'date' },
              { id: 'due_date', label: 'Due date', type: 'date' },
              { id: 'bill_to_name', label: 'Bill to', type: 'text' },
              { id: 'bill_to_email', label: 'Bill to email', type: 'email' },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={`inv_${f.id}`} className={labelCls}>{f.label}</label>
                <input
                  id={`inv_${f.id}`}
                  className={inputCls}
                  type={f.type}
                  step={f.type === 'number' ? 'any' : undefined}
                  value={form[f.id] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.value }))}
                />
                {fieldErrors[f.id] && <p className="mt-1 text-xs text-red-600">{fieldErrors[f.id]}</p>}
              </div>
            ))}
            <div className="md:col-span-2">
              <label htmlFor="inv_line_description" className={labelCls}>Line description</label>
              <textarea
                id="inv_line_description"
                className={inputCls}
                rows={2}
                value={form.line_description ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, line_description: e.target.value }))}
              />
              {fieldErrors.line_description && <p className="mt-1 text-xs text-red-600">{fieldErrors.line_description}</p>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={busy} className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60">
              {busy ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      <div className="print-sheet mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-2xl font-bold tracking-tight text-slate-900">RELEASE INVOICE</p>
            <p className="mt-1 text-sm text-slate-500">{invoice.invoice_number}</p>
          </div>
          <div className="text-sm text-slate-600 sm:text-right">
            <p>Issue date: <span className="font-medium text-slate-900">{formatDate(invoice.issue_date)}</span></p>
            <p>Due date: <span className="font-medium text-slate-900">{formatDate(invoice.due_date)}</span></p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</p>
            <p className="mt-1 font-semibold text-slate-900">{from?.company_name || from?.full_name || 'Your company'}</p>
            {from?.full_name && from?.company_name && <p className="text-sm text-slate-600">{from.full_name}</p>}
            {from?.company_address && <p className="whitespace-pre-line text-sm text-slate-600">{from.company_address}</p>}
            {from?.company_phone && <p className="text-sm text-slate-600">{from.company_phone}</p>}
            {from?.email && <p className="text-sm text-slate-600">{from.email}</p>}
            {!from?.company_name && (
              <Link href="/settings" className="no-print mt-1 inline-block text-xs text-amber-700 underline">
                Add your company details in Settings so they print here
              </Link>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="mt-1 font-semibold text-slate-900">{invoice.bill_to_name}</p>
            {invoice.bill_to_email && <p className="text-sm text-slate-600">{invoice.bill_to_email}</p>}
            {invoice.project?.project_number && <p className="text-sm text-slate-600">Project #{invoice.project.project_number}</p>}
          </div>
        </div>

        <table className="mt-8 w-full">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-2" scope="col">Description</th>
              <th className="pb-2 text-right" scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-4 pr-4 text-sm text-slate-700">{invoice.line_description}</td>
              <td className="py-4 text-right font-semibold text-slate-900">{formatMoneyExact(invoice.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-base font-bold text-slate-900">Amount due</p>
          <p className="text-2xl font-bold text-emerald-600">{formatMoneyExact(invoice.amount)}</p>
        </div>

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Retainage release invoice. Payment is due by {formatDate(invoice.due_date)}. Thank you for your business.
        </p>
      </div>

      {toast && (
        <div className={`rr-pop no-print fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
