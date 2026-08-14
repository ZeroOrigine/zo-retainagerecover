import { createPublicClient } from '@/lib/supabase/public';

// Server-side data layer for Mission Control. Every number on the site comes
// through here. From the same database the Minds write to. No number is ever
// invented; if a query fails we return null and the UI renders nothing.

export interface RegistryRow {
  project_id: string;
  name: string;
  status: string;
  category: string | null;
  created_at: string;
  cost_usd: number;
  url: string | null;
}

const FRIENDLY: Record<string, { mind: string; line: string }> = {
  research_trigger: { mind: 'Research Mind', line: 'went hunting for problems worth solving' },
  research_complete: { mind: 'Research Mind', line: 'finished discovering problems worth solving' },
  evaluation_complete: { mind: 'Research Mind B', line: 'scored ideas for viability. GO / NO-GO' },
  idea_needs_fixes: { mind: 'Ethics Mind', line: 'sent an idea back with required fixes' },
  approval_needed: { mind: 'Ecosystem', line: 'asked the founder to approve a new idea' },
  human_approved: { mind: 'Founder', line: 'approved an idea for building' },
  build_complete: { mind: 'Builder Mind', line: 'finished building. All steps complete' },
  build_failed: { mind: 'Builder Mind', line: 'hit a wall. Build failed, learnings stored' },
  qa_fix_needed: { mind: 'QA Mind', line: 'found issues and sent them back to the Builder' },
  qa_passed: { mind: 'QA Mind', line: 'passed the product through quality review' },
  qa_failed: { mind: 'QA Mind', line: 'rejected the build. Quality bar not met' },
  marketing_complete: { mind: 'Marketing Mind', line: 'prepared the launch story' },
  deploy_complete: { mind: 'Deploy', line: 'shipped to production' },
  product_launched: { mind: 'Ecosystem', line: 'launched a new product' },
};

export function friendlyEvent(type: string) {
  return FRIENDLY[type] ?? null;
}

export async function getHomeData() {
  try {
    const supabase = createPublicClient();
    const [products, projects, costs, events] = await Promise.all([
      supabase.from('v_products').select('slug,name,tagline,status,url,icon,sort_order,category,launched_at,created_at').order('launched_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
      supabase.from('v_projects').select('project_id,name,status,created_at'),
      supabase.from('v_cost_logs').select('cost_usd,project_id,created_at'),
      supabase.from('v_pipeline_events').select('event_type,project_id,created_at')
        .in('event_type', Object.keys(FRIENDLY)).order('created_at', { ascending: false }).limit(10),
    ]);
    const costRows = costs.data ?? [];
    const { getFixedCosts } = await import('@/lib/fixedCosts');
    const totalSpend =
      costRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0) + (await getFixedCosts());
    const live = (products.data ?? []).filter((p) => p.status === 'live');
    const allProjects = projects.data ?? [];
    const dropped = allProjects.filter((p) => p.status === 'dropped').length;

    const feed = (events.data ?? []).map((e) => ({
      ...FRIENDLY[e.event_type],
      product: (e.project_id || '').replace(/^zo-/, '').replace(/^RA-.*/, 'new ideas') || null,
      at: e.created_at,
    }));

    return {
      liveCount: live.length,
      totalProjects: allProjects.length,
      droppedCount: dropped,
      totalSpend,
      products: live,
      feed,
      apiCalls: costRows.length,
    };
  } catch {
    return null;
  }
}

export interface TreasuryData {
  apiSpend: number;
  fixed: number;
  total: number;
  calls: number;
  todaySpend: number;
  dailyBudget: number | null;
  donationsTotal: number;
  recent: {
    created_at: string; workflow: string | null; project_id: string | null;
    cost_usd: number; kind: 'in' | 'out'; who?: string | null;
  }[];
}

