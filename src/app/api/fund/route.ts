import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RAILWAY = process.env.NEXT_PUBLIC_RAILWAY_URL || 'https://zo-langgraph-production-3c96.up.railway.app';

/**
 * Same-origin proxy for fund-a-birth checkout. The browser was calling
 * Railway cross-origin and CORS silently blocked every click. Now the
 * browser talks to its own origin; the server talks to Railway.
 * $1 minimum. No ceiling: a supporter decides what creation is worth.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ ok: false, error: 'Minimum is $1.' }, { status: 400 });
    }
    const r = await fetch(`${RAILWAY}/donations/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount * 100) / 100 }),
      cache: 'no-store',
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.checkout_url) {
      return NextResponse.json({ ok: false, error: 'Checkout could not be created. Nothing was charged. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, checkout_url: d.checkout_url });
  } catch {
    return NextResponse.json({ ok: false, error: 'Checkout could not be created. Nothing was charged. Please try again.' }, { status: 502 });
  }
}
