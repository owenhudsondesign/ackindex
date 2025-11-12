/**
 * Social Media Dashboard
 * Review, approve, and publish social media posts
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SocialMediaPost {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
  content: string;
  hashtags: string[];
  image_url: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'rejected';
  scheduled_at: string | null;
  published_at: string | null;
  platform_permalink: string | null;
  created_at: string;
  document: {
    id: string;
    title: string;
    source_url: string;
  } | null;
  blog_post: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export default function SocialMediaDashboard() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending_review');
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter && filter !== 'all') params.set('status', filter);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/social-media?${params}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePostStatus(postId: string, status: string, rejectionReason?: string) {
    try {
      const response = await fetch(`/api/admin/social-media/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(rejectionReason && { metadata: { rejection_reason: rejectionReason } }),
        }),
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    }
  }

  async function publishPost(postId: string) {
    if (!confirm('Are you sure you want to publish this post? It will go live immediately.')) {
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(`/api/admin/social-media/${postId}/publish`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Post published successfully!${data.permalink ? `\n\nView at: ${data.permalink}` : ''}`);
        await fetchPosts();
        setSelectedPost(null);
      } else {
        alert(`Publishing failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      alert('Publishing failed');
    } finally {
      setPublishing(false);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/social-media/${postId}`, {
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

  const platformEmoji = {
    instagram: '📸',
    facebook: '👥',
    twitter: '🐦',
    linkedin: '💼',
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    published: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Social Media Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Review and publish auto-generated social media posts
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Filter by Status</h2>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Posts', count: posts.length },
                  { value: 'pending_review', label: '⏳ Pending Review' },
                  { value: 'approved', label: '✅ Approved' },
                  { value: 'published', label: '🚀 Published' },
                  { value: 'failed', label: '❌ Failed' },
                  { value: 'rejected', label: '🚫 Rejected' },
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
            </div>
          </div>

          {/* Main Content - Posts List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No posts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-ack-blue dark:hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  >
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{platformEmoji[post.platform]}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white capitalize">
                            {post.platform}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[post.status]}`}>
                        {post.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Post Content Preview */}
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2 mb-2">
                      {post.content}
                    </p>

                    {/* Hashtags Preview */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.hashtags.slice(0, 5).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.hashtags.length > 5 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{post.hashtags.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Related Content */}
                    {post.document && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        📹 {post.document.title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal content - we'll add this next */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {platformEmoji[selectedPost.platform]} {selectedPost.platform} Post
                </h2>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedPost.status]}`}>
                  {selectedPost.status.replace('_', ' ')}
                </span>
              </div>

              {/* Image Preview */}
              {selectedPost.image_url && (
                <img
                  src={selectedPost.image_url}
                  alt="Post preview"
                  className="w-full rounded-lg mb-4"
                />
              )}

              {/* Content */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Content:</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedPost.content}
                </p>
              </div>

              {/* Hashtags */}
              {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Hashtags:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Content */}
              {selectedPost.document && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Related Meeting:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPost.document.title}</p>
                  {selectedPost.document.source_url && (
                    <a
                      href={selectedPost.document.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ack-blue hover:underline"
                    >
                      View video →
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                {selectedPost.status === 'pending_review' && (
                  <>
                    <button
                      onClick={() => updatePostStatus(selectedPost.id, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):');
                        updatePostStatus(selectedPost.id, 'rejected', reason || undefined);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      ❌ Reject
                    </button>
                  </>
                )}

                {selectedPost.status === 'approved' && (
                  <button
                    onClick={() => publishPost(selectedPost.id)}
                    disabled={publishing}
                    className="flex-1 bg-ack-blue hover:bg-ack-blue-dark text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {publishing ? 'Publishing...' : '🚀 Publish Now'}
                  </button>
                )}

                {selectedPost.status === 'published' && selectedPost.platform_permalink && (
                  <a
                    href={selectedPost.platform_permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-center"
                  >
                    🔗 View Published Post
                  </a>
                )}

                <button
                  onClick={() => deletePost(selectedPost.id)}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
