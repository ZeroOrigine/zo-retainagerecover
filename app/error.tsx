'use client';

// CANONICAL route-level error boundary for RetainageRecover.
// Catches render/runtime errors below the root layout and offers recovery
// instead of a white screen.

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[retainagerecover:boundary]', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Something broke</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">We hit a snag on our end.</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your projects and invoices are safe. Try again, and if it keeps happening, head back to the dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
