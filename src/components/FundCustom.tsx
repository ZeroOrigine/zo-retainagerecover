'use client';

import { useState } from 'react';

/** Choose your own number. $1 minimum. No ceiling. */
export default function FundCustom() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) {
      setError('Minimum is $1. No ceiling.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: n }),
      });
      const data = await res.json();
      if (data?.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setError(data?.error || 'Checkout failed. Nothing was charged.');
    } catch {
      setError('Checkout failed. Nothing was charged. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 22, textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          min={1}
          step="1"
          inputMode="decimal"
          placeholder="Your amount, $1 or more"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          aria-label="Custom amount in dollars, one dollar minimum, no ceiling"
          style={{ width: 220, padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 9, color: 'inherit', fontSize: 15 }}
        />
        <button
          onClick={go}
          disabled={loading}
          className="tier-button"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Opening secure checkout…' : 'Fund with your number'}
        </button>
      </div>
      {error && <p role="alert" style={{ color: '#e0525f', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
