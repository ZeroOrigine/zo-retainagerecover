// CANONICAL: RetainageRecover marketing landing page (route: /). All sections are inline in this file by design.
import type { Metadata } from 'next'
import Link from 'next/link'
import PricingTiers from '@/components/marketing/PricingTiers'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'RetainageRecover | Invoice retainage the day it’s eligible',
  description:
    'Track retainage percentages and completion dates on every job, then send a ready-made release invoice the day you become eligible. Built for trade subcontractors. Free plan included.',
  keywords: [
    'retainage',
    'retention billing',
    'release invoice',
    'subcontractor billing',
    'construction invoicing',
    'retainage tracker',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'RetainageRecover | Invoice retainage the day it’s eligible',
    description:
      'Commercial contracts hold back 5 to 10% of what you earn. RetainageRecover tracks the percentage and the completion date, then produces a ready-to-send release invoice on the eligible date.',
    url: '/',
    siteName: 'RetainageRecover',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RetainageRecover | Invoice retainage the day it’s eligible',
    description:
      'Retainage percent and completion-date tracking with a ready-to-send release invoice on the eligible date.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RetainageRecover',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web browser',
  url: siteUrl,
  description:
    'Retainage percent and completion-date tracker that produces a ready-to-send release invoice on the eligible date.',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Lifetime', price: '49', priceCurrency: 'USD' },
  ],
}

const entranceStyles = `
@keyframes rrFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.rr-fade { animation: rrFadeUp 0.7s ease-out both; }
.rr-d1 { animation-delay: 0.08s; }
.rr-d2 { animation-delay: 0.16s; }
.rr-d3 { animation-delay: 0.24s; }
@media (prefers-reduced-motion: reduce) { .rr-fade { animation: none; } }
`

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
]

const FEATURES = [
  {
    title: 'Held money, tracked',
    body: 'Enter the contract value and the retainage percent. The held amount is computed for you and rolls up into one running total across every job.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6' aria-hidden='true'>
        <circle cx='12' cy='12' r='8.5' />
        <path d='M12 7.5v9' />
        <path d='M14.5 9.7c-.5-.8-1.4-1.3-2.5-1.3-1.4 0-2.5.8-2.5 1.8 0 2.6 5 1.5 5 4 0 1-1.1 1.8-2.5 1.8-1.1 0-2-.5-2.5-1.3' />
      </svg>
    ),
  },
  {
    title: 'Date in, date out',
    body: 'Log the completion date and the release terms from your contract. Your eligible billing date is worked out and tracked from that moment on.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6' aria-hidden='true'>
        <rect x='3.5' y='5.5' width='17' height='15' rx='2' />
        <path d='M3.5 10h17M8 3v4M16 3v4' />
        <circle cx='12' cy='15' r='1.2' fill='currentColor' stroke='none' />
      </svg>
    ),
  },
  {
    title: 'Invoice, ready to send',
    body: 'On the eligible date, a formatted release invoice is waiting: right project, right amount, right date. Download it and send it.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6' aria-hidden='true'>
        <path d='M13.5 3.5h-6A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V8z' />
        <path d='M13.5 3.5V8H18' />
        <path d='M9 12.5h6M9 16h6' />
      </svg>
    ),
  },
  {
    title: 'Every job, one screen',
    body: 'What’s held, what’s eligible now, and what’s coming due, readable in about ten seconds.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6' aria-hidden='true'>
        <rect x='4' y='4' width='7' height='7' rx='1.5' />
        <rect x='13' y='4' width='7' height='7' rx='1.5' />
        <rect x='4' y='13' width='7' height='7' rx='1.5' />
        <rect x='13' y='13' width='7' height='7' rx='1.5' />
      </svg>
    ),
  },
  {
    title: 'One-minute setup',
    body: 'Three fields per project. No imports, no setup call, no manual. Add a job from your truck between stops.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6' aria-hidden='true'>
        <path d='M13 3 6 13.5h5L10 21l8-10.5h-5L13 3Z' />
      </svg>
    ),
  },
  {
    title: 'Built for one moment',
    body: 'Retainage release is a single moment in the life of a job. This tool exists for exactly that moment, and the free plan covers it.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6' aria-hidden='true'>
        <circle cx='12' cy='12' r='8.5' />
        <circle cx='12' cy='12' r='4.5' />
        <circle cx='12' cy='12' r='1' fill='currentColor' stroke='none' />
      </svg>
    ),
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Add the job',
    body: 'Contract value, retainage percent, completion date, release terms. About a minute of typing, even with gloves on.',
  },
  {
    n: '2',
    title: 'Watch the countdown',
    body: 'The held amount and the eligible date sit on your dashboard, counting down while you work the next job.',
  },
  {
    n: '3',
    title: 'Send the invoice',
    body: 'On the eligible date your release invoice is ready. Download it, send it, and collect what you already earned.',
  },
]

