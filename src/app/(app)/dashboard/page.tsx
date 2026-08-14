'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import type { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      setUser(user);
      setLoading(false);
    }

    loadUser();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome back, {user?.email ?? 'there'}!
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Your Profile" description="Manage your account settings.">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Email</dt>
              <dd className="text-gray-900">{user?.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">User ID</dt>
              <dd className="truncate text-gray-900">{user?.id}</dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Subscription"
          description="View your plan and billing."
        >
          <p className="text-sm text-gray-600">
            You are on the <span className="font-semibold">Free</span> plan.
          </p>
          <a
            href="/pricing"
            className="mt-3 inline-block text-sm font-medium text-black hover:underline"
          >
            Upgrade to Pro
          </a>
        </Card>

        <Card
          title="Getting Started"
          description="Build your core feature here."
        >
          <p className="text-sm text-gray-600">
            This is a placeholder for your product&apos;s main feature. Replace
            this card with your custom functionality.
          </p>
        </Card>
      </div>
    </div>
  );
}
