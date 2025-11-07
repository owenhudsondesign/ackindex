'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAdminUser } from '@/lib/adminAuth';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import PDFUpload from '@/components/PDFUpload';
import SignOutButton from '@/components/SignOutButton';
import ActivityFeed from '@/components/ActivityFeed';
import ScheduledScrapesManager from '@/components/ScheduledScrapesManager';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import DocumentsList from '@/components/DocumentsList';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import VideoScraper from '@/components/VideoScraper';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/admin/login');
          return;
        }

        // Check if user has admin role
        const adminUser = await getAdminUser();
        if (!adminUser) {
          console.error('User is not an admin');
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }

        setUser(adminUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="max-w-4xl mx-auto flex justify-center">
            <Loading />
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (isUnauthorized) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Access Denied
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  You don't have permission to access the admin panel. Only administrators can view this page.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Home
                </button>
              </div>
            </Card>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout>
      <Container className="py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Admin Panel
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Manage content and data sources • Signed in as {user.email}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400 dark:text-blue-300"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Automated Content Management
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Schedule URLs for automatic scraping • Upload PDFs directly • Monitor scraping activity
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track user engagement, popular searches, and trending topics
              </p>
            </div>
            <AnalyticsDashboard />
          </div>

          {/* Queue Monitoring */}
          <div className="mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-ack-blue dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Queue Dashboard
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Monitor scraping and embedding job queues in real-time
                    </p>
                  </div>
                </div>
                <a
                  href="/api/admin/bull-board"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ack-blue text-white rounded-full hover:bg-opacity-90 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                >
                  <span>View Dashboard</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </Card>
          </div>

          {/* Video Scraper - NEW */}
          <div className="mb-8">
            <VideoScraper />
          </div>

          {/* Documents List */}
          <div className="mb-8">
            <DocumentsList />
          </div>

          {/* Scheduled Scrapes Manager */}
          <div className="mb-8">
            <ScheduledScrapesManager />
          </div>

          {/* PDF Upload */}
          <div className="mb-8">
            <PDFUpload onUploadSuccess={() => console.log('PDF upload success')} />
          </div>

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </Container>
    </PageLayout>
  );
}

