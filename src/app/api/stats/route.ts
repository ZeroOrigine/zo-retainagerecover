import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';
import { getFixedCosts } from '@/lib/fixedCosts';

// Always run at request time. The numbers must be real, never build-time stale.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public stats for the home page. Uses the service-role client server-side so
 * "Total Products" can include non-live (approved/building) products that anon
 * RLS cannot see. Live products are returned for the product grid.
 * Fail-soft: on any error returns ok:false; the client keeps its last-known
 * values rather than showing wrong numbers.
 */
export async function GET() {
  try {
    const supabase = createPublicClient();

    // SCALABLE BY DESIGN: liveCount is a COUNT query (never limited by the
    // payload), the grid payload is capped at the 12 newest. At 500 products
    // the homepage stays light and the count stays true. Ordering is
    // launched_at (set by the pipeline), never manual sort_order (which the
    // autonomous deploy never sets. Every new product would collide at 0).
    const [{ count: totalCount }, { count: liveTotal }, liveRes, spendRes] = await Promise.all([
      supabase.from('v_products').select('id', { count: 'exact', head: true }),
      supabase.from('v_products').select('id', { count: 'exact', head: true }).eq('status', 'live'),
      supabase
        .from('v_products')
        .select('slug, name, tagline, description, status, url, icon, sort_order, category, launched_at')
        .eq('status', 'live')
        .order('launched_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(12),
      // [2026-07-15 Cowork] aggregate view, never row-capped: v_cost_logs rows
      // exceed PostgREST's 1000-row cap as the ledger grows, which would
      // silently undercount the public spend number. SUM lives in the DB now.
      supabase.from('v_cost_total').select('total_usd').single(),
    ]);

    if (liveRes.error) throw liveRes.error;

    const live = liveRes.data ?? [];
    const apiSpend = Number((spendRes.data as { total_usd: number | null } | null)?.total_usd) || 0;
    // Total Invested = variable API spend + fixed costs (subscriptions + one-time R&D)
    const totalSpend = apiSpend + (await getFixedCosts());

    return NextResponse.json(
      {
        ok: true,
        liveCount: liveTotal ?? live.length,
        totalCount: totalCount ?? live.length,
        totalSpend: Math.round(totalSpend * 100) / 100,
        products: live,
      },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
    );
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
