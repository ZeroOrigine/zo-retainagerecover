import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public-safety filter for machine thoughts. Thoughts SHOULD never contain
 * secrets (the pipeline's deterministic gate scans for them). But "should"
 * is not a security control. Belt + suspenders before anything hits the wire:
 * redact secret-shaped strings, emails, and connection URLs; truncate hard.
 */
function sanitizeThought(t: string | null): string | null {
  if (!t) return null;
  let x = t
    .replace(/(sk|re|ghp|gho|whsec|pk|rk)_[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/sk-ant-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(/nfp_[A-Za-z0-9]{10,}/g, '[redacted]')
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, '[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.?[A-Za-z0-9._-]*/g, '[redacted]')
    .replace(/AKIA[A-Z0-9]{12,}/g, '[redacted]')
    .replace(/xox[abpr]-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer [redacted]')
    .replace(/(postgres|postgresql|mysql|redis|mongodb(\+srv)?):\/\/\S+/gi, '[redacted-url]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\s+/g, ' ')
    .trim();
  if (x.length > 220) x = x.slice(0, 220) + '…';
  return x;
}

const PUBLIC_MIND: Record<string, string> = {
  research_a: 'Research Mind A',
  research_b: 'Research Mind B',
  ethics: 'Ethics Mind',
  'build-architect': 'Pipeline Architect',
  builder: 'Builder Mind',
  builder_opus: 'Builder Mind',
  qa: 'QA Mind',
  marketing: 'Marketing Mind',
  immune_system: 'Immune System',
  retrospective: 'Evolution Mind',
};

// Statuses that mean "a product is physically on the line right now"
const STATION_OF: Record<string, number> = {
  building: 3,
  build_complete: 3,
  self_correcting: 3,
  qa: 4,
  qa_round_1: 4,
  qa_round_2: 4,
  qa_round_3: 4,
  qa_fix_needed: 4,
  qa_passed: 5,
  marketing: 5,
  deploying: 5,
  launched: 5,
};

// Halted ≠ gone: a paused product stays visible on the line, honestly labeled.
const HALTED_OF: Record<string, number> = {
  qa_infra_error: 4,
  qa_failed: 4,
  qa_patch_broken: 4,
  deploy_failed: 5,
  budget_halted: 3,
  lifetime_cap_pending: 3,
};

// Rule 13: never allowlist a growing set. A project is ON THE LINE unless its
// status is in this small, closed, terminal/pre-line set. Any halt status the
// pipeline invents tomorrow stays visible automatically, honestly labeled.
const OFF_THE_LINE = ['approved', 'dropped', 'sunset'];

/**
 * The Birth Line. Real-time position of the product currently being born.
 * Every number here is real: zo_projects (stage), zo_cost_logs (money),
 * zo_mind_logs (the machine's actual last thought).
 */
export async function GET() {
  try {
    const supabase = createPublicClient();
    const [{ data: projs }, { data: mindRows }] = await Promise.all([
      supabase
        .from('v_projects')
        .select('project_id,name,status,created_at,updated_at')
        .not('status', 'in', `(${OFF_THE_LINE.join(',')})`)
        .order('updated_at', { ascending: false })
        .limit(1),
      supabase
        .from('v_mind_logs')
        .select('mind_name,action,output_summary,created_at,project_id')
        .order('created_at', { ascending: false })
        .limit(120),
    ]);

    const rows = mindRows ?? [];

    let p: (NonNullable<typeof projs>[number]) | null = (projs ?? [])[0] ?? null;
    // A launched product is DONE, not in-flight. Show it at LAUNCH only for a short
    // celebration window (4h after it launched); after that the line is idle.
    if (p && p.status === 'launched') {
      const launchedAgeMs = Date.now() - new Date(p.updated_at).getTime();
      if (launchedAgeMs > 4 * 60 * 60 * 1000) p = null;
    }
    let inflight = null;
    if (p) {
      const { data: costRows } = await supabase
        .from('v_cost_logs')
        .select('cost_usd,created_at')
        .eq('project_id', p.project_id);
      const cost = (costRows ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
      // The clock starts at the machine's FIRST THOUGHT, not at project seeding
      // (seeding sat 37 minutes before the first call on the Julley build).
      const firstThought = (costRows ?? []).reduce<string | null>(
        (min, r) => (r.created_at && (!min || r.created_at < min) ? r.created_at : min), null);
      const thought = rows.find((r) => r.project_id === p.project_id);
      // The true launch stamp: zo_projects.updated_at is NOT bumped by the
      // launch PATCH (it froze at the resume time on Julley), but the deploy
      // sync writes zo_products.launched_at — use it so 'Born in' is honest.
      let launchedAt: string | null = null;
      if (p.status === 'launched') {
        try {
          const { data: prod } = await supabase
            .from('v_products')
            .select('launched_at')
            .ilike('name', p.name)
            .maybeSingle();
          launchedAt = prod?.launched_at ?? null;
        } catch { /* fail-soft: panel falls back to since */ }
      }
      inflight = {
        name: p.name,
        launchedAt,
        status: p.status,
        station:
          STATION_OF[p.status] ?? HALTED_OF[p.status] ??
          (p.status.startsWith('qa') ? 4 : p.status.startsWith('deploy') ? 5 : 3),
        halted: !(p.status in STATION_OF),
        since: p.updated_at,
        born: firstThought ?? p.created_at,
        cost: Math.round(cost * 100) / 100,
        thought: sanitizeThought(thought ? (thought.output_summary || thought.action) : null),
        thoughtBy: thought?.mind_name ? (PUBLIC_MIND[thought.mind_name] ?? 'a Mind') : null,
        thoughtAt: thought?.created_at ?? null,
      };
    }

    // A research batch runs BEFORE any product row exists. So the rail's first
    // three stations never lit up. Detect a live research phase from recent mind
    // logs and surface it so RESEARCH/EVALUATION/ETHICS glow during a run.
    if (!inflight) {
      const RESEARCH_MINDS: Record<string, { station: number; status: string }> = {
        research_a: { station: 0, status: 'researching' },
        research_b: { station: 1, status: 'evaluating' },
        ethics: { station: 2, status: 'ethics_review' },
        'build-architect': { station: 3, status: 'planning' },
      };
      const fresh = rows.find(
        (r) => RESEARCH_MINDS[r.mind_name] &&
          Date.now() - new Date(r.created_at).getTime() < 4 * 60 * 1000,
      );
      if (fresh) {
        const meta = RESEARCH_MINDS[fresh.mind_name];
        inflight = {
          name: 'a new idea',
          status: meta.status,
          station: meta.station,
          halted: false,
          since: fresh.created_at,
          born: fresh.created_at,
          cost: 0,
          thought: sanitizeThought(fresh.output_summary || fresh.action),
          thoughtBy: PUBLIC_MIND[fresh.mind_name] ?? 'a Mind',
          thoughtAt: fresh.created_at,
        };
      }
    }

    let lastBirth = null;
    if (!inflight) {
      const { data: launched } = await supabase
        .from('v_products')
        .select('name,created_at')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(1);
      lastBirth = (launched ?? [])[0] ?? null;
    }

    // Next scheduled cycle, if the founder has armed one (n8n cron writes
    // zo_config.next_cycle_at). Public by design; absent or in the past means
    // NO countdown. The website never invents a schedule (Rule 3).
    let nextCycleAt: string | null = null;
    try {
      const { data: cfg } = await supabase
        .from('v_config_public')
        .select('value')
        .eq('key', 'next_cycle_at')
        .maybeSingle();
      const v = cfg?.value == null ? null : String(cfg.value).replace(/^"+|"+$/g, '');
      if (v && new Date(v).getTime() > Date.now()) nextCycleAt = v;
    } catch { /* fail-soft: no countdown */ }

    return NextResponse.json(
      { ok: true, inflight, lastBirth, nextCycleAt, at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=20' } },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