const SCENARIOS = [
  {
    title: 'The one that slipped',
    body: 'You wrapped in March. Retainage came eligible in June. By June you were three jobs deep and the invoice never went out. That is the exact moment this tool exists for.',
  },
  {
    title: 'The spreadsheet nobody updates',
    body: 'The percentages live in a spreadsheet, the completion dates live in your head, and the release terms live in a PDF somewhere in your email. Nothing on that list will tap you on the shoulder when the money comes due.',
  },
  {
    title: 'The awkward chase',
    body: 'Chasing retainage a year late means digging out contracts, rereading clauses, and hoping the GC’s AP desk cooperates. Invoicing on the eligible date is just another routine invoice.',
  },
]

const FAQS = [
  {
    q: 'What exactly is retainage?',
    a: 'On most commercial jobs, the contract lets the GC or owner hold back a slice of every payment, usually 5 to 10%, until the work is complete. That held money is retainage. It is money you already earned, and in most contracts it is not released until you invoice for it.',
  },
  {
    q: 'How does RetainageRecover know when I can invoice?',
    a: 'You enter the completion date and the release terms from your contract, for example 60 days after substantial completion. RetainageRecover turns that into a tracked eligible date and has your release invoice ready on that day. Your contract stays the source of truth; the tool makes sure the date never slips past you.',
  },
  {
    q: 'What does the free plan include?',
    a: 'Up to 3 projects with the full feature set: held-amount tracking, the eligible-date countdown, and ready-to-send release invoices. No credit card and no time limit. If you rarely hold retainage on more than three jobs at once, the free plan may be all you ever need.',
  },
  {
    q: 'Does it connect to my accounting or invoicing software?',
    a: 'No, and that is deliberate. You download the release invoice and send it the way you already send invoices. Nothing to connect, migrate, or maintain.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Your projects are stored under your account and are readable by you alone. Sign-in is protected, and card payments are handled by Stripe. Your data is never sold.',
  },
  {
    q: 'Is the paid plan really one payment?',
    a: 'Yes. Lifetime is a single $49 payment processed by Stripe. It unlocks unlimited projects and numbered, ready-to-send release invoices forever, including every future update. No subscription, nothing recurring, and your projects stay yours either way.',
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

export default function HomePage() {
  return (
    <div className='bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
      <style dangerouslySetInnerHTML={{ __html: entranceStyles }} />
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main>
        {/* Hero */}
        <section className='relative overflow-hidden'>
          <div aria-hidden='true' className='pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10' />
          <div aria-hidden='true' className='pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl dark:bg-amber-500/5' />
          <div className='relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8'>
            <div>
              <p className='rr-fade inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'>
                For trade subcontractors on commercial jobs
              </p>
              <h1 className='rr-fade rr-d1 mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white'>
                Every retainage dollar, invoiced the day it’s eligible.
              </h1>
              <p className='rr-fade rr-d2 mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300'>
                Commercial contracts hold back 5 to 10% of what you earn until after closeout. RetainageRecover tracks the percentage and the completion date on every job, then hands you a ready-to-send release invoice the moment you can bill it.
              </p>
              <div className='rr-fade rr-d3 mt-8 flex flex-col gap-3 sm:flex-row'>
                <Link href='/signup' className='inline-flex min-h-[48px] items-center justify-center rounded-lg bg-amber-500 px-7 py-3 text-base font-semibold text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-400'>
                  Start free
                </Link>
                <Link href='/#how' className='inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-300 px-7 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900'>
                  See how it works
                </Link>
              </div>
              <p className='rr-fade rr-d3 mt-4 text-sm text-slate-500 dark:text-slate-400'>
                Free plan included. No credit card required. Your first project takes about a minute to set up.
              </p>
            </div>
            <div aria-hidden='true' className='rr-fade rr-d2 relative'>
              <div className='absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-amber-200/50 via-amber-100/20 to-transparent blur-2xl dark:from-amber-500/10 dark:via-amber-500/5' />
              <div className='relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'>Total retainage held</p>
                    <p className='mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>$23,150</p>
                  </div>
                  <span className='rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400'>Example</span>
                </div>
                <div className='mt-5 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800'>
                  <div className='flex items-center justify-between gap-3 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900 dark:text-white'>Riverside Medical Office</p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>10% of $84,500</p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <p className='text-sm font-semibold text-slate-900 dark:text-white'>$8,450</p>
                      <span className='rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'>Invoice ready</span>
                    </div>
                  </div>
                  <div className='flex items-center justify-between gap-3 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900 dark:text-white'>Maple Street Fit-Out</p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>5% of $126,000</p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <p className='text-sm font-semibold text-slate-900 dark:text-white'>$6,300</p>
                      <span className='rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'>Eligible in 12 days</span>
                    </div>
                  </div>
                  <div className='flex items-center justify-between gap-3 py-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900 dark:text-white'>Northgate Warehouse</p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>10% of $84,000</p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <p className='text-sm font-semibold text-slate-900 dark:text-white'>$8,400</p>
                      <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300'>Held until Sep 30</span>
                    </div>
                  </div>
                </div>
                <div className='mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300'>Ready today</p>
                    <p className='mt-0.5 text-sm font-semibold text-slate-900 dark:text-white'>Release invoice RR-0107 · Riverside Medical Office</p>
                  </div>
                  <span className='rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-amber-500 dark:text-slate-950'>Download</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The math strip */}
        <section className='border-y border-amber-100 bg-amber-50/60 dark:border-slate-800 dark:bg-slate-900/60'>
          <div className='mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <p className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>5 to 10%</p>
              <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>of contract value held back as retainage on typical commercial jobs</p>
            </div>
            <div className='text-center'>
              <p className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>$8,500</p>
              <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>held on a single $85,000 job at 10% retainage</p>
            </div>
            <div className='text-center'>
              <p className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>One invoice</p>
              <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>stands between you and money you already earned</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id='features' className='scroll-mt-20'>
          <div className='mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>Everything you need to collect retainage. Nothing extra.</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>Three inputs per job. One invoice out. Here is what happens in between.</p>
            </div>
            <div className='mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {FEATURES.map((feature) => (
                <div key={feature.title} className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'>{feature.icon}</div>
                  <h3 className='mt-4 text-lg font-semibold text-slate-900 dark:text-white'>{feature.title}</h3>
                  <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300'>{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id='how' className='scroll-mt-20 bg-slate-50 dark:bg-slate-900'>
          <div className='mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>From closeout to collected in three steps</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>No modules to configure and no manual to read. Add a job and the tool takes it from there.</p>
            </div>
            <div className='relative mt-14'>
              <div aria-hidden='true' className='absolute left-[12%] right-[12%] top-7 hidden border-t-2 border-dashed border-slate-300 md:block dark:border-slate-700' />
              <div className='relative grid grid-cols-1 gap-12 md:grid-cols-3'>
                {STEPS.map((step) => (
                  <div key={step.n} className='text-center'>
                    <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-amber-400 ring-8 ring-slate-50 dark:bg-amber-500 dark:text-slate-950 dark:ring-slate-900'>{step.n}</div>
                    <h3 className='mt-5 text-lg font-semibold text-slate-900 dark:text-white'>{step.title}</h3>
                    <p className='mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600 dark:text-slate-300'>{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id='pricing' className='scroll-mt-20'>
          <div className='mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>Simple pricing. The free plan does real work.</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>Track up to 3 projects free, forever. One $49 payment unlocks unlimited projects and numbered release invoices.</p>
            </div>
            <div className='mt-12'>
              <PricingTiers />
            </div>
          </div>
        </section>

        {/* Sound familiar */}
        <section className='bg-slate-50 dark:bg-slate-900'>
          <div className='mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>Sound familiar?</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>The pattern repeats on almost every commercial job. If any of these sting, the fix costs nothing to start.</p>
            </div>
            <div className='mt-14 grid grid-cols-1 gap-6 md:grid-cols-3'>
              {SCENARIOS.map((scenario) => (
                <div key={scenario.title} className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950'>
                  <h3 className='text-lg font-semibold text-slate-900 dark:text-white'>{scenario.title}</h3>
                  <p className='mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300'>{scenario.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id='faq' className='scroll-mt-20'>
          <div className='mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8'>
            <div className='text-center'>
              <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>Questions, answered</h2>
            </div>
            <div className='mt-10 space-y-4'>
              {FAQS.map((faq) => (
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

        {/* Final CTA */}
        <section className='bg-slate-900'>
          <div className='mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8'>
            <h2 className='text-3xl font-bold tracking-tight text-white sm:text-4xl'>The job is done. The money is yours.</h2>
            <p className='mx-auto mt-4 max-w-2xl text-lg text-slate-300'>Track the percent and the date on every job, and send the release invoice the day it counts. Setup takes about a minute.</p>
            <div className='mt-8 flex justify-center'>
              <Link href='/signup' className='inline-flex min-h-[48px] items-center justify-center rounded-lg bg-amber-500 px-8 py-3 text-base font-semibold text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-400'>
                Start free
              </Link>
            </div>
            <p className='mt-4 text-sm text-slate-400'>No credit card required. Free plan included.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
