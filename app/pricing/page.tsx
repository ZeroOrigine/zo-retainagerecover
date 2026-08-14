// CANONICAL: RetainageRecover public pricing page (route: /pricing).
// PATCH: copy rewritten to match the real catalog (Free + $49 one-time
// Lifetime). The previous version advertised Pro/Enterprise monthly plans
// that do not exist in the database or checkout.
import type { Metadata } from 'next'
import Link from 'next/link'
import PricingTiers from '@/components/marketing/PricingTiers'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Pricing | RetainageRecover',
  description:
    'Free plan with up to 3 projects, full retainage tracking, and invoice previews. Lifetime is one $49 payment for unlimited projects and ready-to-send release invoices.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | RetainageRecover',
    description:
      'Start free with up to 3 projects. One $49 payment unlocks unlimited projects and numbered release invoices, forever.',
    url: '/pricing',
    siteName: 'RetainageRecover',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Pricing | RetainageRecover',
    description:
      'Start free with up to 3 projects. One $49 payment unlocks unlimited projects and numbered release invoices, forever.',
  },
}

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
]

const PLAN_FIT = [
  {
    plan: 'Free',
    title: 'A few jobs at a time',
    body: 'The free plan tracks up to 3 projects with automatic retainage math, the eligible-date countdown, and an on-screen invoice preview. Plenty of solo subs never move past it.',
  },
  {
    plan: 'Lifetime',
    title: 'Steady commercial work',
    body: 'One $49 payment removes the project cap and turns previews into numbered, saved, ready-to-send release invoices with sent and paid tracking. Every future update is included.',
  },
]

const PRICING_FAQS = [
  {
    q: 'Is the free plan actually free?',
    a: 'Yes. Up to 3 projects with held-amount tracking, the eligible-date countdown, and an on-screen release invoice preview. No credit card and no time limit.',
  },
  {
    q: 'Is Lifetime really one payment?',
    a: 'Yes. Lifetime is a single $49 payment. There is no subscription, nothing recurring, and no renewal to remember. You keep every feature and every future update.',
  },
  {
    q: 'What does Lifetime unlock?',
    a: 'Unlimited projects, plus numbered release invoices you can print, save as PDF, or copy straight into an email, with sent and paid tracking so nothing slips.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Payments are processed by Stripe, so major credit and debit cards work. We never see or store your card details.',
  },
  {
    q: 'What happens to my projects if I stay on Free?',
    a: 'They stay yours. The free plan keeps doing the math and counting down release dates on up to 3 projects. Upgrade any time; nothing is lost or migrated.',
  },
]

