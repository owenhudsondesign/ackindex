'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAdminUser } from '@/lib/adminAuth';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import Card from '@/components/Card';
import Loading from '@/components/Loading';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  thumbnail_url: string | null;
  og_image_url: string | null;
  meeting_type: string | null;
  meeting_date: string | null;
  keywords: string[];
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditBlogPost({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');

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

        setUser(adminUser);
        await loadBlogPost();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router, resolvedParams.id]);

  const loadBlogPost = async () => {
    try {
      const response = await fetch(`/api/admin/blog/${resolvedParams.id}`);
      if (!response.ok) {
        throw new Error('Failed to load blog post');
      }
      const data = await response.json();
      setBlogPost(data);
      setImageUrl(data.thumbnail_url || data.og_image_url || '');
      setCustomImageUrl('');
    } catch (err) {
      console.error('Error loading blog post:', err);
      setError('Failed to load blog post');
    }
  };

  const handleSave = async () => {
    if (!blogPost) return;

    setIsSaving(true);
    setError(null);

    try {
      // Use custom image if provided, otherwise use existing
      const finalImageUrl = customImageUrl.trim() || imageUrl;

      const response = await fetch(`/api/admin/blog/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thumbnail_url: finalImageUrl,
          og_image_url: finalImageUrl, // Use same image for OpenGraph
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update blog post');
      }

      // Reload to get updated data
      await loadBlogPost();
      alert('Blog post updated successfully!');
    } catch (err) {
      console.error('Error saving blog post:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!blogPost) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/blog/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: blogPost.status === 'published' ? 'draft' : 'published',
          published_at: blogPost.status === 'published' ? null : new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update blog post status');
      }

      await loadBlogPost();
      alert(`Blog post ${blogPost.status === 'published' ? 'unpublished' : 'published'} successfully!`);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="max-w-4xl mx-auto flex justify-center">
            <Loading />
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (error && !blogPost) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => router.push('/admin/blog')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Blog Manager
              </button>
            </Card>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (!blogPost) return null;

  return (
    <PageLayout>
      <Container className="py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin/blog')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog Manager
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Edit Blog Post
            </h1>
            <p className="text-gray-700 dark:text-gray-300">
              Customize the blog post image and settings
            </p>
          </div>

          {error && (
            <Card className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          {/* Blog Post Info */}
          <Card className="p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {blogPost.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className={`px-2 py-1 rounded ${
                  blogPost.status === 'published'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                }`}>
                  {blogPost.status}
                </span>
                {blogPost.meeting_type && (
                  <span>{blogPost.meeting_type}</span>
                )}
                {blogPost.meeting_date && (
                  <span>{new Date(blogPost.meeting_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {blogPost.excerpt}
            </p>
            <a
              href={`/blog/${blogPost.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View published post →
            </a>
          </Card>

          {/* Featured Image Editor */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Featured Image
            </h2>

            {/* Current Image Preview */}
            {imageUrl && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Image:
                </p>
                <img
                  src={imageUrl}
                  alt={blogPost.title}
                  className="w-full max-w-2xl rounded-lg border border-gray-300 dark:border-gray-700"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect width="400" height="225" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="18"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {imageUrl}
                </p>
              </div>
            )}

            {/* Custom Image URL Input */}
            <div className="mb-6">
              <label
                htmlFor="custom-image-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Custom Image URL (Optional)
              </label>
              <input
                id="custom-image-url"
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter a custom image URL to replace the thumbnail. YouTube thumbnails are typically at: https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
              </p>
            </div>

            {/* Preview Custom Image */}
            {customImageUrl && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview:
                </p>
                <img
                  src={customImageUrl}
                  alt="Preview"
                  className="w-full max-w-2xl rounded-lg border border-gray-300 dark:border-gray-700"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect width="400" height="225" fill="%23fee"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23c33" font-family="sans-serif" font-size="14"%3EInvalid image URL%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handlePublish}
                disabled={isSaving}
                className={`px-6 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  blogPost.status === 'published'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isSaving ? 'Updating...' : blogPost.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </Card>
        </div>
      </Container>
    </PageLayout>
  );
}
