'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container, Card, Button, Loading } from '@/components';
import PageLayout from '@/components/PageLayout';
import DarkModeToggle from '@/components/DarkModeToggle';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface UserDashboard {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: 'free' | 'premium';
  subscription_status: string;
  monthly_token_limit: number;
  email_updates_enabled: boolean;
  tokens_used_this_month: number;
  queries_this_month: number;
  tokens_remaining: number;
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadDashboard();
    
    // Check for success parameter
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  const loadDashboard = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch dashboard data with auth token
      const response = await fetch('/api/user/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open subscription management. Please try again.');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card>
          <p className="text-gray-600 dark:text-gray-400">Failed to load account information.</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const usagePercentage = Math.min(
    (dashboard.tokens_used_this_month / dashboard.monthly_token_limit) * 100,
    100
  );

  const isPremium = dashboard.subscription_tier === 'premium';

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-16">
        <Container>
        {showSuccess && (
          <div className="mb-8 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-semibold">
                Welcome to Premium! Your subscription is now active.
              </span>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">My Account</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Manage your subscription and usage</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Card */}
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {isPremium ? 'Premium Plan' : 'Free Plan'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {isPremium
                      ? '50,000 tokens per month'
                      : '3,500 tokens per month'}
                  </p>
                </div>
                {isPremium ? (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                    ⭐ Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    Free
                  </span>
                )}
              </div>

              {!isPremium && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Upgrade to Premium
                  </h3>
                  <p className="text-gray-700 dark:text-gray-200 mb-4">
                    Get unlimited tokens, priority support, and early access to new
                    features for just $9.99/month.
                  </p>
                  <Link href="/pricing">
                    <Button>Upgrade Now</Button>
                  </Link>
                </div>
              )}

              {isPremium && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <Button
                    variant="secondary"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    {portalLoading
                      ? 'Loading...'
                      : 'Manage Subscription & Billing'}
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Update payment method, view invoices, or cancel subscription
                  </p>
                </div>
              )}
            </Card>

            {/* Usage Card */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Usage This Month
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Token Usage
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {`${dashboard.tokens_used_this_month.toLocaleString()} / ${dashboard.monthly_token_limit.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePercentage > 90
                          ? 'bg-red-500 dark:bg-red-600'
                          : usagePercentage > 70
                          ? 'bg-yellow-500 dark:bg-yellow-600'
                          : 'bg-blue-500 dark:bg-blue-600'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {dashboard.tokens_remaining.toLocaleString()} tokens remaining
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Questions Asked</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dashboard.queries_this_month}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg. per Question</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dashboard.queries_this_month > 0
                        ? Math.round(
                            dashboard.tokens_used_this_month /
                              dashboard.queries_this_month
                          )
                        : 0}{' '}
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                        tokens
                      </span>
                    </p>
                  </div>
                </div>

                {!isPremium && usagePercentage > 80 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      ⚠️ You're running low on tokens! Upgrade to Premium for
                      unlimited usage.
                    </p>
                    <Link href="/pricing">
                      <Button size="sm" className="mt-2">
                        View Plans
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Account Info
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dashboard.full_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{dashboard.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email Updates</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dashboard.email_updates_enabled ? (
                      <span className="text-green-600 dark:text-green-400">✓ Subscribed</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Not subscribed</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Preferences */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Preferences
              </h2>
              <DarkModeToggle />
            </Card>

            {/* Quick Actions */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link href="/" className="block">
                  <Button variant="secondary" fullWidth>
                    Go to Chatbot
                  </Button>
                </Link>
                {!isPremium && (
                  <Link href="/pricing" className="block">
                    <Button fullWidth>Upgrade to Premium</Button>
                  </Link>
                )}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={async () => {
                      const { signOut } = await import('@/lib/auth');
                      await signOut();
                      router.push('/login');
                      router.refresh();
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </Card>

            {/* Support */}
            <Card className="bg-gray-50 dark:bg-gray-800/50 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Need Help?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Contact us if you have any questions or issues.
              </p>
              <Link href="/contact">
                <Button variant="secondary" fullWidth>
                  Contact Support
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </Container>
    </div>
    </PageLayout>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loading />
      </div>
    }>
      <AccountContent />
    </Suspense>
  );
}

