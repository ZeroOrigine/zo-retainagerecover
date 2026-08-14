import Link from 'next/link';
import type { Metadata } from 'next';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your receipt. ZeroOrigine',
  description: 'The permanent record of a funded birth. This URL is your tracker. No account needed.',
  robots: { index: false }, // receipts are private-by-obscurity; never indexed
};

interface Donation {
  donation_id: string;
  receipt_number: string;
  amount: number;
  donor_name: string | null;
  allocated_project_id: string | null;
  allocated_at: string | null;
  created_at: string;
  member_id: string;
}

async function getDonation(sessionId: string): Promise<Donation | null> {
  try {
    const supabase = createPublicClient();
    // get_receipt is a security-definer RPC: fetchable by the (secret) session id,
    // but zo_donations stays non-enumerable to anon.
    const { data } = await supabase.rpc('get_receipt', { p_session_id: sessionId });
    return (data?.[0] as Donation) ?? null;
  } catch {
    return null;
  }
}

export default async function ReceiptPage({ params }: { params: { session: string } }) {
  // Session ids are cs_live_/cs_test_ strings. Anything else is not a receipt.
  const sessionId = params.session.startsWith('cs_') ? params.session : '';
  const d = sessionId ? await getDonation(sessionId) : null;

  return (
    <div className="v4" style={{ minHeight: '100vh' }}>
      <nav><div className="wrap nav">
        <div className="logo">Zero<span>Origine</span></div>
        <Link href="/" style={{ color: 'var(--dim)', fontSize: 14 }}>&larr; Back to the control room</Link>
      </div></nav>

      <main className="wrap" style={{ padding: '72px 32px 120px', maxWidth: 760 }}>
        {d ? (
          <>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>Receipt · permanent record</div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>
              Your money is in the machine.
            </h1>
            <p className="lede">
              This page is your tracker. Bookmark it. No account, no password: the URL itself is
              your receipt. When the machine spends your dollars into a birth, this page will name
              the product they became.
            </p>
            <div className="certbox" style={{ marginTop: 30, maxWidth: 'none' }}>
              <span className="k">receipt ........</span> <span className="v">{d.receipt_number}</span><br />
              <span className="k">amount .........</span> <span className="v">${Number(d.amount).toFixed(2)}</span><br />
              <span className="k">received .......</span> <span className="v">{new Date(d.created_at).toISOString().slice(0, 16).replace('T', ' · ')} UTC</span><br />
              <span className="k">on certificate .</span> <span className="nm">{d.donor_name || 'anonymous. A first-class choice'}</span><br />
              <span className="k">supporter id ...</span> <span className="v">{d.member_id}</span><br />
              <span className="k">status .........</span>{' '}
              {d.allocated_project_id ? (
                <span className="v">
                  spent into <Link href={`/story/${d.allocated_project_id.replace(/^zo-/, '')}`} style={{ color: 'var(--alive)' }}>
                    {d.allocated_project_id.replace(/^zo-/, '')}
                  </Link>{' '}. Your product exists
                </span>
              ) : (
                <span className="v">in the treasury. Funds the next birth (oldest money is spent first)</span>
              )}
            </div>
            <p className="fine" style={{ textAlign: 'left', marginTop: 18 }}>
              This record also lives in the public ledger on the{' '}
              <Link href="/#treasury" style={{ color: 'var(--gold)' }}>treasury</Link>, where it must
              reconcile to the cent. If it ever doesn&apos;t, that failure gets published too.
            </p>
          </>
        ) : (
          <>
            <div className="eyebrow">Receipt</div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>The machine is writing your receipt.</h1>
            <p className="lede">
              If you just completed a payment, the record lands here within a few seconds ·{' '}
              <a href="" style={{ color: 'var(--alive)' }}>refresh this page</a>. If it doesn&apos;t
              appear within a minute, the machine failed and the founder has been alerted. Your
              money is not lost, and this page will tell the truth when it recovers.
            </p>
            <p className="fine" style={{ textAlign: 'left' }}>
              Nothing here yet? Check that you used the exact link Stripe sent you to.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