function Nav() {
  return (
    <header className='sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85'>
      <nav aria-label='Main' className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        <Link href='/' className='flex items-center gap-2'>
          <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-slate-950'>RR</span>
          <span className='text-lg font-bold tracking-tight text-slate-900 dark:text-white'>RetainageRecover</span>
        </Link>
        <div className='hidden items-center gap-7 md:flex'>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className='text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>
              {link.label}
            </Link>
          ))}
        </div>
        <div className='hidden items-center gap-3 md:flex'>
          <Link href='/login' className='text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>
            Log in
          </Link>
          <Link href='/signup' className='inline-flex min-h-[44px] items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-400'>
            Start free
          </Link>
        </div>
        <details className='group relative md:hidden'>
          <summary className='flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700 [&::-webkit-details-marker]:hidden dark:border-slate-700 dark:text-slate-200'>
            <span className='sr-only'>Toggle menu</span>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' className='h-6 w-6 group-open:hidden' aria-hidden='true'>
              <path d='M4 7h16M4 12h16M4 17h16' />
            </svg>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' className='hidden h-6 w-6 group-open:block' aria-hidden='true'>
              <path d='M6 6l12 12M18 6 6 18' />
            </svg>
          </summary>
          <div className='absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900'>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className='block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'>
                {link.label}
              </Link>
            ))}
            <div className='my-2 border-t border-slate-100 dark:border-slate-800' />
            <Link href='/login' className='block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'>
              Log in
            </Link>
            <Link href='/signup' className='mt-1 flex min-h-[44px] items-center justify-center rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400'>
              Start free
            </Link>
          </div>
        </details>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className='border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'>
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-10 md:grid-cols-3'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-slate-950'>RR</span>
              <span className='text-lg font-bold tracking-tight text-slate-900 dark:text-white'>RetainageRecover</span>
            </div>
            <p className='mt-3 max-w-xs text-sm text-slate-600 dark:text-slate-400'>
              Tracks retainage percentages and completion dates, then produces a ready-to-send release invoice on the eligible date. Built for trade subcontractors.
            </p>
          </div>
          <div>
            <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white'>Product</h3>
            <ul className='mt-4 space-y-3 text-sm'>
              <li><Link href='/#features' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>Features</Link></li>
              <li><Link href='/#how' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>How it works</Link></li>
              <li><Link href='/pricing' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>Pricing</Link></li>
              <li><Link href='/#faq' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white'>Company</h3>
            <ul className='mt-4 space-y-3 text-sm'>
              <li><Link href='/about' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>About</Link></li>
              <li><Link href='/login' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>Log in</Link></li>
              <li><Link href='/signup' className='text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'>Start free</Link></li>
            </ul>
          </div>
        </div>
        <div className='mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row dark:border-slate-800 dark:text-slate-400'>
          <p>© {new Date().getFullYear()} RetainageRecover. All rights reserved.</p>
          <p>
            Born autonomously at{' '}
            <a href='https://zeroorigine.com' target='_blank' rel='noopener noreferrer' className='font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-300'>
              ZeroOrigine
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function PricingPage() {
  return (
    <div className='bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
      <Nav />
      <main>
        <section>
          <div className='mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h1 className='text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white'>Start free. Pay once when the jobs stack up.</h1>
              <p className='mt-5 text-lg text-slate-600 dark:text-slate-300'>
                Both plans track retainage percentages and completion dates and count down to the eligible billing date. One $49 payment removes the project cap and unlocks numbered, ready-to-send release invoices, forever.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className='mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8'>
            <PricingTiers />
          </div>
        </section>

        <section className='bg-slate-50 dark:bg-slate-900'>
          <div className='mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>Which plan fits?</h2>
            </div>
            <div className='mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2'>
              {PLAN_FIT.map((item) => (
                <div key={item.plan} className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950'>
                  <span className='inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'>{item.plan}</span>
                  <h3 className='mt-4 text-lg font-semibold text-slate-900 dark:text-white'>{item.title}</h3>
                  <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300'>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className='mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>Pricing questions</h2>
            </div>
            <div className='mt-10 space-y-4'>
              {PRICING_FAQS.map((faq) => (
                <details key={faq.q} className='group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
                  <summary className='flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden dark:text-white'>
                    {faq.q}
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180' aria-hidden='true'>
                      <path d='m6 9 6 6 6-6' />
                    </svg>
                  </summary>
                  <p className='px-5 pb-5 text-sm leading-6 text-slate-600 dark:text-slate-300'>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className='pb-20'>
          <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
            <div className='rounded-3xl bg-slate-900 px-6 py-14 text-center sm:px-14'>
              <h2 className='text-3xl font-bold tracking-tight text-white'>Your next release date is already ticking.</h2>
              <p className='mx-auto mt-4 max-w-xl text-lg text-slate-300'>Set up your open projects in a few minutes and let the eligible dates come to you. One retainage release usually covers the price many times over.</p>
              <div className='mt-8 flex justify-center'>
                <Link href='/signup' className='inline-flex min-h-[48px] items-center justify-center rounded-lg bg-amber-500 px-8 py-3 text-base font-semibold text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-400'>
                  Start free
                </Link>
              </div>
              <p className='mt-4 text-sm text-slate-400'>No credit card required. Free plan included.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
