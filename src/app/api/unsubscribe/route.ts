import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

// E2/W4: the promise in /privacy ("you can unsubscribe any time") now has a
// working mechanism BEFORE the first broadcast ever goes out (CASL/PIPEDA).
// Anon calls a security-definer RPC that can only flip unsubscribed_at for the
// given email. No read surface, no update surface, one switch.
export async function POST(req: Request) {
  try {
    const { email, company } = await req.json();
    if (typeof company === 'string' && company.trim() !== '') {
      return NextResponse.json({ ok: true }); // honeypot: silent success
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 });
    }
    const supabase = createPublicClient();
    const { error } = await supabase.rpc('unsubscribe_email', { p_email: email });
    if (error) throw error;
    // Idempotent by design: unknown or already-unsubscribed emails return the
    // same success. No oracle for probing which emails exist.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
