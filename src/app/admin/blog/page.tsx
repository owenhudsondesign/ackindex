/**
 * Admin Blog Dashboard
 * Manage blog posts created from meeting transcriptions
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

interface SocialPosts {
  facebook?: {
    text: string;
    hashtags: string[];
  };
  instagram?: {
    caption: string;
    hashtags: string[];
  };
  generated_at?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  meeting_type: string | null;
  meeting_date: string | null;
  thumbnail_url: string | null;
  keywords: string[];
  created_at: string;
  published_at: string | null;
  social_posts: SocialPosts | null;
  document: {
    id: string;
    title: string;
    source_url: string;
    created_at: string;
  } | null;
}

export default function AdminBlogDashboard() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('draft');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Helper to copy text and show feedback
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format social post with hashtags
  const formatWithHashtags = (text: string, hashtags: string[]) => {
    const hashtagString = hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ');
    return `${text}\n\n${hashtagString}`;
  };

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);

      const response = await fetch(`/api/admin/blog?${params}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function publishPost(postId: string) {
    if (!confirm('Publish this blog post? It will be visible at /blog')) return;

    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedPost(null);
        alert('Blog post published!');
      }
    } catch (error) {
      console.error('Failed to publish post:', error);
      alert('Failed to publish post');
    }
  }

  async function unpublishPost(postId: string) {
    if (!confirm('Unpublish this post? It will be hidden from /blog')) return;

    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Failed to unpublish post:', error);
      alert('Failed to unpublish post');
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this blog post? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  }

  // Batch selection handlers
  const toggleSelect = (postId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedIds(newSelected);
  };

  const selectAllDrafts = () => {
    const draftPosts = posts.filter(p => p.status === 'draft');
    setSelectedIds(new Set(draftPosts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  async function batchPublishPosts() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Publish ${selectedIds.size} blog post(s)?`)) return;

    setBatchActionLoading(true);
    try {
      const response = await fetch('/api/admin/blog/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postIds: Array.from(selectedIds),
          action: 'publish',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSelectedIds(new Set());
      await fetchPosts();
      alert(`${data.published || selectedIds.size} post(s) published!`);
    } catch (error) {
      console.error('Batch publish error:', error);
      alert('Failed to publish posts');
    } finally {
      setBatchActionLoading(false);
    }
  }

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Back to Admin Button */}
            <Link
              href="/admin"
              className="inline-flex items-center text-sm text-ack-blue dark:text-blue-400 hover:underline mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Panel
            </Link>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Blog Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage auto-generated blog posts from meeting transcriptions
                </p>
              </div>
              <Link
                href="/blog"
                target="_blank"
                className="px-4 py-2 bg-ack-blue hover:bg-ack-blue-dark text-white rounded-lg font-medium"
              >
                View Public Blog →
              </Link>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Filter by Status</h2>
              <div className="space-y-2">
                {[
                  { value: 'draft' as const, label: '📝 Drafts', icon: '📝' },
                  { value: 'published' as const, label: '✅ Published', icon: '✅' },
                  { value: 'all' as const, label: '📚 All Posts', icon: '📚' },
                ].map((filterOption) => (
                  <button
                    key={filterOption.value}
                    onClick={() => setFilter(filterOption.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      filter === filterOption.value
                        ? 'bg-ack-blue text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {filterOption.label}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total posts: <span className="font-semibold">{posts.length}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Main Content - Posts List */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">Loading blog posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400 mb-2">No blog posts found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Blog posts are auto-generated after each meeting is transcribed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Batch Actions Bar for Drafts */}
                {filter === 'draft' && posts.filter(p => p.status === 'draft').length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === posts.filter(p => p.status === 'draft').length && selectedIds.size > 0}
                        onChange={(e) => e.target.checked ? selectAllDrafts() : deselectAll()}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all drafts'}
                      </span>
                    </div>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={batchPublishPosts}
                        disabled={batchActionLoading}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                      >
                        {batchActionLoading ? 'Publishing...' : `Publish ${selectedIds.size}`}
                      </button>
                    )}
                  </div>
                )}

                {posts.map((post) => {
                  // Parse YYYY-MM-DD without timezone conversion
                  let meetingDate: string | null = null;
                  if (post.meeting_date) {
                    const dateStr = post.meeting_date;
                    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      meetingDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      });
                    } else {
                      meetingDate = new Date(dateStr).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      });
                    }
                  }

                  return (
                    <div
                      key={post.id}
                      className={`bg-white dark:bg-gray-800 rounded-lg border p-5 transition-colors cursor-pointer ${
                        selectedIds.has(post.id)
                          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-ack-blue dark:hover:border-blue-400'
                      }`}
                      onClick={() => setSelectedPost(post)}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {filter === 'draft' && post.status === 'draft' && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(post.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(post.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[post.status]}`}>
                            {post.status}
                          </span>
                          {post.meeting_type && (
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {post.meeting_type}
                            </span>
                          )}
                          {meetingDate && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              📅 {meetingDate}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>

                      {/* Keywords */}
                      {post.keywords && post.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.keywords.slice(0, 5).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                          {post.keywords.length > 5 && (
                            <span className="text-xs text-gray-500">
                              +{post.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Source Meeting */}
                      {post.document && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          📹 Generated from: {post.document.title}
                        </p>
                      )}

                      {/* Quick Actions */}
                      <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg"
                        >
                          ✏️ Edit
                        </Link>
                        {post.status === 'draft' && (
                          <button
                            onClick={() => publishPost(post.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                          >
                            ✅ Publish
                          </button>
                        )}
                        {post.status === 'published' && (
                          <>
                            <Link
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                            >
                              👁️ View Live
                            </Link>
                            <button
                              onClick={() => unpublishPost(post.id)}
                              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg"
                            >
                              📝 Unpublish
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deletePost(post.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white pr-8">
                  {selectedPost.title}
                </h2>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Status and Meta */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedPost.status]}`}>
                  {selectedPost.status}
                </span>
                {selectedPost.meeting_type && (
                  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {selectedPost.meeting_type}
                  </span>
                )}
              </div>

              {/* Thumbnail */}
              {selectedPost.thumbnail_url && (
                <img
                  src={selectedPost.thumbnail_url}
                  alt={selectedPost.title}
                  className="w-full rounded-lg mb-6"
                />
              )}

              {/* Excerpt */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Excerpt (Meta Description):</h3>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  {selectedPost.excerpt}
                </p>
              </div>

              {/* Full Content */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Full Content:</h3>
                <div className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                    {selectedPost.content}
                  </pre>
                </div>
              </div>

              {/* Keywords */}
              {selectedPost.keywords && selectedPost.keywords.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">SEO Keywords:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Meeting */}
              {selectedPost.document && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Source Meeting:</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{selectedPost.document.title}</p>
                  {selectedPost.document.source_url && (
                    <a
                      href={selectedPost.document.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ack-blue hover:underline text-sm"
                    >
                      Watch video →
                    </a>
                  )}
                </div>
              )}

              {/* Social Media Posts */}
              {selectedPost.social_posts && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span>📱 Social Media Posts</span>
                    {selectedPost.social_posts.generated_at && (
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        Generated {new Date(selectedPost.social_posts.generated_at).toLocaleDateString()}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Facebook Post */}
                    {selectedPost.social_posts.facebook && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Facebook
                          </span>
                          <button
                            onClick={() => copyToClipboard(
                              formatWithHashtags(selectedPost.social_posts!.facebook!.text, selectedPost.social_posts!.facebook!.hashtags),
                              'facebook'
                            )}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              copiedField === 'facebook'
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {copiedField === 'facebook' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {selectedPost.social_posts.facebook.text}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedPost.social_posts.facebook.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                              #{tag.replace(/^#/, '')}
                            </span>
                          ))}
                        </div>
                        {selectedPost.thumbnail_url && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                            <span>🖼️</span> Image: {selectedPost.thumbnail_url.split('/').pop()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Instagram Post */}
                    {selectedPost.social_posts.instagram && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-purple-800 dark:text-purple-300 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            Instagram
                          </span>
                          <button
                            onClick={() => copyToClipboard(
                              formatWithHashtags(selectedPost.social_posts!.instagram!.caption, selectedPost.social_posts!.instagram!.hashtags),
                              'instagram'
                            )}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              copiedField === 'instagram'
                                ? 'bg-green-600 text-white'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                          >
                            {copiedField === 'instagram' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {selectedPost.social_posts.instagram.caption}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedPost.social_posts.instagram.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-purple-600 dark:text-purple-400">
                              #{tag.replace(/^#/, '')}
                            </span>
                          ))}
                        </div>
                        {selectedPost.thumbnail_url && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                            <span>🖼️</span> Image: {selectedPost.thumbnail_url.split('/').pop()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No social posts yet message for published posts */}
              {selectedPost.status === 'published' && !selectedPost.social_posts && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📱 Social media posts will be generated when the blog is published.
                    This post was published before social post generation was added.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Link
                  href={`/admin/blog/${selectedPost.id}/edit`}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-center"
                >
                  ✏️ Edit Post
                </Link>
                {selectedPost.status === 'draft' && (
                  <button
                    onClick={() => publishPost(selectedPost.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    ✅ Publish Now
                  </button>
                )}
                {selectedPost.status === 'published' && (
                  <>
                    <Link
                      href={`/blog/${selectedPost.slug}`}
                      target="_blank"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-center"
                    >
                      👁️ View Published Post
                    </Link>
                    <button
                      onClick={() => unpublishPost(selectedPost.id)}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      📝 Unpublish
                    </button>
                  </>
                )}
                <button
                  onClick={() => deletePost(selectedPost.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  );
}
