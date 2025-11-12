/**
 * Individual Blog Post Page
 * Displays a single blog post about a Nantucket town meeting
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReactMarkdown from 'react-markdown';
import TranscriptSection from '@/components/TranscriptSection';
import PageLayout from '@/components/PageLayout';

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
  thumbnail_url: string | null;
  og_image_url: string | null;
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
    .select('title, excerpt, keywords, meeting_type, meeting_date, thumbnail_url, og_image_url')
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

  const imageUrl = post.og_image_url || post.thumbnail_url;

  return {
    title: `${post.title} | AckIndex`,
    description: post.excerpt,
    keywords: post.keywords || [],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: meetingDate,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: imageUrl ? [imageUrl] : undefined,
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

  const featuredImage = blogPost.og_image_url || blogPost.thumbnail_url;

  return (
    <PageLayout>
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

      {/* Featured Image - Hero */}
      {featuredImage && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          {sourceDoc?.source_url ? (
            <a
              href={sourceDoc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group overflow-hidden rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300"
            >
              <img
                src={featuredImage}
                alt={blogPost.title}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-6 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                  <svg
                    className="w-12 h-12 text-ack-blue dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {/* Watch Video Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center gap-2 text-white">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-semibold">Watch Full Meeting Video</span>
                </div>
              </div>
            </a>
          ) : (
            <div className="overflow-hidden rounded-xl shadow-2xl">
              <img
                src={featuredImage}
                alt={blogPost.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}
        </div>
      )}

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

        {/* Full Transcript Section */}
        {sourceDoc && (
          <TranscriptSection documentId={blogPost.document_id} sourceUrl={sourceDoc.source_url} />
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
    </PageLayout>
  );
}
