import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingPortalSession } from '@/services/payment.service';
import { successResponse, errorResponse } from '@/types/api';

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        errorResponse('Please sign in to manage your billing.'),
        { status: 401 },
      );
    }

    const session = await createBillingPortalSession(user.id);

    return NextResponse.json(successResponse({ url: session.url }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not open billing portal.';
    return NextResponse.json(errorResponse(message), { status: 500 });
  }
}
