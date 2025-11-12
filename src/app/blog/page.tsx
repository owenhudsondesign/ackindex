/**
 * Blog Index Page
 * Lists all published blog posts about Nantucket town meetings
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Nantucket Town Meeting Blog | AckIndex',
  description: 'Read summaries and highlights from Nantucket Select Board meetings, Town Council meetings, Planning Board meetings, and public hearings.',
  keywords: [
    'Nantucket town meeting blog',
    'Nantucket Select Board news',
    'Nantucket local government updates',
    'Planning Board Nantucket',
    'Town Council Nantucket',
  ],
  openGraph: {
    title: 'Nantucket Town Meeting Blog | AckIndex',
    description: 'Read summaries and highlights from Nantucket town meetings',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  meeting_type: string | null;
  meeting_date: string | null;
  published_at: string;
  keywords: string[];
}

export default async function BlogIndexPage() {
  const supabase = await createClient();

  // Fetch all published blog posts, ordered by publish date (newest first)
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, meeting_type, meeting_date, published_at, keywords')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching blog posts:', error);
  }

  const blogPosts = (posts || []) as BlogPost[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/"
            className="text-sm text-ack-blue dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Search
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Nantucket Town Meeting Blog
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Summaries and highlights from Select Board meetings, Town Council meetings, Planning Board meetings, and more.
          </p>
        </div>
      </header>

      {/* Blog Posts */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {blogPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No blog posts yet. Check back soon for summaries of Nantucket town meetings!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {blogPosts.map((post) => {
              const meetingDate = post.meeting_date
                ? new Date(post.meeting_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : null;

              return (
                <article
                  key={post.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-ack-blue dark:hover:border-blue-400 transition-colors"
                >
                  {/* Meeting Type & Date */}
                  {(post.meeting_type || meetingDate) && (
                    <div className="flex items-center gap-3 mb-3">
                      {post.meeting_type && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-ack-blue/10 dark:bg-blue-900/30 text-ack-blue dark:text-blue-300">
                          {post.meeting_type}
                        </span>
                      )}
                      {meetingDate && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {meetingDate}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 hover:text-ack-blue dark:hover:text-blue-400 transition-colors">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  {/* Excerpt */}
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Read More Link */}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-ack-blue dark:text-blue-400 hover:underline font-medium"
                  >
                    Read full summary
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <section className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Search All Nantucket Town Meetings
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Want to dive deeper? Search through full meeting transcripts with timestamps.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-ack-blue hover:bg-ack-blue-dark text-white font-semibold rounded-lg transition-colors"
          >
            Go to Search
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
