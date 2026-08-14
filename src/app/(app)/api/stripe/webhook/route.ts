import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { PROJECT_CONFIG, SERVER_CONFIG } from '@/lib/config';
import { handleWebhookEvent } from '@/services/payment.service';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature.' },
      { status: 400 },
    );
  }

  if (!SERVER_CONFIG.stripeWebhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured.' },
      { status: 500 },
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      SERVER_CONFIG.stripeWebhookSecret,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Webhook signature verification failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }


  // SHARED-ACCOUNT FILTER: this Stripe account carries EVERY product plus
  // donations, and each webhook receives all of it. Only checkout sessions this
  // product stamped at creation (metadata.product; legacy metadata.project_id)
  // are ours — anything else is acknowledged (200, so Stripe stops retrying)
  // and IGNORED. Captured incident: the $1 donation session cs_live_a1sQUqDE
  // (metadata {type: donation}) was wrongly fulfilled by a foreign handler.
  if (event.type.startsWith('checkout.session.')) {
    const _obj = event.data.object as { metadata?: Record<string, string> | null };
    const _md = _obj?.metadata ?? {};
    const _ours =
      _md['product'] === PROJECT_CONFIG.projectId ||
      (!_md['product'] && _md['project_id'] === PROJECT_CONFIG.projectId);
    if (!_ours) {
      return NextResponse.json({ received: true, ignored: 'foreign_session' });
    }
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Webhook handler failed.';
    console.error('Webhook processing error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
