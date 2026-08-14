// CANONICAL public pricing endpoint for RetainageRecover.
//
// GET /api/plans
//   -> 200 { data: { plans: PlanRow[] }, error: null }
//
// Reads the retainagerecover_plans catalog (declared public content table).
// Prices live in the database and nowhere else: no price env vars, no
// hardcoded amounts. The landing and pricing pages render from this.
//
// rate-limit-exempt: read-only GET of the public pricing catalog; this route
// exports no write methods and spends no money or model tokens.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ServiceError } from '@/lib/db/errors';
import { listActivePlans } from '@/lib/db/plans';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const plans = await listActivePlans(supabase);
    return NextResponse.json({ data: { plans }, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[retainagerecover:api:plans] unexpected error', error);
    return NextResponse.json(
      {
        data: null,
        error: 'We hit a snag on our end. Give it a moment and try again.',
        code: 'INTERNAL',
      },
      { status: 500 }
    );
  }
}
