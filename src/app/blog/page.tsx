/**
 * Blog Index Page
 * Lists all published blog posts about Nantucket town meetings
 * With search and filtering by date, meeting type, and keywords
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'meeting-date'>('newest');

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, meeting_type, meeting_date, published_at, keywords')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  }

  // Extract unique meeting types and years from posts
  const meetingTypes = useMemo(() => {
    const types = new Set<string>();
    posts.forEach((post) => {
      if (post.meeting_type) types.add(post.meeting_type);
    });
    return Array.from(types).sort();
  }, [posts]);

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    posts.forEach((post) => {
      if (post.meeting_date) {
        const year = new Date(post.meeting_date).getFullYear().toString();
        yearSet.add(year);
      }
    });
    return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [posts]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.keywords.some((kw) => kw.toLowerCase().includes(query))
      );
    }

    // Meeting type filter
    if (selectedMeetingType !== 'all') {
      filtered = filtered.filter((post) => post.meeting_type === selectedMeetingType);
    }

    // Year filter
    if (selectedYear !== 'all') {
      filtered = filtered.filter((post) => {
        if (!post.meeting_date) return false;
        const postYear = new Date(post.meeting_date).getFullYear().toString();
        return postYear === selectedYear;
      });
    }

    // Sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    } else if (sortBy === 'meeting-date') {
      filtered.sort((a, b) => {
        if (!a.meeting_date) return 1;
        if (!b.meeting_date) return -1;
        return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime();
      });
    }

    return filtered;
  }, [posts, searchQuery, selectedMeetingType, selectedYear, sortBy]);

  // Reset filters
  function resetFilters() {
    setSearchQuery('');
    setSelectedMeetingType('all');
    setSelectedYear('all');
    setSortBy('newest');
  }

  const hasActiveFilters = searchQuery || selectedMeetingType !== 'all' || selectedYear !== 'all';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-8">
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

      {/* Search and Filters */}
      <section className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Meeting Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Board:
              </label>
              <select
                value={selectedMeetingType}
                onChange={(e) => setSelectedMeetingType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400"
              >
                <option value="all">All Types</option>
                {meetingTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400"
              >
                <option value="all">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'meeting-date')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="meeting-date">By Meeting Date</option>
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-ack-blue dark:text-blue-400 hover:underline"
              >
                Reset Filters
              </button>
            )}

            {/* Results Count */}
            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                  {hasActiveFilters && ` (of ${posts.length} total)`}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Loading blog posts...
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              {posts.length === 0
                ? 'No blog posts yet. Check back soon for summaries of Nantucket town meetings!'
                : 'No posts match your filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-ack-blue dark:text-blue-400 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPosts.map((post) => {
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
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
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
