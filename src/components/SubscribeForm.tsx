'use client';

import { useRef, useState } from 'react';

// Off-screen honeypot style. A real user never sees or fills it; most bots do.
const hpStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: 1,
  height: 1,
  overflow: 'hidden',
};

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot: must stay empty
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const mountedAt = useRef(Date.now());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Cheap bot filter #1: honeypot filled -> pretend success, write nothing.
    if (company) {
      setState('done');
      setMsg('You are in. The Minds will write when something real happens.');
      return;
    }
    // Cheap bot filter #2: submitted faster than a human could type an email.
    if (Date.now() - mountedAt.current < 2000) {
      setState('done');
      setMsg('You are in. The Minds will write when something real happens.');
      return;
    }
    setState('busy');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      });
      const d = await res.json();
      if (d.ok) {
        setState('done');
        setMsg('You are in. The Minds will write when something real happens.');
      } else {
        setState('error');
        setMsg(d.error || 'Something went wrong.');
      }
    } catch {
      setState('error');
      setMsg('Network hiccup. Try again.');
    }
  }

  if (state === 'done') {
    return <p className="subscribe-done" role="status">{msg}</p>;
  }

  return (
    <form className="subscribe-form" onSubmit={submit} aria-label="Follow the experiment by email">
      {/* Honeypot: hidden from humans, catches bots. Not Turnstile (no keys yet); Turnstile
          would slot in here as an additional invisible-captcha widget when founder keys exist. */}
      <div aria-hidden="true" style={hpStyle}>
        <label htmlFor="sf-company">Company (leave blank)</label>
        <input
          id="sf-company"
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        aria-label="Email address"
        disabled={state === 'busy'}
      />
      <button type="submit" disabled={state === 'busy'}>
        {state === 'busy' ? 'Joining…' : 'Follow the experiment'}
      </button>
      {state === 'error' && <p className="subscribe-error" role="alert">{msg}</p>}
    </form>
  );
}
