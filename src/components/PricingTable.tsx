'use client';

import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with the essentials.',
    features: [
      'Basic dashboard',
      'Community support',
      'Up to 100 records',
      'Single project',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'Everything you need to scale.',
    features: [
      'Advanced dashboard',
      'Priority support',
      'Unlimited records',
      'Multiple projects',
      'API access',
      'Custom integrations',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
];

export default function PricingTable() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planName: string) {
    if (planName === 'Free') {
      router.push('/auth/signup');
      return;
    }

    setLoading(planName);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const json = await res.json();

      if (json.data?.url) {
        window.location.href = json.data.url;
      } else {
        // If not authenticated, redirect to login
        router.push('/auth/login');
      }
    } catch {
      router.push('/auth/login');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-lg border p-8 ${
            plan.highlighted
              ? 'border-black shadow-lg'
              : 'border-gray-200'
          }`}
        >
          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

          <div className="mt-4">
            <span className="text-4xl font-bold text-gray-900">
              {plan.price}
            </span>
            <span className="text-sm text-gray-500">{plan.period}</span>
          </div>

          <ul className="mt-6 space-y-3">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button
              variant={plan.highlighted ? 'primary' : 'outline'}
              size="lg"
              className="w-full"
              loading={loading === plan.name}
              onClick={() => handleCheckout(plan.name)}
            >
              {plan.cta}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
