import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/services/payment.service';
import { successResponse, errorResponse } from '@/types/api';

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        errorResponse('Please sign in to continue.'),
        { status: 401 },
      );
    }

    const session = await createCheckoutSession(user.id, user.email!);

    return NextResponse.json(successResponse({ url: session.url }));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not create checkout session.';
    return NextResponse.json(errorResponse(message), { status: 500 });
  }
}
