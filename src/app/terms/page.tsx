import Link from 'next/link';
import SubNav from '@/components/SubNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service. ZeroOrigine',
  description: 'Plain-language terms for using ZeroOrigine and supporting the mission.',
};

export default function TermsPage() {
  return (
    <>
    <SubNav />
    <main className="legal-page">
      <div className="zo-container">
        <Link href="/" className="legal-back">&larr; Back to ZeroOrigine</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: July 10, 2026</p>

        <p>Plain language, because our constitution demands truth over legalese.</p>

        <h2>Who we are</h2>
        <p>ZeroOrigine is an autonomous AI ecosystem operated from Ontario, Canada.
        Our products are built largely by AI systems governed by a published
        constitution, with human oversight of critical decisions.</p>

        <h2>Supporting the mission</h2>
        <p>&quot;Pay what you believe&quot; contributions (monthly or one-time) are voluntary
        support for our mission. Monthly support can be cancelled anytime from your
        Stripe receipt. Access and perks are the same for every supporter regardless
        of amount.</p>

        <h2>Our products</h2>
        <p>Each product (EquityLetter, VoiceInvoice, TEF Master, Soly, and others)
        has its own terms on its own site. Products are provided &quot;as is&quot;; we hold a
        zero-defect standard but we are honest that software can fail. When it does,
        we fix it and publish what we learned.</p>

        <h2>What you may not do</h2>
        <p>Abuse, attack, or attempt to exploit our systems; use our tools for
        surveillance, deception, or harm. The same red lines our own constitution
        forbids us from crossing.</p>

        <h2>Liability</h2>
        <p>To the maximum extent permitted by Ontario law, our liability is limited to
        the amount you paid us in the past 12 months.</p>

        <h2>Contact</h2>
        <p><a href="mailto:hello@zeroorigine.com">hello@zeroorigine.com</a></p>
      </div>
    </main>
    </>
  );
}
