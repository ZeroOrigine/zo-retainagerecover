// Optional per-product birth metadata. The deploy layer writes src/lib/zo-meta.json
// from the database at deploy (name, tagline, born, scores, true cost, funders, story url).
// The template ships a sentinel (present:false) so this static import ALWAYS resolves and
// can never break a build. zeroorigine.com keeps the sentinel and therefore has no /about page.
import raw from './zo-meta.json';

export interface ZoMeta {
  present?: boolean;
  name?: string;
  tagline?: string;
  description?: string;
  born?: string;              // e.g. "2026-07-15 · 12:32 UTC"
  research_score?: number | string;
  ethics_verdict?: string;   // e.g. "APPROVED"
  ethics_score?: number | string;
  ethics_concerns?: string[];
  quality_score?: number | string;
  cost_usd?: number | string;
  reasoning_acts?: number | string;
  human_authors?: string;    // e.g. "none"
  funders?: string;          // e.g. "the founder" or comma-separated names
  story_url?: string;
  privacy_url?: string;
  terms_url?: string;
  refund_url?: string;
}

/** Returns the product's birth metadata, or null when absent (sentinel / no product). */
export function getZoMeta(): ZoMeta | null {
  const m = raw as ZoMeta;
  if (!m || m.present === false || !m.name) return null;
  return m;
}
