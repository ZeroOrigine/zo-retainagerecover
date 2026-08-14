'use client';

import { useEffect, useState, useCallback } from 'react';

interface PulseEvent {
  icon: string;
  mind: string;
  line: string;
  product: string | null;
  at: string;
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function LivePulse() {
  const [events, setEvents] = useState<PulseEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pulse', { cache: 'no-store' });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.events)) setEvents(data.events);
    } catch {
      /* keep last known. Never invent activity */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (events.length === 0) return null; // no fake pulse, ever

  // Honest header: only claim "working right now" when the newest event is
  // fresh (<10 min). Otherwise say the line is idle. With the real age.
  const newestAt = events[0].at;
  const active = Date.now() - new Date(newestAt).getTime() < 10 * 60 * 1000;

  return (
    <div className="pulse-feed reveal" aria-label="Live activity of the AI Minds">
      <div className="pulse-header">
        <span className="pulse-dot" style={active ? undefined : { animation: 'none', opacity: 0.35 }}></span>
        <h4>{active ? 'The Minds. Working right now' : `The Minds. Line idle · last activity ${timeAgo(newestAt)}`}</h4>
        <span className="pulse-sub">real pipeline events, not a simulation</span>
      </div>
      <ul>
        {events.map((e, i) => (
          <li key={`${e.at}-${i}`} className="pulse-item">
            <span className="pulse-icon" aria-hidden="true">{e.icon}</span>
            <span className="pulse-text">
              <strong>{e.mind}</strong> {e.line}
              {e.product ? <em> · {e.product}</em> : null}
            </span>
            <span className="pulse-time">{timeAgo(e.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
