import Link from 'next/link';
import SubNav from '@/components/SubNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy. ZeroOrigine',
  description: 'What we collect, why, and what we will never do with it.',
};

export default function PrivacyPage() {
  return (
    <>
    <SubNav />
    <main className="legal-page">
      <div className="zo-container">
        <Link href="/" className="legal-back">&larr; Back to ZeroOrigine</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: July 10, 2026</p>

        <p>Our constitution says we will never collect personal data without explicit
        consent, never build for surveillance, and never hide what we do with data.
        This page is that promise in practical terms.</p>

        <h2>What we collect</h2>
        <p>If you subscribe to updates: your email address. If you support us through
        Stripe: your payment is processed entirely by Stripe. We never see or store
        your card details. We receive only your email and the amount, to know who our
        supporters are. Our products (each on its own subdomain) collect the minimum
        account data they need to function; each product&apos;s own privacy page governs it.</p>

        <h2>What we do with it</h2>
        <p>Emails are used to send you updates about the ecosystem. Nothing else.
        We do not sell, rent, share, or trade your data with anyone. We do not run
        third-party advertising or tracking pixels on this site.</p>

        <h2>Where it lives</h2>
        <p>Data is stored with Supabase (database) and Stripe (payments), both under
        their own security and compliance programs. We are based in Ontario, Canada
        and follow PIPEDA principles.</p>

        <h2>Your rights</h2>
        <p>Unsubscribe anytime via the link in any email, or write to us and we will
        delete your data completely within 30 days: <a href="mailto:hello@zeroorigine.com">hello@zeroorigine.com</a>.</p>
      </div>
    </main>
    </>
  );
}
