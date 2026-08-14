'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export interface RegistryRowProps {
  project_id: string;
  name: string;
  status: string;
  category: string | null;
  created_at: string;
  cost_usd: number;
  url: string | null;
}

const STATUS_CLASS: Record<string, string> = {
  live: 'reg-live', launched: 'reg-live', building: 'reg-busy',
  dropped: 'reg-dead', qa_failed: 'reg-warn', build_failed: 'reg-warn',
  deploy_failed: 'reg-warn', budget_halted: 'reg-warn',
  approved: 'reg-idle', pending_approval: 'reg-idle',
};

const displayStatus = (s: string) => (s === 'launched' ? 'live' : s).replace(/_/g, ' ');

const PAGE = 50;

// Scales to 500+ products: instant client-side search + status filter over the
// server-fetched rows, rendered in pages of 50. The DOM never holds the whole
// registry at once, and the counts always speak the truth about the filter.
export default function RegistryTable({ rows }: { rows: RegistryRowProps[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const statuses = useMemo(
    () => Array.from(new Set(rows.map((r) => displayStatus(r.status)))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && displayStatus(r.status) !== status) return false;
      if (s && !`${r.name} ${r.category ?? ''}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, q, status]);

  const visible = filtered.slice(0, shown);

  return (
    <>
      {rows.length > 10 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '0 0 1rem' }}>
          <input
            type="search"
            placeholder="Search products…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            aria-label="Search the registry"
            style={{ flex: '1 1 220px', maxWidth: 320, padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'inherit' }}
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }}
            aria-label="Filter by status"
            style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'inherit' }}
          >
            <option value="all">all statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ alignSelf: 'center', opacity: 0.7, fontSize: '0.85rem' }}>
            {filtered.length} of {rows.length} attempts
          </span>
        </div>
      )}

      <div className="reg-table-wrap">
        <table className="reg-table">
          <thead>
            <tr><th>Product</th><th>Status</th><th>Born</th><th>True cost</th><th>Story</th></tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const slug = r.project_id.replace(/^zo-/, '');
              return (
                <tr key={r.project_id}>
                  <td>
                    {r.url
                      ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
                      : r.name}
                    {r.category ? <span className="reg-cat"> · {r.category}</span> : null}
                  </td>
                  <td><span className={`reg-badge ${STATUS_CLASS[r.status] ?? 'reg-idle'}`}>{displayStatus(r.status)}</span></td>
                  <td>{new Date(r.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="reg-cost">{r.cost_usd > 0 ? `$${r.cost_usd.toFixed(2)}` : '·'}</td>
                  <td><Link href={`/story/${slug}`} className="reg-story">biography &rarr;</Link></td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={5} style={{ opacity: 0.7 }}>No products match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > shown && (
        <p style={{ textAlign: 'center', margin: '1rem 0' }}>
          <button
            onClick={() => setShown((n) => n + PAGE)}
            style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'inherit', cursor: 'pointer' }}
          >
            Show {Math.min(PAGE, filtered.length - shown)} more ({filtered.length - shown} remaining)
          </button>
        </p>
      )}
    </>
  );
}
