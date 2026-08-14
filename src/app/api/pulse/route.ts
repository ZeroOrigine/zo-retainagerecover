import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Whitelist: ONLY these event types are ever exposed publicly, and ONLY as
// human-readable lines. Payloads never leave the server (they can contain
// code and internal details).
const EVENT_MAP: Record<string, { icon: string; mind: string; line: string }> = {
  research_trigger:  { icon: '🔍', mind: 'Research Mind', line: 'went hunting for problems worth solving' },
  research_complete: { icon: '🔍', mind: 'Research Mind', line: 'finished discovering new problems worth solving' },
  evaluation_complete: { icon: '📐', mind: 'Research Mind B', line: 'scored ideas for viability. GO / NO-GO' },
  approval_needed:   { icon: '🔔', mind: 'Ecosystem', line: 'asked the founder to approve a new idea' },
  human_approved:    { icon: '🤝', mind: 'Founder', line: 'approved an idea for building' },
  idea_needs_fixes:  { icon: '⚖️', mind: 'Ethics Mind', line: 'sent an idea back with required fixes' },
  ethics_approved:   { icon: '⚖️', mind: 'Ethics Mind', line: 'approved a product idea against the constitution' },
  ethics_reviewed:   { icon: '⚖️', mind: 'Ethics Mind', line: 'completed an ethics review' },
  build_complete:    { icon: '🔨', mind: 'Builder Mind', line: 'finished building a product' },
  qa_passed:         { icon: '✅', mind: 'QA Mind', line: 'passed a product through quality review' },
  qa_fix_needed:     { icon: '🔬', mind: 'QA Mind', line: 'found issues and sent them back to the Builder' },
  qa_failed:         { icon: '📋', mind: 'QA Mind', line: 'rejected a build. Quality bar not met (we show failures too)' },
  marketing_complete:{ icon: '📣', mind: 'Marketing Mind', line: 'prepared launch content' },
  deploy_complete:   { icon: '🚀', mind: 'Deploy', line: 'shipped a product to production' },
  product_launched:  { icon: '🎉', mind: 'Ecosystem', line: 'launched a new product' },
};

export async function GET() {
  try {
    const supabase = createPublicClient();
    const [eventsRes, versionRes] = await Promise.all([
      supabase
        .from('v_pipeline_events')
        .select('event_type, project_id, created_at')
        .in('event_type', Object.keys(EVENT_MAP))
        .order('created_at', { ascending: false })
        .limit(8),
      fetch('https://zo-langgraph-production-3c96.up.railway.app/health', {
        next: { revalidate: 60 },
      }).then((r) => r.json()).catch(() => null),
    ]);

    const events = (eventsRes.data ?? []).map((e) => {
      const meta = EVENT_MAP[e.event_type];
      const product = (e.project_id || '').replace(/^zo-/, '').replace(/^RA-.*/, 'new ideas');
      return {
        icon: meta.icon,
        mind: meta.mind,
        line: meta.line,
        product: product || null,
        at: e.created_at,
      };
    });

    return NextResponse.json({
      ok: true,
      version: versionRes?.version ?? null,
      events,
    });
  } catch {
    return NextResponse.json({ ok: false, version: null, events: [] }, { status: 200 });
  }
}
