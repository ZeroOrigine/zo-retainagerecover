'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Inflight = {
  name: string; status: string; station: number; halted?: boolean; since: string; born: string;
  cost: number; thought: string | null; thoughtBy: string | null; thoughtAt: string | null;
};
type Payload = {
  ok: boolean;
  inflight: Inflight | null;
  lastBirth: { name: string; created_at: string } | null;
  at: string;
};

const STATIONS = ['Research', 'Evaluation', 'Ethics', 'Builder', 'QA', 'Launch'];
const VERB: Record<string, string> = {
  researching: 'being researched. Discovering problems worth solving',
  evaluating: 'under evaluation. Scored for GO / NO-GO',
  ethics_review: 'under ethics review',
  planning: 'being planned by the architect',
  building: 'being built',
  build_complete: 'build complete. Awaiting QA',
  self_correcting: 'inspecting its own work before QA',
  qa: 'under inspection',
  qa_fix_needed: 'being repaired',
  qa_round_1: 'under inspection. Round 1',
  qa_round_2: 'under inspection. Round 2',
  qa_round_3: 'under inspection. Round 3',
  qa_infra_error: 'halted. Pipeline error, machine being repaired',
  qa_failed: 'halted at QA. Awaiting resume',
  budget_halted: 'paused. Budget cap reached',
  qa_passed: 'PASSED inspection. Getting its story',
  marketing: 'getting its story',
  launched: 'LIVE ON THE INTERNET',
  deploying: 'going live',
  deploy_failed: 'launch blocked. Machine investigating',
};

function useTypewriter(text: string | null, speed = 28): string {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!text) { setShown(''); return; }
    setShown('');
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return shown;
}

function age(from: string, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - new Date(from).getTime()) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/**
 * THE BIRTH LINE. The product currently being born, moving through real
 * stations, with its real age, real cost, and the machine's real last thought.
 * Polls /api/birthline every 12s. Every number is real (Rule 3).
 */
export default function BirthLine() {
  const [data, setData] = useState<Payload | null>(null);
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = () =>
      fetch('/api/birthline').then((r) => r.json()).then((d: Payload) => { if (d.ok) setData(d); }).catch(() => {});
    load();
    timer.current = setInterval(load, 8_000);
    // The Mind cards are server-rendered; without this they freeze at page-load
    // time while the rail updates live (founder saw WORKING NOW an hour late).
    // The Mind cards are server-rendered, so refreshing them re-renders the whole
    // page tree. Which momentarily collapses Suspense/reveal boundaries and snaps
    // the viewport back to the hero. Preserve the reader's scroll position across
    // the refresh, and never fight them if they're actively scrolling.
    const refresh = setInterval(() => {
      const y = window.scrollY;
      if (y < 4) { router.refresh(); return; } // already at top, nothing to preserve
      let cancelled = false;
      const onUserScroll = () => { cancelled = true; };
      window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
      window.addEventListener('touchmove', onUserScroll, { passive: true, once: true });
      router.refresh();
      // Restore across the async re-render (a few frames), then stop.
      let n = 0;
      const restore = () => {
        if (cancelled) return;
        if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
        if (++n < 12) requestAnimationFrame(restore);
        else { window.removeEventListener('wheel', onUserScroll); window.removeEventListener('touchmove', onUserScroll); }
      };
      requestAnimationFrame(restore);
    }, 20_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (timer.current) clearInterval(timer.current); clearInterval(tick); clearInterval(refresh); };
  }, []);

  const f = data?.inflight ?? null;
  const typed = useTypewriter(f?.thought ?? null);

  return (
    <div className="birthline reveal" aria-label="Live product assembly line">
      <div className="bl-rail" role="img" aria-label={f ? `${f.name} is at the ${STATIONS[f.station]} station` : 'Assembly line idle'}>
        {STATIONS.map((s, i) => (
          <div key={s} className={`bl-station${f && i === f.station ? ' bl-here' : ''}${f && i < f.station ? ' bl-done' : ''}`}>
            <span className="bl-node">{f && i === f.station && <span className={`bl-token${f.halted ? ' bl-token-halted' : ''}`} />}</span>
            <span className="bl-name">{s}</span>
          </div>
        ))}
        <div className="bl-flow" aria-hidden="true" />
      </div>

      {f ? (
        <div className="bl-status">
          <div className="bl-line1">
            <span className="bl-product">{f.name}</span>
            <span className="bl-verb"> is {VERB[f.status] ?? f.status} </span>
            <span className={f.halted ? "bl-paused" : "bl-live"}>{f.halted ? "PAUSED" : "LIVE"}</span>
          </div>
          <div className="bl-line2">
            on the line {age(f.born, now)} · ${f.cost.toFixed(2)} of compute converted into product
          </div>
          {typed && (
            <div className="bl-thought">
              <span className="bl-mind">{f.thoughtBy ?? 'mind'}:</span> {typed}
              <span className="bl-caret" aria-hidden="true">▋</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bl-status bl-idle">
          <div className="bl-line1"><span className="bl-verb">line idle. The factory pulls its next idea when the backlog runs low</span></div>
          {data?.lastBirth && (
            <div className="bl-line2">last birth: {data.lastBirth.name}</div>
          )}
        </div>
      )}
    </div>
  );
}
