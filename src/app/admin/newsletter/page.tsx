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
  plainTextContent?: string;
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

interface QueuedNewsletter {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  meetings_count: number;
  week_start: string | null;
  week_end: string | null;
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

  // Editable content state
  const [editedSubject, setEditedSubject] = useState('');
  const [editedPreviewText, setEditedPreviewText] = useState('');
  const [editedHtmlContent, setEditedHtmlContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);

  // Queue state
  const [queue, setQueue] = useState<QueuedNewsletter[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        fetchQueue();
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

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const response = await fetch('/api/admin/newsletter/queue');
      if (response.ok) {
        const data = await response.json();
        setQueue(data.newsletters || []);
      }
    } catch (error) {
      console.error('Failed to fetch newsletter queue:', error);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const deleteNewsletter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this newsletter?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/newsletter/queue?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setQueue(queue.filter(n => n.id !== id));
      } else {
        alert('Failed to delete newsletter');
      }
    } catch (error) {
      console.error('Failed to delete newsletter:', error);
      alert('Failed to delete newsletter');
    } finally {
      setDeletingId(null);
    }
  };

  const generatePreview = async () => {
    setIsGenerating(true);
    setSendResult(null);
    setIsEditing(false);
    setShowHtmlEditor(false);
    try {
      const response = await fetch(`/api/admin/newsletter?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
        // Initialize editable state with generated content
        setEditedSubject(data.subject || '');
        setEditedPreviewText(data.previewText || '');
        setEditedHtmlContent(data.htmlContent || '');
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
      // Check if content was edited
      const hasEdits = preview && (
        editedSubject !== preview.subject ||
        editedPreviewText !== preview.previewText ||
        editedHtmlContent !== preview.htmlContent
      );

      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days,
          // Only send custom content if edits were made
          customContent: hasEdits ? {
            subject: editedSubject,
            previewText: editedPreviewText,
            htmlContent: editedHtmlContent,
          } : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({
          success: true,
          message: data.message || `Newsletter sent successfully! ${data.meetingsCount} meetings included.${hasEdits ? ' (with your edits)' : ''}`,
        });
        setPreview(null);
        setIsEditing(false);
        setShowHtmlEditor(false);
        fetchQueue(); // Refresh queue to show the sent newsletter
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

          {/* Newsletter Queue */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Newsletter Queue
              </h2>
              <button
                onClick={fetchQueue}
                disabled={isLoadingQueue}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {isLoadingQueue ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {queue.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No newsletters in queue. Generate one below.
              </p>
            ) : (
              <div className="space-y-3">
                {queue.map((newsletter) => (
                  <div
                    key={newsletter.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      newsletter.status === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                        : newsletter.status === 'sent'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            newsletter.status === 'pending'
                              ? 'bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100'
                              : newsletter.status === 'sent'
                              ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {newsletter.status}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(newsletter.created_at).toLocaleDateString()} {new Date(newsletter.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mt-1">
                        {newsletter.subject}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {newsletter.meetings_count} meeting{newsletter.meetings_count !== 1 ? 's' : ''}
                        {newsletter.processed_at && ` • Sent ${new Date(newsletter.processed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNewsletter(newsletter.id)}
                      disabled={deletingId === newsletter.id}
                      className="ml-4 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete newsletter"
                    >
                      {deletingId === newsletter.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Newsletter Preview
                </h2>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant="secondary"
                  className="text-sm"
                >
                  {isEditing ? 'View Mode' : 'Edit Mode'}
                </Button>
              </div>

              {/* Editable Subject & Preview Text */}
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Subject:
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{editedSubject}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Preview Text:
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedPreviewText}
                      onChange={(e) => setEditedPreviewText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300">{editedPreviewText}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
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

              {/* HTML Editor / Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Content (English)
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => setShowHtmlEditor(!showHtmlEditor)}
                      className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                    >
                      {showHtmlEditor ? 'Show Preview' : 'Edit HTML'}
                    </button>
                  )}
                </div>
                {isEditing && showHtmlEditor ? (
                  <textarea
                    value={editedHtmlContent}
                    onChange={(e) => setEditedHtmlContent(e.target.value)}
                    className="w-full h-[600px] p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none"
                    spellCheck={false}
                  />
                ) : (
                  <iframe
                    srcDoc={editedHtmlContent}
                    className="w-full h-[600px] bg-white"
                    title="Newsletter Preview"
                  />
                )}
              </div>

              {/* Reset button when editing */}
              {isEditing && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setEditedSubject(preview.subject);
                      setEditedPreviewText(preview.previewText);
                      setEditedHtmlContent(preview.htmlContent);
                    }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Reset to Original
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </Container>
    </PageLayout>
  );
}
