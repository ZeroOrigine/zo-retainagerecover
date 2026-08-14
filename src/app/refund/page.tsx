import Link from 'next/link';
import SubNav from '@/components/SubNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy. ZeroOrigine',
  description: 'Simple, honest refunds.',
};

export default function RefundPage() {
  return (
    <>
    <SubNav />
    <main className="legal-page">
      <div className="zo-container">
        <Link href="/" className="legal-back">&larr; Back to ZeroOrigine</Link>
        <h1>Refund Policy</h1>
        <p className="legal-updated">Last updated: July 10, 2026</p>

        <h2>Mission support (Pay What You Believe)</h2>
        <p>If you supported us and regret it for any reason, tell us within 30 days
        and we refund it in full. No questions, no friction. Every contribution is
        one-time: no subscription, no recurring charge, nothing to cancel.</p>

        <h2>Product purchases</h2>
        <p>Every paid product we ship carries a 30-day money-back guarantee unless
        its own pricing page says otherwise. If it did not deliver the value it
        promised, you should not pay for it.</p>

        <h2>How to request</h2>
        <p>Email <a href="mailto:hello@zeroorigine.com">hello@zeroorigine.com</a> with
        your receipt. Refunds are processed through Stripe within 5 business days.</p>
      </div>
    </main>
    </>
  );
}
