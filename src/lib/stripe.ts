import Stripe from 'stripe';
import { SERVER_CONFIG } from '@/lib/config';

export const stripe = new Stripe(SERVER_CONFIG.stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});
