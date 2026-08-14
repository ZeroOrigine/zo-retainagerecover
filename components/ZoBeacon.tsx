'use client';

// CANONICAL analytics beacon for RetainageRecover.
// <ZoBeacon /> is mounted once in the root layout and reports pageviews.
// zoEvent() reports funnel moments: 'signup', 'activation', 'payment'.
// Fire-and-forget by contract: it must NEVER throw, block, or slow the UI.
// If NEXT_PUBLIC_ZO_BEACON_URL is unset, every call is a silent no-op.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PRODUCT = 'retainagerecover';

export function zoEvent(event: string, meta?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    const url = process.env.NEXT_PUBLIC_ZO_BEACON_URL;
    if (!url) return;

    const payload = JSON.stringify({
      product: PRODUCT,
      event,
      path: window.location.pathname,
      ts: new Date().toISOString(),
      meta: meta ?? {},
    });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      return;
    }

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics never break the product.
  }
}

export default function ZoBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    zoEvent('pageview');
  }, [pathname]);

  return null;
}
