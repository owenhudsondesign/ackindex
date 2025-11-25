/**
 * Admin Blog Dashboard
 * Manage blog posts created from meeting transcriptions
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

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
                  const meetingDate = post.meeting_date
                    ? new Date(post.meeting_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : null;

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
