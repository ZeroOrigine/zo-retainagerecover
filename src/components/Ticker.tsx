'use client';

import { useEffect, useState } from 'react';

interface Item { mind: string; line: string; product: string | null; at: string }

function age(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}S AGO`;
  if (s < 3600) return `${Math.floor(s / 60)}M AGO`;
  if (s < 86400) return `${Math.floor(s / 3600)}H AGO`;
  return `${Math.floor(s / 86400)}D AGO`;
}

export default function Ticker({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      try {
        const r = await fetch('/api/pulse', { cache: 'no-store' });
        const d = await r.json();
        if (d?.ok && d.events?.length) setItems(d.events);
      } catch { /* keep last known */ }
    };
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, []);

  if (!items.length) return null;

  // Ages are appended client-side only (after mount) to avoid a server/client
  // hydration mismatch on Date.now(). An event without its age is a half-truth:
  // "BUILDER FINISHED" from two days ago must not read like it happened now.
  const text = items
    .map((e) =>
      `${e.mind.toUpperCase()} ${e.line.toUpperCase()}${e.product ? ' · ' + e.product.toUpperCase() : ''}${mounted ? ' · ' + age(e.at) : ''}`)
    .join('  ···  ');

  const newest = items[0]?.at;
  const idleChip =
    mounted && newest && Date.now() - new Date(newest).getTime() > 3600_000
      ? `LINE IDLE. LAST ACTIVITY ${age(newest)}  ···  `
      : '';

  return (
    <div className="mc-ticker" aria-hidden="true">
      <div className="mc-ticker-inner">{idleChip}{text}  ···  {idleChip}{text}</div>
    </div>
  );
}
