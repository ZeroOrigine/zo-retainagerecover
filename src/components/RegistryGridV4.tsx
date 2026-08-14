'use client';

import { useMemo, useState } from 'react';

export interface GridProduct {
  slug: string; name: string; tagline: string | null; url: string | null;
  category?: string | null; launched_at?: string | null;
}

const CAT_HUE: Record<string, string> = {
  education: '#9d7bff', compliance: '#ff8f5e', business: '#3ddc97',
  transport: '#5eb1ff', productivity: '#ffd166', finance: '#ff7ba6',
};

type SortKey = 'new' | 'cost' | 'az';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'new', label: 'Newest' },
  { key: 'cost', label: 'Cost' },
  { key: 'az', label: 'A-Z' },
];

/** The registry grid. Generated from the database; chips actually filter and sort. */
export default function RegistryGridV4({ products, costs }: {
  products: GridProduct[];
  costs: Record<string, number>;
}) {
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState<SortKey>('new');
  const cats = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])).sort()],
    [products],
  );
  const shown = useMemo(() => {
    const list = products.filter((p) => cat === 'All' || p.category === cat);
    const cost = (p: GridProduct) => costs[`zo-${p.slug}`] ?? 0;
    const born = (p: GridProduct) => (p.launched_at ? Date.parse(p.launched_at) : Number.NEGATIVE_INFINITY);
    return [...list].sort((a, b) => {
      if (sort === 'cost') return cost(b) - cost(a);
      if (sort === 'az') return a.name.localeCompare(b.name);
      return born(b) - born(a); // newest first, never-launched last
    });
  }, [products, costs, cat, sort]);

  return (
    <>
      <div className="filters">
        {cats.length > 2 &&
          cats.map((c) => (
            <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
              {c === 'All' ? 'All' : c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        <span className="spacer" aria-hidden="true"></span>
        <span className="sortlbl">Sort</span>
        {SORTS.map((s) => (
          <button key={s.key} className={`chip${sort === s.key ? ' on' : ''}`} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid">
        {shown.map((p) => {
          const cost = costs[`zo-${p.slug}`];
          let host: string | null = null;
          try { host = p.url ? new URL(p.url).hostname : null; } catch { host = null; }
          const born = p.launched_at
            ? new Date(p.launched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null;
          const hue = p.category ? CAT_HUE[p.category] ?? 'var(--dim2)' : null;
          return (
            <a key={p.slug} className="p" href={p.url ?? '#'} target="_blank" rel="noopener noreferrer">
              <span className="visit" aria-hidden="true">visit ↗</span>
              <div className="badge"><span className="d"></span>Live{p.launched_at ? ' · born autonomously' : ''}</div>
              <h3>{p.name}</h3>
              <div className="tag">{p.tagline}</div>
              {host && <div className="host">{host}</div>}
              <div className="num">
                {hue ? (
                  <span className="cat"><i style={{ background: hue }}></i>{p.category}</span>
                ) : (
                  <span>·</span>
                )}
                {born && <span className="born">born {born}</span>}
                <span style={{ color: cost ? 'var(--alive)' : undefined }}>{cost ? `$${cost.toFixed(2)}` : '·'}</span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
