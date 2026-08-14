import { createPublicClient } from '@/lib/supabase/public';

/**
 * Fixed costs of running the ecosystem, folded into the public total.
 * All three values live in zo_config. Editable anytime, no redeploy:
 *   website_fixed_onetime_usd. Lifetime one-time investment (founder R&D)
 *   website_fixed_monthly_usd. Monthly subscriptions (Supabase, Railway, n8n, domains)
 *   website_fixed_start_date. When monthly accrual starts (YYYY-MM-DD)
 * Accrual: onetime + monthly * fractional months elapsed. Fail-soft to 0.
 */
export async function getFixedCosts(): Promise<number> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('v_config_public')
      .select('key,value')
      .in('key', [
        'website_fixed_onetime_usd',
        'website_fixed_monthly_usd',
        'website_fixed_start_date',
      ]);
    const cfg = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const onetime = Number(cfg.website_fixed_onetime_usd) || 0;
    const monthly = Number(cfg.website_fixed_monthly_usd) || 0;
    const start = cfg.website_fixed_start_date ? new Date(cfg.website_fixed_start_date) : null;
    let months = 0;
    if (start && !isNaN(start.getTime())) {
      months = Math.max(0, (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
    }
    return onetime + monthly * months;
  } catch {
    return 0;
  }
}
