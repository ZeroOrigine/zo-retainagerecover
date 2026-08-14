import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { SERVER_CONFIG } from '@/lib/config';
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
