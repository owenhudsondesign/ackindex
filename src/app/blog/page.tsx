/**
 * Blog Index Page
 * Lists all published blog posts about Nantucket town meetings
 * With search and filtering by date, meeting type, and keywords
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/PageLayout';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  meeting_type: string | null;
  meeting_date: string | null;
  published_at: string;
  keywords: string[];
  thumbnail_url: string | null;
  og_image_url: string | null;
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
        .select('id, title, slug, excerpt, meeting_type, meeting_date, published_at, keywords, thumbnail_url, og_image_url')
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
    <PageLayout>
      <div className="min-h-screen bg-white dark:bg-gray-900 relative">
        {/* Grid Background - Light Mode */}
        <div
          className="absolute inset-0 block dark:hidden pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(200 200 200 / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(200 200 200 / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)
            `,
            backgroundSize: '40px 40px, 40px 40px, 100% 100%',
            backgroundPosition: '0 0, 0 0, center',
            zIndex: 0
          }}
        />
        {/* Grid Background - Dark Mode */}
        <div
          className="absolute inset-0 hidden dark:block pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%)
            `,
            backgroundSize: '40px 40px, 40px 40px, 100% 100%',
            backgroundPosition: '0 0, 0 0, center',
            zIndex: 0
          }}
        />

        <div className="relative z-10">
          {/* Header with Search */}
          <section className="sticky top-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Town Meeting Blog
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Summaries from Nantucket town meetings
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative max-w-2xl mx-auto">
                  <input
                    type="text"
                    placeholder="Search by keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
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
              <div className="flex flex-wrap gap-3 items-center justify-center">
                {/* Meeting Type Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                    Board:
                  </label>
                  <select
                    value={selectedMeetingType}
                    onChange={(e) => setSelectedMeetingType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                  >
                    <option value="all">All Boards</option>
                    {meetingTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                    Year:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                    Sort:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'meeting-date')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
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
                    className="px-3 py-2 text-sm text-ack-blue dark:text-blue-400 hover:text-ack-blue-dark dark:hover:text-blue-300 hover:underline font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Results Count */}
              <div className="text-center mt-3 text-sm text-gray-600 dark:text-gray-400">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                    {hasActiveFilters && posts.length > 0 && ` of ${posts.length} total`}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Blog Posts */}
          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ack-blue dark:border-blue-400"></div>
                <p className="text-gray-600 dark:text-gray-400 text-lg mt-4">
                  Loading blog posts...
                </p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2 mt-4">
                  {posts.length === 0
                    ? 'No blog posts yet'
                    : 'No posts match your filters'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  {posts.length === 0
                    ? 'Check back soon for summaries of Nantucket town meetings'
                    : 'Try adjusting your search or filters'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-ack-blue dark:text-blue-400 hover:text-ack-blue-dark dark:hover:text-blue-300 hover:underline font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => {
                  // Parse date as local timezone to avoid off-by-one day issues
                  // Date strings like "2025-11-17" are interpreted as UTC by new Date()
                  // which can show as the previous day in local timezone
                  const meetingDate = post.meeting_date
                    ? (() => {
                        const [year, month, day] = post.meeting_date.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        });
                      })()
                    : null;

                  // Use existing image or generate dynamic OG image
                  let thumbnailUrl = post.og_image_url || post.thumbnail_url;
                  if (!thumbnailUrl) {
                    const ogParams = new URLSearchParams();
                    ogParams.set('title', post.title);
                    if (post.meeting_date) ogParams.set('date', post.meeting_date);
                    if (post.meeting_type) ogParams.set('type', post.meeting_type);
                    thumbnailUrl = `/api/og?${ogParams.toString()}`;
                  }

                  return (
                    <article
                      key={post.id}
                      className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-xl hover:border-ack-blue dark:hover:border-blue-500/50 transition-all overflow-hidden flex flex-col"
                    >
                      {/* Thumbnail */}
                      <Link
                        href={`/blog/${post.slug}`}
                        className="block w-full h-48 overflow-hidden bg-gray-100 dark:bg-gray-700"
                      >
                        <img
                          src={thumbnailUrl}
                          alt={post.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </Link>

                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col">
                        {/* Meeting Type & Date */}
                        {(post.meeting_type || meetingDate) && (
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {post.meeting_type && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-ack-blue/10 dark:bg-blue-500/20 text-ack-blue dark:text-blue-300">
                                {post.meeting_type}
                              </span>
                            )}
                            {meetingDate && (
                              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {meetingDate}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Title */}
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="hover:text-ack-blue dark:hover:text-blue-400 transition-colors"
                          >
                            {post.title}
                          </Link>
                        </h2>

                        {/* Excerpt */}
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>

                        {/* Read More Link */}
                        <Link
                          href={`/blog/${post.slug}`}
                          className="inline-flex items-center text-sm text-ack-blue dark:text-blue-400 hover:text-ack-blue-dark dark:hover:text-blue-300 hover:underline font-semibold group mt-auto"
                        >
                          Read full summary
                          <svg
                            className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
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
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          {/* Footer CTA */}
          {!loading && filteredPosts.length > 0 && (
            <section className="bg-gradient-to-br from-ack-blue/5 to-blue-100/10 dark:from-blue-900/20 dark:to-gray-800/50 border-t border-gray-200 dark:border-gray-700 mt-16">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Search Full Meeting Transcripts
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                  Dive deeper into any meeting with our AI-powered search. Find specific topics, quotes, and decisions with timestamped results.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-ack-blue hover:bg-ack-blue-dark dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  Search Meetings
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
