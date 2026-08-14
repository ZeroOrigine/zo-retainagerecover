import Link from 'next/link';
import JoinRevealObserver from '@/components/JoinRevealObserver';
import DonateButton from '@/components/DonateButton';
import FundCustom from '@/components/FundCustom';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support ZeroOrigine. Fund the Future of Fair Intelligence',
  description:
    "This isn't a subscription. It's a statement. Fund ZeroOrigine's autonomous ecosystem that builds free AI tools for everyone.",
  openGraph: {
    title: 'Support ZeroOrigine. Pay What You Believe',
    description: 'Intelligence is no longer scarce. But access is. Help us close the gap.',
    type: 'website',
    url: 'https://zeroorigine.com/join',
  },
};

export default function JoinPage() {
  return (
    <div className="v4">
      <JoinRevealObserver />
      <a href="#support" className="skip-link">Skip to main content</a>

      <nav><div className="wrap nav">
        <Link href="/" className="logo">Zero<span>Origine</span></Link>
        <ul>
          <li><Link href="/#registry">Products</Link></li>
          <li><Link href="/#law">Constitution</Link></li>
          <li><Link href="/#treasury">Treasury</Link></li>
        </ul>
        <Link href="/" className="btn ghost">Back to ZeroOrigine</Link>
      </div></nav>

      <main>
        {/* Hero */}
        <section style={{ borderTop: 'none' }}><div className="wrap" style={{ textAlign: 'center' }}>
          <div className="eyebrow">Fund a birth</div>
          <h2 style={{ fontSize: 'clamp(34px,5.2vw,58px)', maxWidth: '18ch', margin: '0 auto' }}>
            This isn&apos;t a subscription. It&apos;s a <em style={{ fontStyle: 'normal', color: 'var(--alive)' }}>statement</em>.
          </h2>
          <p className="lede" style={{ margin: '18px auto 0', textAlign: 'center' }}>
            You believe AI should be built with ethics, transparency, and zero compromise. You believe
            intelligence tools should reach everyone, not sit locked behind price tags. Put your name behind it.
          </p>
          <div className="heroCta" style={{ justifyContent: 'center', marginTop: 26 }}>
            <a href="#support" className="btn gold">Support the mission</a>
            <a href="#promise" className="btn ghost">Read the promise</a>
          </div>
        </div></section>

        {/* Fund a birth */}
        <section id="support" className="reveal"><div className="wrap">
          <div className="eyebrow">Pay what you believe</div>
          <h2>Fund a birth</h2>
          <p className="lede">
            One time. No subscription, no account, no recurring anything. At checkout you can put a name
            on the birth certificate, or stay anonymous. You get a permanent receipt URL that tracks
            exactly what your money becomes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 34, maxWidth: 720 }}>
            <DonateButton amount={5} label="$5" />
            <DonateButton amount={25} label="$25" />
            <DonateButton amount={58} label="$58. Births a product" />
            <DonateButton amount={174} label="$174. Three births" />
          </div>

          <FundCustom />

          <p className="lede" style={{ marginTop: 26, fontSize: 15.5 }}>
            $1 minimum, no ceiling. Everyone gets the same access. No tiers, no gatekeeping. The machine
            spends the oldest money first, and your receipt page names the product your dollars became.
          </p>
        </div></section>

        {/* What every supporter gets */}
        <section className="reveal"><div className="wrap">
          <div className="eyebrow">Same access for everyone</div>
          <h2>What every supporter gets</h2>
          <p className="lede">Same access. Same respect. Whether you give $1 or $100.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(272px,1fr))', gap: 12, marginTop: 36 }}>
            {[
              ['01', 'Watch every birth, live', 'The machine panel, the logbook, the biographies. You see products being born in real time.'],
              ['02', 'Your support on the record', 'Every contribution lands in the public treasury ledger with a receipt. The books stay open.'],
              ['03', 'Full build-log transparency', 'Every dollar spent. Every product built. Every failure buried honestly. You see what we see.'],
            ].map(([n, h, p]) => (
              <div key={n} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 22, background: 'var(--bg2)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--dim2)' }}>{n}</div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, marginTop: 12 }}>{h}</h3>
                <p style={{ color: 'var(--dim)', marginTop: 8, fontSize: 15 }}>{p}</p>
              </div>
            ))}
          </div>
        </div></section>

        {/* The promise */}
        <section id="promise" className="reveal"><div className="wrap">
          <div className="eyebrow">Four things we will never do</div>
          <h2>The promise</h2>
          <div style={{ marginTop: 28, display: 'grid', gap: 12, maxWidth: 720 }}>
            {[
              'We will never sell your data.',
              'We will never send you spam.',
              'We will never guilt-trip you for leaving.',
              'We will never hide how we spend your money.',
            ].map((t) => (
              <div key={t} style={{ borderLeft: '2px solid var(--alive)', paddingLeft: 16, color: 'var(--txt)', fontSize: 17 }}>{t}</div>
            ))}
          </div>
          <p className="lede" style={{ marginTop: 24 }}>
            If we fail, if the ecosystem produces nothing of value, we&apos;ll tell you. Honesty is Article III
            of our constitution.
          </p>
        </div></section>

        {/* CTA */}
        <section className="cta"><div className="wrap">
          <div className="eyebrow">Every gap we close</div>
          <h2>Every gap we close makes the world slightly more <em style={{ fontStyle: 'normal', color: 'var(--alive)' }}>fair</em>.</h2>
          <p className="lede" style={{ marginInline: 'auto', textAlign: 'center' }}>
            Intelligence is no longer scarce. Access still is. Help us close the gap.
          </p>
          <div className="heroCta" style={{ justifyContent: 'center', marginTop: 24 }}>
            <a href="#support" className="btn gold">Support the mission</a>
          </div>
        </div></section>
      </main>

      <footer><div className="wrap fr">
        <span>© 2026 ZeroOrigine · run by the things it describes · <Link href="/privacy">privacy</Link> · <Link href="/terms">terms</Link> · <Link href="/refund">refunds</Link></span>
        <span><Link href="/">← back to main site</Link></span>
      </div></footer>
    </div>
  );
}
