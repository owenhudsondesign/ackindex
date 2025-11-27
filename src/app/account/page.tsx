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

interface ContentStats {
  totalMeetings: number;
  recentMeetings: Array<{ title: string; date: string }>;
  boardsCovered: string[];
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadContentStats();

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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

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

  const loadContentStats = async () => {
    try {
      // Fetch content statistics
      const response = await fetch('/api/content-stats');
      if (response.ok) {
        const data = await response.json();
        setContentStats(data);
      }
    } catch (error) {
      console.error('Error loading content stats:', error);
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

  // Calculate average tokens per question
  const avgTokensPerQuery = dashboard.queries_this_month > 0
    ? Math.round(dashboard.tokens_used_this_month / dashboard.queries_this_month)
    : 0;

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-16">
        <Container>
        {showSuccess && (
          <div className="mb-8 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">Welcome! Your account is now active.</span>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">My Account</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">View your usage and account settings</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Sponsorship Badge */}
            <Card className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Town of Nantucket</h2>
                    <p className="text-blue-100">Sponsored Access for Residents</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-semibold text-white">
                  Active
                </span>
              </div>
            </Card>

            {/* Your Activity */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Your Activity
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.queries_this_month.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Questions Asked</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {(dashboard.tokens_used_this_month / 1000).toFixed(1)}k
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tokens Used</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {avgTokensPerQuery.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg per Question</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Statistics reset at the beginning of each month
              </p>
            </Card>

            {/* Available Content */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Available Content
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Meeting Recordings</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Transcribed and searchable</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {contentStats?.totalMeetings || '—'}
                  </span>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Boards & Commissions Covered:</p>
                  <div className="flex flex-wrap gap-2">
                    {(contentStats?.boardsCovered || [
                      'Select Board',
                      'Planning Board',
                      'Conservation Commission',
                      'Historic District Commission',
                      'Zoning Board of Appeals',
                      'Board of Health'
                    ]).map((board, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {board}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-8 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Tips for Better Results
              </h2>
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Be specific about dates or meeting types: "What did the Select Board decide on November 19?"</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Ask follow-up questions to dive deeper into topics</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Check the source citations to watch the original meeting footage</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Try asking "How does this affect residents?" for practical implications</span>
                </li>
              </ul>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Member Since</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Updates</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about new features</p>
                  </div>
                  <span className={`text-sm font-medium ${dashboard.email_updates_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {dashboard.email_updates_enabled ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link href="/" className="block">
                  <Button variant="primary" fullWidth>
                    Start Asking Questions
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
                Have questions or feedback? We'd love to hear from you.
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
