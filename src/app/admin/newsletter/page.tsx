'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAdminUser } from '@/lib/adminAuth';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import Card from '@/components/Card';
import Loading from '@/components/Loading';
import Button from '@/components/Button';

interface NewsletterPreview {
  subject: string;
  previewText: string;
  htmlContent: string;
  meetingsCount: number;
  meetingTypes: string[];
  weekStart: string;
  weekEnd: string;
  meetings: {
    id: string;
    title: string;
    slug: string;
    meeting_type: string | null;
    meeting_date: string | null;
  }[];
}

interface SubscriberStats {
  total: number;
  byLanguage: { en: number; es: number; pt: number };
}

export default function NewsletterAdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [preview, setPreview] = useState<NewsletterPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStats | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/admin/login');
          return;
        }

        const adminUser = await getAdminUser();
        if (!adminUser) {
          router.push('/admin');
          return;
        }

        setIsAuthorized(true);
        fetchSubscriberStats();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const fetchSubscriberStats = async () => {
    try {
      const response = await fetch('/api/admin/newsletter/stats');
      if (response.ok) {
        const data = await response.json();
        setSubscriberStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscriber stats:', error);
    }
  };

  const generatePreview = async () => {
    setIsGenerating(true);
    setSendResult(null);
    try {
      const response = await fetch(`/api/admin/newsletter?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      } else {
        const error = await response.json();
        setSendResult({ success: false, message: error.error || 'Failed to generate preview' });
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setSendResult({ success: false, message: 'Failed to generate preview' });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendNewsletter = async () => {
    if (!confirm('Are you sure you want to send this newsletter to all subscribers?')) {
      return;
    }

    setIsSending(true);
    setSendResult(null);
    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({
          success: true,
          message: `Newsletter triggered successfully! ${data.meetingsCount} meetings included.`,
        });
        setPreview(null);
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send newsletter' });
      }
    } catch (error) {
      console.error('Failed to send newsletter:', error);
      setSendResult({ success: false, message: 'Failed to send newsletter' });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="flex justify-center">
            <Loading />
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <PageLayout>
      <Container className="py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <a
              href="/admin"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin
            </a>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Newsletter Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Send weekly meeting summaries to subscribers
            </p>
          </div>

          {/* Subscriber Stats */}
          {subscriberStats && (
            <Card className="p-6 mb-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Subscriber Overview
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {subscriberStats.total}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Subscribers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {subscriberStats.byLanguage.en}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">🇺🇸 English</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {subscriberStats.byLanguage.es}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">🇪🇸 Spanish</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {subscriberStats.byLanguage.pt}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">🇧🇷 Portuguese</div>
                </div>
              </div>
            </Card>
          )}

          {/* Controls */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Generate Newsletter
            </h2>

            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Include meetings from the last:
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={generatePreview}
                disabled={isGenerating}
                variant="secondary"
              >
                {isGenerating ? 'Generating...' : 'Preview Newsletter'}
              </Button>

              {preview && (
                <Button
                  onClick={sendNewsletter}
                  disabled={isSending}
                  variant="primary"
                >
                  {isSending ? 'Sending...' : 'Send to Subscribers'}
                </Button>
              )}
            </div>

            {/* Result Message */}
            {sendResult && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  sendResult.success
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
                }`}
              >
                {sendResult.message}
              </div>
            )}
          </Card>

          {/* Preview */}
          {preview && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Newsletter Preview
              </h2>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject:</span>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{preview.subject}</p>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Preview Text:</span>
                  <p className="text-gray-700 dark:text-gray-300">{preview.previewText}</p>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Period:</span>
                  <p className="text-gray-700 dark:text-gray-300">
                    {new Date(preview.weekStart).toLocaleDateString()} - {new Date(preview.weekEnd).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Meetings Included:</span>
                  <p className="text-gray-700 dark:text-gray-300">
                    {preview.meetingsCount} ({preview.meetingTypes.join(', ') || 'None'})
                  </p>
                </div>
              </div>

              {/* Meeting List */}
              {preview.meetings.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Included Meetings:
                  </h3>
                  <ul className="space-y-2">
                    {preview.meetings.map((meeting) => (
                      <li
                        key={meeting.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <span className="text-gray-900 dark:text-gray-100">{meeting.title}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* HTML Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Preview (English)
                </div>
                <iframe
                  srcDoc={preview.htmlContent}
                  className="w-full h-[600px] bg-white"
                  title="Newsletter Preview"
                />
              </div>
            </Card>
          )}
        </div>
      </Container>
    </PageLayout>
  );
}