// The public general ledger. Every figure from zo_cost_logs + declared fixed
// costs. Nothing invented, no imaginary donors. Revenue rows will appear here
// the day the first dollar arrives, and not a day before.
export async function getTreasury(): Promise<TreasuryData | null> {
  try {
    const supabase = createPublicClient();
    const [costs, recent, donations] = await Promise.all([
      supabase.from('v_cost_logs').select('cost_usd'),
      supabase
        .from('v_cost_logs')
        .select('created_at,workflow,project_id,cost_usd')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('v_donations_public')
        .select('created_at,amount,donor_name,allocated_project_id')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    const rows = costs.data ?? [];
    const apiSpend = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const { getFixedCosts } = await import('@/lib/fixedCosts');
    const fixed = await getFixedCosts();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data: todayRows } = await supabase
      .from('v_cost_logs')
      .select('cost_usd')
      .gte('created_at', dayStart.toISOString());
    const todaySpend = (todayRows ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const { data: budgetRow } = await supabase
      .from('v_config_public')
      .select('value')
      .eq('key', 'daily_budget_usd')
      .limit(1);
    const dailyBudget = budgetRow?.[0]?.value ? Number(budgetRow[0].value) : null;
    const donRows = donations.data ?? [];
    const donationsTotal = donRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    // Money in and money out interleave in ONE ledger, newest first. A donor's
    // row appears here the moment the webhook records it.
    const outs = (recent.data ?? []).map((r) => ({
      created_at: r.created_at, workflow: r.workflow, project_id: r.project_id,
      cost_usd: Number(r.cost_usd) || 0, kind: 'out' as const,
    }));
    const ins = donRows.slice(0, 3).map((r) => ({
      created_at: r.created_at, workflow: 'donation', project_id: r.allocated_project_id,
      cost_usd: Number(r.amount) || 0, kind: 'in' as const, who: r.donor_name ?? 'anonymous',
    }));
    const merged = [...outs, ...ins]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 7);
    return {
      apiSpend: Math.round(apiSpend * 100) / 100,
      fixed: Math.round(fixed * 100) / 100,
      total: Math.round((apiSpend + fixed) * 100) / 100,
      calls: rows.length,
      todaySpend: Math.round(todaySpend * 100) / 100,
      dailyBudget: dailyBudget && !Number.isNaN(dailyBudget) ? dailyBudget : null,
      donationsTotal: Math.round(donationsTotal * 100) / 100,
      recent: merged,
    };
  } catch {
    return null;
  }
}

export async function getRegistry(): Promise<RegistryRow[] | null> {
  try {
    const supabase = createPublicClient();
    const [projects, costs, products] = await Promise.all([
      supabase.from('v_projects').select('project_id,name,status,category,created_at').order('created_at', { ascending: false }),
      supabase.from('v_cost_logs').select('project_id,cost_usd'),
      supabase.from('v_products').select('slug,url,status'),
    ]);
    const costBy: Record<string, number> = {};
    for (const r of costs.data ?? []) {
      const k = r.project_id || '';
      costBy[k] = (costBy[k] || 0) + (Number(r.cost_usd) || 0);
    }
    const urlBy: Record<string, string> = {};
    for (const p of products.data ?? []) {
      if (p.status === 'live' && p.url) urlBy[`zo-${p.slug}`] = p.url;
    }
    return (projects.data ?? []).map((p) => ({
      project_id: p.project_id,
      name: p.name,
      status: p.status,
      category: p.category,
      created_at: p.created_at,
      cost_usd: Math.round((costBy[p.project_id] || 0) * 100) / 100,
      url: urlBy[p.project_id] ?? null,
    }));
  } catch {
    return null;
  }
}

export async function getStory(slug: string) {
  try {
    const supabase = createPublicClient();
    const pid = `zo-${slug}`;
    const [proj, events, costs, funders] = await Promise.all([
      supabase.from('v_projects').select('project_id,name,status,category,created_at,research_score').eq('project_id', pid).limit(1),
      supabase.from('v_pipeline_events').select('event_type,created_at').eq('project_id', pid)
        .in('event_type', Object.keys(FRIENDLY)).order('created_at', { ascending: true }).limit(200),
      supabase.from('v_cost_logs').select('cost_usd,workflow').eq('project_id', pid),
      supabase.from('v_donations_public').select('donor_name,amount,allocated_at').eq('allocated_project_id', pid)
        .order('created_at', { ascending: true }).limit(100),
    ]);
    if (!proj.data?.length) return null;
    const p = proj.data[0];
    const costRows = costs.data ?? [];
    const totalCost = costRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const milestones = (events.data ?? []).map((e) => ({
      ...FRIENDLY[e.event_type],
      type: e.event_type,
      at: e.created_at,
    }));
    return {
      name: p.name,
      status: p.status,
      category: p.category,
      born: p.created_at,
      score: p.research_score,
      totalCost: Math.round(totalCost * 100) / 100,
      funders: (funders.data ?? []).map((f) => ({
        name: (f.donor_name as string | null) || 'anonymous',
        amount: Number(f.amount) || 0,
      })),
      calls: costRows.length,
      milestones,
    };
  } catch {
    return null;
  }
}

export interface MindStatus {
  key: string;
  name: string;
  epithet: string;
  busy: boolean;
  lastSeen: string | null;
  calls: number;
}

const MIND_DEFS: { key: string; name: string; epithet: string; workflows: string[]; busyStatuses: string[]; mindNames: string[] }[] = [
  { key: 'research_a', name: 'Research Mind A', epithet: 'the philosopher', workflows: ['research'], busyStatuses: ['researching'], mindNames: ['research_a'] },
  { key: 'research_b', name: 'Research Mind B', epithet: 'the architect', workflows: ['research'], busyStatuses: [], mindNames: ['research_b'] },
  { key: 'ethics', name: 'Ethics Mind', epithet: 'the conscience. Veto power', workflows: ['ethics_review'], busyStatuses: [], mindNames: ['ethics'] },
  { key: 'architect', name: 'Pipeline Architect', epithet: 'the planner', workflows: ['build_architect'], busyStatuses: [], mindNames: ['build-architect'] },
  { key: 'builder', name: 'Builder Mind', epithet: 'the craftsman´s hands', workflows: ['builder'], busyStatuses: ['building', 'build_complete', 'qa_fix_needed'], mindNames: ['builder', 'builder_opus'] },
  { key: 'qa', name: 'QA Mind', epithet: 'the honest judge', workflows: ['qa_pipeline'], busyStatuses: ['qa', 'qa_round_1', 'qa_round_2', 'qa_round_3'], mindNames: ['qa'] },
  { key: 'marketing', name: 'Marketing Mind', epithet: 'the storyteller', workflows: ['marketing'], busyStatuses: ['marketing', 'deploying'], mindNames: ['marketing'] },
  { key: 'immune', name: 'Immune System', epithet: 'the night watch', workflows: ['hotfix', 'health'], busyStatuses: [], mindNames: ['immune_system', 'retrospective'] },
];

export async function getMindsStatus(): Promise<{ minds: MindStatus[]; metrics: { attempts: number; launched: number; avgCostLive: number; totalCalls: number; firstMonth: string } } | null> {
  try {
    const supabase = createPublicClient();
    const [costs, projects, products, recentThoughts] = await Promise.all([
      supabase.from('v_cost_logs').select('workflow,created_at,cost_usd,project_id').order('created_at', { ascending: false }).limit(2000),
      supabase.from('v_projects').select('status,created_at'),
      supabase.from('v_products').select('slug,status'),
      supabase.from('v_mind_logs').select('mind_name,created_at').order('created_at', { ascending: false }).limit(40),
    ]);
    const rows = costs.data ?? [];
    const lastByWf: Record<string, string> = {};
    const callsByWf: Record<string, number> = {};
    for (const r of rows) {
      const wf = r.workflow || 'other';
      if (!lastByWf[wf]) lastByWf[wf] = r.created_at;
      callsByWf[wf] = (callsByWf[wf] || 0) + 1;
    }
    const activeStatuses = new Set((projects.data ?? []).map((p) => p.status));
    // Signal 2: a thought logged in the last 10 minutes = that Mind is at work.
    // Covers research/ethics phases where no project status exists yet, and
    // guarantees the glow follows WHOEVER is working. Automatically.
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const freshMinds = new Set(
      (recentThoughts.data ?? [])
        .filter((r) => new Date(r.created_at).getTime() > tenMinAgo)
        .map((r) => r.mind_name),
    );

    const minds: MindStatus[] = MIND_DEFS.map((m) => {
      const seen = m.workflows.map((w) => lastByWf[w]).filter(Boolean).sort().reverse();
      const calls = m.workflows.reduce((s, w) => s + (callsByWf[w] || 0), 0);
      const busy = m.busyStatuses.some((s) => activeStatuses.has(s)) || m.mindNames.some((n) => freshMinds.has(n));
      return { key: m.key, name: m.name, epithet: m.epithet, busy, lastSeen: seen[0] ?? null, calls };
    });

    const allProjects = projects.data ?? [];
    const liveProducts = (products.data ?? []).filter((p) => p.status === 'live');
    const totalSpend = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const first = allProjects.map((p) => p.created_at).sort()[0];

    return {
      minds,
      metrics: {
        attempts: allProjects.length,
        launched: liveProducts.length,
        avgCostLive: liveProducts.length ? Math.round((totalSpend / liveProducts.length) * 100) / 100 : 0,
        totalCalls: rows.length,
        firstMonth: first ? new Date(first).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }) : '·',
      },
    };
  } catch {
    return null;
  }
}


