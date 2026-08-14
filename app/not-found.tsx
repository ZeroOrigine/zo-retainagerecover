// CANONICAL 404 page for RetainageRecover.
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">That page is not here.</h1>
        <p className="mt-2 text-sm text-slate-600">
          The link may be old, or the record it pointed at was deleted. Your retainage math is still safe.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
