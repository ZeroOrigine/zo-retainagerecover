// CANONICAL /about page for RetainageRecover: marketing about page, server rendered.
import Link from 'next/link';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listActivePlans } from '@/lib/db/plans';
import type { PlanRow } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About | RetainageRecover',
  description:
    'Why RetainageRecover exists: track retainage on every job and send the release invoice on the day it becomes eligible.',
};

const NAV_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

const FEATURES = [
  {
    title: 'Tracks the numbers from your contract',
    body: 'Contract value, retainage percent, completion date, and the hold period. That is all it needs.',
  },
  {
    title: 'Does the math for you',
    body: 'The retainage amount and the release eligible date are computed from your inputs and stay in lockstep with them.',
  },
  {
    title: 'Sorts by urgency',
    body: 'The dashboard puts the jobs you can bill today at the top, with a countdown for everything else.',
  },
  {
    title: 'Outputs a ready-to-send invoice',
    body: 'On the eligible date, generate a numbered release invoice with the GC in the bill-to block and the line item already written.',
  },
];

const STEPS = [
  {
    title: 'Add a job',
    body: 'Name, general contractor, contract value, and retainage percent. It takes about a minute.',
  },
  {
    title: 'Set the dates',
    body: 'Enter the completion date and any hold period from the contract. The release eligible date is computed for you.',
  },
  {
    title: 'Invoice on the day',
    body: 'When the date arrives, create the release invoice, mark it sent, and track it through paid.',
  },
];

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function getPlans(): Promise<PlanRow[]> {
  try {
    const supabase = createSupabaseServerClient();
    return await listActivePlans(supabase);
  } catch {
    return [];
  }
}

function CheckIcon() {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 20 20'
      fill='currentColor'
      className='mt-0.5 h-4 w-4 shrink-0 text-amber-600'
    >
      <path
        fillRule='evenodd'
        d='M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.3a1 1 0 0 1-1.42.004L3.29 9.2a1 1 0 1 1 1.42-1.408l2.086 2.104 6.494-6.588a1 1 0 0 1 1.414-.018z'
        clipRule='evenodd'
      />
    </svg>
  );
}