// The last product actually born, with its true all-in cost. The number the
// prototype hardcoded as $66.63. We compute it; we never type it.
export async function getLastBirth(): Promise<{ name: string; cost: number; born: string } | null> {
  try {
    const supabase = createPublicClient();
    const { data: projs } = await supabase
      .from('v_projects')
      .select('project_id,name,status,updated_at')
      .in('status', ['launched', 'live'])
      .order('updated_at', { ascending: false })
      .limit(1);
    const p = projs?.[0];
    if (!p) return null;
    const { data: costRows } = await supabase
      .from('v_cost_logs')
      .select('cost_usd')
      .eq('project_id', p.project_id);
    const cost = (costRows ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    return { name: p.name, cost: Math.round(cost * 100) / 100, born: p.updated_at };
  } catch {
    return null;
  }
}

// The Ethics Mind's latest REAL verdict. The Law section is a receipt, not a
// values statement. Pulled from ethics_reviews, unedited (concerns truncated).
export async function getEthicsLatest(): Promise<{
  idea: string; verdict: string; score: string; concerns: string[]; at: string;
} | null> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('v_ethics_reviews')
      .select('idea_name,verdict,ethical_score,concerns,reviewed_at')
      .order('reviewed_at', { ascending: false })
      .limit(1);
    const r = data?.[0];
    if (!r) return null;
    let concerns: string[] = [];
    try {
      const raw = typeof r.concerns === 'string' ? JSON.parse(r.concerns) : r.concerns;
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) concerns = arr.filter((x) => typeof x === 'string').slice(0, 2);
    } catch { /* concerns stay empty. Show the verdict alone */ }
    return {
      idea: r.idea_name,
      verdict: r.verdict,
      score: String(r.ethical_score),
      concerns,
      at: r.reviewed_at,
    };
  } catch {
    return null;
  }
}

