/**
 * Individual Blog Post Page
 * Displays a single blog post about a Nantucket town meeting
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReactMarkdown from 'react-markdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meeting_type: string | null;
  meeting_date: string | null;
  published_at: string;
  keywords: string[];
  document_id: string;
}

interface Document {
  id: string;
  title: string;
  source_url: string;
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, keywords, meeting_type, meeting_date')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!post) {
    return {
      title: 'Blog Post Not Found | AckIndex',
    };
  }

  const meetingDate = post.meeting_date
    ? new Date(post.meeting_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return {
    title: `${post.title} | AckIndex`,
    description: post.excerpt,
    keywords: post.keywords || [],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: meetingDate,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch blog post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    notFound();
  }

  const blogPost = post as BlogPost;

  // Fetch associated document for source link
  const { data: document } = await supabase
    .from('documents')
    .select('id, title, source_url')
    .eq('id', blogPost.document_id)
    .single();

  const sourceDoc = document as Document | null;

  const meetingDate = blogPost.meeting_date
    ? new Date(blogPost.meeting_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const publishedDate = new Date(blogPost.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href="/blog"
            className="text-sm text-ack-blue dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Blog
          </Link>

          {/* Meeting Type & Date */}
          {(blogPost.meeting_type || meetingDate) && (
            <div className="flex items-center gap-3 mb-4">
              {blogPost.meeting_type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-ack-blue/10 dark:bg-blue-900/30 text-ack-blue dark:text-blue-300">
                  {blogPost.meeting_type}
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            {blogPost.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            {blogPost.excerpt}
          </p>

          {/* Published Date */}
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Published {publishedDate}
          </div>
        </div>
      </header>

      {/* Blog Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <article className="prose prose-lg dark:prose-invert prose-ack-blue max-w-none">
          <ReactMarkdown
            components={{
              // Customize markdown rendering
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-5 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-ack-blue dark:border-blue-400 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-white">
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-ack-blue dark:text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {blogPost.content}
          </ReactMarkdown>
        </article>

        {/* Source Document Link */}
        {sourceDoc && sourceDoc.source_url && (
          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Watch the Full Meeting
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              View the complete meeting video and transcript on AckIndex
            </p>
            <a
              href={sourceDoc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-ack-blue hover:bg-ack-blue-dark text-white font-medium rounded-lg transition-colors"
            >
              Watch on YouTube
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

        {/* CTA to Search */}
        <div className="mt-12 p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Search All Nantucket Town Meetings
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Ask questions and get timestamped answers from meeting transcripts
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-ack-blue hover:bg-ack-blue-dark text-white font-semibold rounded-lg transition-colors"
          >
            Start Searching
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

        {/* Keywords (for SEO, hidden visually) */}
        {blogPost.keywords && blogPost.keywords.length > 0 && (
          <div className="sr-only">
            Keywords: {blogPost.keywords.join(', ')}
          </div>
        )}
      </main>
    </div>
  );
}
