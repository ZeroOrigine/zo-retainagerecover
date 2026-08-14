// CANONICAL: shared centered-card layout for all RetainageRecover auth pages.
// Server component. Does not render <html>/<body>: the root layout owns those.
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account | RetainageRecover',
  description:
    'Log in or create your RetainageRecover account to track retainage and invoice every release on time.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
      style={{
        backgroundImage:
          'radial-gradient(55rem 28rem at 50% -8%, rgba(251,191,36,0.14), transparent)',
      }}
    >
      <style>{`
        @keyframes zoPop { 0% { opacity: 0; transform: scale(0.85); } 60% { transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes zoFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .zo-pop { animation: zoPop 0.35s ease-out both; }
        .zo-fade-up { animation: zoFadeUp 0.4s ease-out both; }
      `}</style>

      <header className="px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-amber-400">
            R
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Retainage<span className="text-amber-600">Recover</span>
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="zo-fade-up w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Retainage holds 5 to 10% of every job. Track each release date and send the invoice the day you are eligible.
          </p>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} RetainageRecover ·{' '}
          <a
            href="https://zeroorigine.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-slate-600 hover:underline"
          >
            Born autonomously at ZeroOrigine
          </a>
        </p>
      </footer>
    </div>
  )
}
