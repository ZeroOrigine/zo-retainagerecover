'use client';

import { useState } from 'react';

interface DonateButtonProps {
  amount: number;
  label: string;
  className?: string;
}

export default function DonateButton({ amount, label, className = '' }: DonateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
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
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`tier-button ${className}`}
        style={{ opacity: loading ? 0.7 : 1 }}
        aria-label={`Fund a birth with ${amount} dollars, one time`}
      >
        {loading ? 'Opening secure checkout…' : label}
      </button>
      {error && <p role="alert" style={{ color: '#e0525f', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </>
  );
}
