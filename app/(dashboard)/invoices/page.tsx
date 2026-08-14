'use client';

// CANONICAL invoices list: every release invoice and where it stands.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/core/api';
import { formatMoneyExact, formatDate } from '@/lib/core/format';
import type { ReleaseInvoiceWithProject } from '@/lib/db/types';

interface InvoiceListData {
  invoices: ReleaseInvoiceWithProject[];
  total: number;
}

const INVOICE_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-slate-100 text-slate-400',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<ReleaseInvoiceWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<InvoiceListData>('/api/invoices?limit=100');
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setInvoices(res.data?.invoices ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)),
    [invoices, filter]
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-9 w-56 rounded-lg bg-slate-200 shimmer" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-200 shimmer" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={load} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-slate-900 sm:text-3xl">Release invoices</h1>
        <p className="mt-1 text-slate-600">Every retainage invoice you have created, and where each one stands.</p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-lg text-slate-900">No invoices yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Invoices come from your projects. When a project&apos;s retainage is eligible, one click turns it into a numbered release invoice.
          </p>
          <Link href="/projects" className="mt-5 inline-block rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">
            Go to projects
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter invoices by status">
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

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
              <p className="text-slate-500">No {filter} invoices right now.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-amber-300 hover:shadow sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{inv.invoice_number}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${INVOICE_BADGE[inv.status]}`}>{inv.status}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {inv.project?.name ?? 'Project'} · billed to {inv.bill_to_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Due {formatDate(inv.due_date)}</span>
                      <span className="text-lg font-bold text-slate-900">{formatMoneyExact(inv.amount)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