// The Logbook. The machine's own public journal, assembled from the organs it
// already writes: births and deaths from v_projects, the rules it learned the
// hard way from v_postmortems, the reflexes that healed it from v_reflex_log,
// and the self-improvement proposals it drafts for the founder's one tap from
// v_proposals. Nothing authored by a human; every entry is a thing the machine
// did or decided. Founder essays live on jagdishlade.com and never appear here.
export interface LogEntry {
  kind: 'birth' | 'death' | 'lesson' | 'reflex' | 'proposal';
  title: string;
  detail: string;
  at: string;
  meta?: string;
}
export async function getLogbook(): Promise<LogEntry[] | null> {
  try {
    const supabase = createPublicClient();
    const [projects, costs, postmortems, reflexes, proposals] = await Promise.all([
      supabase.from('v_projects').select('project_id,name,status,created_at'),
      supabase.from('v_cost_logs').select('project_id,cost_usd'),
      supabase.from('v_postmortems').select('project_id,kind,error,cost_usd_at_halt,created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('v_reflex_log').select('reflex,action,detail,created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('v_proposals').select('kind,title,status,created_at,decided_at').order('created_at', { ascending: false }).limit(40),
    ]);

    const costByProject = new Map<string, number>();
    for (const c of costs.data ?? []) {
      const k = c.project_id || '';
      costByProject.set(k, (costByProject.get(k) || 0) + (Number(c.cost_usd) || 0));
    }
    const nameOf = (pid: string) => (pid || '').replace(/^zo-/, '').replace(/^RA-.*/, 'a research run') || 'the machine';
    const money = (n: number) => '$' + (Math.round(n * 100) / 100).toFixed(2);

    const entries: LogEntry[] = [];

    for (const p of projects.data ?? []) {
      const cost = costByProject.get(p.project_id) || 0;
      if (p.status === 'live' || p.status === 'launched') {
        entries.push({ kind: 'birth', title: `${p.name} was born`, detail: `A product that did not exist now does. It cost ${money(cost)} of machine reasoning to bring into the world, failures included.`, at: p.created_at, meta: money(cost) });
      } else if (p.status === 'dropped' || p.status === 'sunset' || p.status === 'archived') {
        entries.push({ kind: 'death', title: `${p.name} was let go`, detail: `The machine spent ${money(cost)} and chose not to ship it. A death recorded in daylight is worth more than a success in the dark.`, at: p.created_at, meta: money(cost) });
      }
    }
    for (const pm of postmortems.data ?? []) {
      const halt = money(Number(pm.cost_usd_at_halt) || 0);
      entries.push({ kind: 'lesson', title: `A build halted on ${nameOf(pm.project_id)}`, detail: `The line stopped itself at ${halt} rather than ship something wrong. Reason recorded: ${String(pm.error || pm.kind).slice(0, 180)}.`, at: pm.created_at, meta: pm.kind });
    }
    for (const rx of reflexes.data ?? []) {
      entries.push({ kind: 'reflex', title: `The machine healed itself: ${rx.reflex}`, detail: `${String(rx.detail || rx.action || 'A reflex fired and fixed a problem before a human saw it.').slice(0, 200)}`, at: rx.created_at, meta: rx.action });
    }
    for (const pr of proposals.data ?? []) {
      const st = pr.status === 'adopted' ? 'the founder adopted it' : pr.status === 'rejected' ? 'the founder declined it' : 'it awaits the founder’s one tap';
      entries.push({ kind: 'proposal', title: `The machine proposed a change to itself`, detail: `${String(pr.title || '').slice(0, 180)} · ${st}. The machine may draft its own improvements; it may never adopt them alone.`, at: pr.created_at, meta: pr.status });
    }

    entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return entries.slice(0, 60);
  } catch {
    return null;
  }
}
