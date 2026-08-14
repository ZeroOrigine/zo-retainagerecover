function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string = ''): string {
  return process.env[name] ?? fallback;
}

/** Public config. Safe to expose to the browser */
export const PROJECT_CONFIG = {
  projectId: requireEnv('NEXT_PUBLIC_PROJECT_ID'),
  projectName: requireEnv('NEXT_PUBLIC_PROJECT_NAME'),
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  stripePublishableKey: optionalEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  stripePriceId: optionalEnv('NEXT_PUBLIC_STRIPE_PRICE_ID'),
  siteUrl: optionalEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),
} as const;

/** Server-only config. Never import from client components */
export const SERVER_CONFIG = {
  // Optional: the flagship site reads only PUBLIC data through the anon key +
  // read-only views (see lib/supabase/public.ts), so it runs without this key.
  // Forked products STILL provide it — their billing webhook writes
  // profiles/subscriptions with no user session and needs the service role.
  supabaseServiceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
} as const;
