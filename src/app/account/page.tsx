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
  stripe_customer_id: string | null;
}

// Rate limit configurations (matching rateLimit.ts)
const RATE_LIMITS = {
  free: { requests: 20, label: '20 questions/minute' },
  premium: { requests: 60, label: '60 questions/minute' },
};

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
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
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

  const isPremium = dashboard.subscription_tier === 'premium';
  const rateLimit = isPremium ? RATE_LIMITS.premium : RATE_LIMITS.free;

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
          <p className="text-gray-600 dark:text-gray-300 text-lg">Manage your account and view usage</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Card */}
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {isPremium ? 'Premium Plan' : 'Free Plan'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {rateLimit.label}
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

              {/* Plan Features */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
                  Your Plan Includes
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{rateLimit.requests} questions per minute</span>
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Access to all meeting transcripts</span>
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Source citations with every answer</span>
                  </li>
                  {isPremium && (
                    <>
                      <li className="flex items-center text-gray-700 dark:text-gray-300">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Conversation history saved</span>
                      </li>
                      <li className="flex items-center text-gray-700 dark:text-gray-300">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Priority support</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Subscription Management */}
              {isPremium && dashboard.stripe_customer_id && (
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

              {!isPremium && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <Link href="/pricing">
                    <Button fullWidth>
                      Upgrade to Premium
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Get 3x more questions per minute and save conversations
                  </p>
                </div>
              )}
            </Card>

            {/* Usage Stats Card */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Usage Statistics
              </h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Questions This Month</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.queries_this_month.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Limit</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {rateLimit.requests}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">/min</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      How Rate Limiting Works
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      You can ask up to {rateLimit.requests} questions per minute. There's no monthly limit—rate limits reset every minute, so you can ask as many questions as you need throughout the month.
                    </p>
                  </div>
                </div>
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
                      <span className="text-green-600 dark:text-green-400">Subscribed</span>
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
