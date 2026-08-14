import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getZoMeta } from '@/lib/zo-meta';

export const dynamic = 'force-static';

const meta = getZoMeta();

export function generateMetadata(): Metadata {
  if (!meta) return { title: 'About' };
  return {
    title: `About ${meta.name}`,
    description: meta.tagline ?? meta.description ?? `How ${meta.name} was built.`,
    openGraph: {
      title: `About ${meta.name}`,
      description: meta.tagline ?? meta.description ?? `How ${meta.name} was built.`,
      type: 'website',
    },
  };
}

// Product-agnostic About page. Renders ONLY when the deploy layer has written
// src/lib/zo-meta.json for this product; otherwise 404 (zeroorigine.com ships the
// sentinel and has no About page). Styled with the template's own utility classes so
// it inherits whatever design the forked product carries.
export default function AboutPage() {
  if (!meta) notFound();
  const m = meta;

  const certRows: Array<[string, string]> = [];
  const dots = (label: string) => label + ' ' + '.'.repeat(Math.max(2, 16 - label.length));
  certRows.push(['product', String(m.name)]);
  if (m.born) certRows.push(['born', String(m.born)]);
  if (m.research_score != null) certRows.push(['research score', `${m.research_score} / 10`]);
  if (m.ethics_verdict || m.ethics_score != null) {
    const parts = [m.ethics_verdict, m.ethics_score != null ? `${m.ethics_score} / 10` : null].filter(Boolean);
    certRows.push(['ethics verdict', parts.join(' · ')]);
  }
  if (m.quality_score != null) certRows.push(['quality score', `${m.quality_score} / 185`]);
  if (m.cost_usd != null) {
    const acts = m.reasoning_acts != null ? ` · ${m.reasoning_acts} acts of machine reasoning` : '';
    certRows.push(['true cost', `$${m.cost_usd}${acts}`]);
  }
  certRows.push(['human authors', m.human_authors ?? 'none']);
  if (m.funders) certRows.push(['funded by', String(m.funders)]);
  if (m.story_url) certRows.push(['biography', m.story_url.replace(/^https?:\/\//, '')]);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: m.name,
    description: m.tagline ?? m.description ?? undefined,
    parentOrganization: {
      '@type': 'Organization',
      name: 'ZeroOrigine',
      url: 'https://zeroorigine.com',
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About {m.name}</h1>
      {m.tagline && (
        <p className="mt-4 text-lg leading-relaxed text-gray-600">{m.tagline}</p>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Who built this</h2>
        <p className="mt-3 leading-relaxed text-gray-600">No human wrote a line of this product.</p>
        <p className="mt-3 leading-relaxed text-gray-600">
          {m.name} was born inside <strong>ZeroOrigine</strong>, an autonomous institution: eight AI
          Minds with a constitution, a moral compass, and a budget. One Mind found the problem.
          Another judged it worth solving. An Ethics Mind reviewed it before a dollar was spent. A
          Builder wrote it, a QA Mind refused to ship it until it passed, and the machine deployed it.
          A human founder supervises the institution, not the code.
        </p>
        <p className="mt-3 leading-relaxed text-gray-600">
          Every product ZeroOrigine births publishes its full record: what it cost, what failed on
          the way, and who funded it. You can inspect all of it, including this product&apos;s complete
          build history, at{' '}
          <a href="https://zeroorigine.com" className="underline underline-offset-2">zeroorigine.com</a>.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Birth certificate</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-5">
          <dl className="mx-auto w-full max-w-[640px] font-mono text-[13px] leading-relaxed sm:text-sm">
            {certRows.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 py-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <dt className="whitespace-nowrap text-gray-500">{dots(k)}</dt>
                <dd className="text-gray-900 sm:text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          The cost figure is real and reconciles to the cent with ZeroOrigine&apos;s public treasury.
          Failed attempts are included, never hidden.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">The rules it was born under</h2>
        <p className="mt-3 leading-relaxed text-gray-600">
          Before this product existed, an Ethics Mind reviewed the idea unprompted and raised its own
          concerns. Those concerns shaped what was built.
          {m.ethics_concerns && m.ethics_concerns.length > 0 && (
            <> The concerns it raised: {m.ethics_concerns.join('; ')}.</>
          )}{' '}
          The full constitution, all eleven articles, is public at{' '}
          <a href="https://zeroorigine.com/#law" className="underline underline-offset-2">zeroorigine.com</a>.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Your data</h2>
        <p className="mt-3 leading-relaxed text-gray-600">
          Your data belongs to you. It is isolated per account, never sold, and never used for
          anything except making this product work for you. Details:{' '}
          <Link href={m.privacy_url ?? '/privacy'} className="underline underline-offset-2">Privacy</Link> ·{' '}
          <Link href={m.terms_url ?? '/terms'} className="underline underline-offset-2">Terms</Link> ·{' '}
          <Link href={m.refund_url ?? '/refund'} className="underline underline-offset-2">Refunds</Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Questions</h2>
        <p className="mt-3 leading-relaxed text-gray-600">
          A human answers:{' '}
          <a href="mailto:hello@zeroorigine.com" className="underline underline-offset-2">hello@zeroorigine.com</a>
        </p>
        <h2 className="mt-12 text-xl font-semibold">Put your name on something that did not exist</h2>
        <p className="mt-3 leading-relaxed text-gray-600">
          The machine keeps its own ledger, so it knows the exact cost of one act of creation. If you
          want, you can fund the next one. Pay what you believe, from a single dollar. Your money is
          spent in front of you, building a real product, and your name goes on that product&apos;s
          birth certificate, for good.
        </p>
        <p className="mt-6">
          <a
            href="https://zeroorigine.com/join"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Fund a birth on ZeroOrigine &#8599;
          </a>
        </p>
        {m.story_url && (
          <p className="mt-6">
            <a href={m.story_url} className="text-sm underline underline-offset-2">Read the full biography</a>
          </p>
        )}
      </section>
    </main>
  );
}
