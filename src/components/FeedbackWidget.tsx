'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';

const feedbackTypes = ['bug', 'feature', 'improvement', 'other'] as const;

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot: must stay empty
  const [loading, setLoading] = useState(false);
  const openedAt = useRef(0);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Cheap bot filter #1: honeypot filled -> pretend success, write nothing.
    if (company) {
      setResult('success');
      setMessage('');
      setEmail('');
      setTimeout(() => { setOpen(false); setResult(null); }, 2000);
      return;
    }
    // Cheap bot filter #2: submitted faster than a human could read + type.
    if (openedAt.current && Date.now() - openedAt.current < 2000) {
      setResult('success');
      setMessage('');
      setEmail('');
      setTimeout(() => { setOpen(false); setResult(null); }, 2000);
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, email: email || undefined, company }),
      });

      if (res.ok) {
        setResult('success');
        setMessage('');
        setEmail('');
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 2000);
      } else {
        setResult('error');
      }
    } catch {
      setResult('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => { openedAt.current = Date.now(); setOpen(true); }}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="Send feedback"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-gray-900">
              Send Feedback
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Help us improve. We read every message.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Honeypot: hidden from humans, catches bots. Turnstile would slot in here
                as an invisible captcha once the founder provisions the secret key. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="fb-company">Company (leave blank)</label>
              <input
                id="fb-company"
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
                <label
                  htmlFor="feedback-type"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Type
                </label>
                <select
                  id="feedback-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {feedbackTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="feedback-message"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                  minLength={10}
                  placeholder="Tell us what's on your mind..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label
                  htmlFor="feedback-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email (optional)
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {result === 'success' && (
                <p className="text-sm text-green-600">
                  Thank you! Your feedback has been received.
                </p>
              )}
              {result === 'error' && (
                <p className="text-sm text-red-600">
                  Something went wrong. Please try again.
                </p>
              )}

              <Button type="submit" size="md" className="w-full" loading={loading}>
                Submit Feedback
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
