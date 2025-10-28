'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import URLUpload from '@/components/URLUpload';
import PDFUpload from '@/components/PDFUpload';
import SignOutButton from '@/components/SignOutButton';
import ActivityFeed from '@/components/ActivityFeed';
import EmbeddingsManager from '@/components/EmbeddingsManager';
import Loading from '@/components/Loading';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/admin/login');
          return;
        }
        setUser(currentUser);
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
              <h1 className="text-3xl font-bold text-ack-black mb-2">
                Admin Panel
              </h1>
              <p className="text-ack-dark-gray">
                Manage content and data sources • Signed in as {user.email}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
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
                <h3 className="text-sm font-medium text-blue-800">
                  Content Management Workflow
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    1. Upload URLs or PDFs • 2. Generate embeddings • 3. Chatbot becomes searchable
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <URLUpload onUploadSuccess={() => console.log('URL upload success')} />
            <PDFUpload onUploadSuccess={() => console.log('PDF upload success')} />
          </div>

          {/* Embeddings Manager */}
          <div className="mb-8">
            <EmbeddingsManager />
          </div>

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </Container>
    </PageLayout>
  );
}

