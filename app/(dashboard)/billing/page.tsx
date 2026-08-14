// CANONICAL billing page wrapper: force-dynamic so checkout return params are read safely.
import { Suspense } from 'react';
import BillingClient from './billing-client';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true">
          <div className="h-9 w-48 rounded-lg bg-slate-200 shimmer" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-72 rounded-xl bg-slate-200 shimmer" />
            <div className="h-72 rounded-xl bg-slate-200 shimmer" />
          </div>
        </div>
      }
    >
      <BillingClient />
    </Suspense>
  );
}