function MarketingHeader() {
  return (
    <header className='sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur'>
      <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6'>
        <Link
          href='/'
          className='flex items-center gap-2 rounded-md font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600'
        >
          <span
            aria-hidden='true'
            className='flex h-8 w-8 items-center justify-center rounded-md bg-amber-600 text-white'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 12h6m-6 4h4M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2z'
              />
            </svg>
          </span>
          <span>RetainageRecover</span>
        </Link>

        <nav aria-label='Main' className='hidden items-center gap-6 md:flex'>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.href === '/about' ? 'page' : undefined}
              className={
                link.href === '/about'
                  ? 'rounded text-sm font-semibold text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600'
                  : 'rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600'
              }
            >
              {link.label}
            </Link>
          ))}
          <Link
            href='/login'
            className='rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600'
          >
            Sign in
          </Link>
          <Link
            href='/signup'
            className='rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2'
          >
            Get started
          </Link>
        </nav>

        <details className='relative md:hidden'>
          <summary
            aria-label='Menu'
            className='flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 [&::-webkit-details-marker]:hidden'
          >
            <svg aria-hidden='true' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
            </svg>
          </summary>
          <nav
            aria-label='Mobile'
            className='absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg'
          >
            <Link href='/' className='block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'>
              Home
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.href === '/about' ? 'page' : undefined}
                className='block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
              >
                {link.label}
              </Link>
            ))}
            <Link href='/login' className='block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'>
              Sign in
            </Link>
            <Link
              href='/signup'
              className='mt-1 block rounded-md bg-amber-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-amber-700'
            >
              Get started
            </Link>
          </nav>
        </details>
      </div>
      {/* QA-010: close the mobile <details> menu when a menu link is tapped so the open menu never lingers over content after same-page navigation. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){if(window.__rrMenuAutoClose)return;window.__rrMenuAutoClose=true;document.addEventListener('click',function(e){var t=e.target;if(!t||typeof t.closest!=='function')return;var a=t.closest('header details a');if(!a)return;var d=a.closest('details');if(d)d.removeAttribute('open');},true);})();",
        }}
      />
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className='border-t border-slate-200 bg-slate-50'>
      <div className='mx-auto max-w-6xl px-4 py-10 sm:px-6'>
        <div className='flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='font-semibold text-slate-900'>RetainageRecover</p>
            <p className='mt-1 text-sm text-slate-600'>Track retainage. Invoice the release. Collect what you earned.</p>
          </div>
          <nav aria-label='Footer' className='flex flex-wrap gap-x-6 gap-y-2 text-sm'>
            <Link href='/' className='text-slate-600 hover:text-slate-900'>Home</Link>
            <Link href='/pricing' className='text-slate-600 hover:text-slate-900'>Pricing</Link>
            <Link href='/about' className='text-slate-600 hover:text-slate-900'>About</Link>
            <Link href='/login' className='text-slate-600 hover:text-slate-900'>Sign in</Link>
          </nav>
        </div>
        <p className='mt-8 text-sm text-slate-500'>
          Born autonomously at{' '}
          <a
            href='https://zeroorigine.com'
            className='font-medium text-slate-700 underline hover:text-slate-900'
          >
            ZeroOrigine
          </a>
        </p>
      </div>
    </footer>
  );
}

export default async function AboutPage() {
  const plans = await getPlans();

  return (
    <div className='flex min-h-screen flex-col bg-white text-slate-900'>
      <MarketingHeader />

      <main className='flex-1'>
        <section className='border-b border-slate-100 bg-gradient-to-b from-amber-50 to-white'>
          <div className='mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20'>
            <p className='text-sm font-semibold uppercase tracking-wide text-amber-700'>About RetainageRecover</p>
            <h1 className='mt-3 text-4xl font-bold tracking-tight sm:text-5xl'>
              Built to recover the money you already earned
            </h1>
            <p className='mt-5 text-lg leading-relaxed text-slate-600'>
              Retainage clauses hold back a slice of nearly every commercial job. RetainageRecover tracks that held
              money for you and hands you a ready-to-send release invoice on the day you can bill for it.
            </p>
          </div>
        </section>

        <section className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
          <h2 className='text-2xl font-bold sm:text-3xl'>Earned money that never gets billed</h2>
          <p className='mt-4 leading-relaxed text-slate-600'>
            Most commercial contracts hold back 5 to 10 percent of the contract value until after closeout. The
            release date lands weeks or months later, when the crew is already on the next job and the paperwork is
            buried. Retainage that was earned in full never gets invoiced, so it never gets paid.
          </p>
          <p className='mt-4 leading-relaxed text-slate-600'>
            RetainageRecover exists for that single moment. It keeps the release date in front of you and turns it
            into an invoice the day it arrives.
          </p>
        </section>

        <section className='border-y border-slate-100 bg-slate-50'>
          <div className='mx-auto max-w-6xl px-4 py-14 sm:px-6'>
            <h2 className='text-2xl font-bold sm:text-3xl'>What it does</h2>
            <div className='mt-8 grid gap-6 sm:grid-cols-2'>
              {FEATURES.map((feature) => (
                <article key={feature.title} className='rounded-xl border border-slate-200 bg-white p-6'>
                  <h3 className='font-semibold text-slate-900'>{feature.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600'>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
          <h2 className='text-2xl font-bold sm:text-3xl'>How it works</h2>
          <ol className='mt-8 space-y-6'>
            {STEPS.map((step, index) => (
              <li key={step.title} className='flex gap-4'>
                <span
                  aria-hidden='true'
                  className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white'
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className='font-semibold text-slate-900'>{step.title}</h3>
                  <p className='mt-1 text-sm leading-relaxed text-slate-600'>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className='border-y border-slate-100 bg-slate-50'>
          <div className='mx-auto max-w-4xl px-4 py-14 sm:px-6'>
            <h2 className='text-2xl font-bold sm:text-3xl'>Priced like a tool, not a platform</h2>
            <p className='mt-4 max-w-2xl leading-relaxed text-slate-600'>
              Retainage release is a moment, not an ongoing workflow, so the paid plan is a single purchase. Start
              free on your real jobs, then pay once when you want unlimited projects and ready-to-send invoices.
            </p>
            {plans.length > 0 ? (
              <div className='mt-8 grid gap-6 sm:grid-cols-2'>
                {plans.map((plan) => (
                  <article key={plan.id} className='flex flex-col rounded-xl border border-slate-200 bg-white p-6'>
                    <h3 className='font-semibold text-slate-900'>{plan.name}</h3>
                    <p className='mt-2 text-3xl font-bold text-slate-900'>
                      {plan.price_cents === 0 ? 'Free' : formatPrice(plan.price_cents, plan.currency)}
                      {plan.billing_type === 'one_time' ? (
                        <span className='ml-2 text-sm font-medium text-slate-500'>pay once</span>
                      ) : null}
                    </p>
                    <p className='mt-3 text-sm leading-relaxed text-slate-600'>{plan.description}</p>
                    <ul className='mt-4 space-y-2'>
                      {(Array.isArray(plan.features) ? plan.features : []).map((feature) => (
                        <li key={feature} className='flex items-start gap-2 text-sm text-slate-700'>
                          <CheckIcon />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <p className='mt-6 text-sm text-slate-600'>
                Plans are listed on the{' '}
                <Link href='/pricing' className='font-medium text-amber-700 underline hover:text-amber-800'>
                  pricing page
                </Link>
                .
              </p>
            )}
            <div className='mt-8'>
              <Link
                href='/pricing'
                className='rounded text-sm font-semibold text-amber-700 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600'
              >
                Full pricing details
              </Link>
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
          <h2 className='text-2xl font-bold sm:text-3xl'>Where it comes from</h2>
          <p className='mt-4 leading-relaxed text-slate-600'>
            RetainageRecover was born at{' '}
            <a
              href='https://zeroorigine.com'
              className='font-medium text-amber-700 underline hover:text-amber-800'
            >
              ZeroOrigine
            </a>
            , an ecosystem where software is designed, built, and operated autonomously. This product was created end
            to end by that system and is maintained the same way. What people actually use decides what gets improved
            next.
          </p>
        </section>

        <section className='bg-slate-900'>
          <div className='mx-auto max-w-3xl px-4 py-16 text-center sm:px-6'>
            <h2 className='text-3xl font-bold text-white'>Stop leaving retainage behind</h2>
            <p className='mt-3 text-slate-300'>Track your first three jobs free. Upgrade once if it earns its keep.</p>
            <div className='mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row'>
              <Link
                href='/signup'
                className='w-full rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-auto'
              >
                Start free
              </Link>
              <Link
                href='/pricing'
                className='w-full rounded-md border border-slate-600 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-auto'
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
