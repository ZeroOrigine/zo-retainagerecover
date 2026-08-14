import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PROJECT_CONFIG } from '@/lib/config';

export async function createCheckoutSession(
  userId: string,
  email: string,
): Promise<Stripe.Checkout.Session> {
  const priceId = PROJECT_CONFIG.stripePriceId;

  if (!priceId) {
    throw new Error(
      'Stripe price ID is not configured. Set NEXT_PUBLIC_STRIPE_PRICE_ID in your environment.',
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${PROJECT_CONFIG.siteUrl}/dashboard?checkout=success`,
    cancel_url: `${PROJECT_CONFIG.siteUrl}/pricing?checkout=cancelled`,
    metadata: {
      user_id: userId,
      project_id: PROJECT_CONFIG.projectId,
    },
  });

  return session;
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const supabase = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      // Update profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: session.customer as string })
        .eq('id', userId);

      // Insert subscription record
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0]?.price?.id ?? '',
        status: subscription.status,
        current_period_start: new Date(
          subscription.current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      });

      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000,
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq('stripe_subscription_id', subscription.id);

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);
      }

      break;
    }

    default:
      // Unhandled event type. No action needed
      break;
  }
}

export async function getSubscription(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, stripe_price_id, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Could not retrieve your subscription. Please try again.');
  }

  return data;
}

export async function createBillingPortalSession(
  userId: string,
): Promise<Stripe.BillingPortal.Session> {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.stripe_customer_id) {
    throw new Error(
      'No billing account found. Please subscribe to a plan first.',
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${PROJECT_CONFIG.siteUrl}/dashboard`,
  });

  return session;
}
