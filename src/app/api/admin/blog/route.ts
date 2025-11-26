/**
 * Admin Blog API
 * GET - List all blog posts (drafts and published)
 * POST - Generate a blog post for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { createBlogPostForDocument } from '@/lib/blogGenerator';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/blog' });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'draft' or 'published'
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        document:documents(id, title, source_url, created_at)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;

    if (error) {
      log.error({ error }, 'Failed to fetch blog posts');
      return NextResponse.json(
        { error: 'Failed to fetch blog posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts });
  } catch (error) {
    log.error({ error }, 'Blog GET error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate a blog post for a document
 * Body: { documentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    log.info({ documentId }, 'Generating blog post for document');

    // Check document status first for better error messages
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Document not found: ${documentId}` },
        { status: 404 }
      );
    }

    if (document.status !== 'completed') {
      return NextResponse.json(
        { error: `Document status is "${document.status}", must be "completed" to generate blog post` },
        { status: 400 }
      );
    }

    // Check if blog post already exists
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id, title')
      .eq('document_id', documentId)
      .single();

    if (existingPost) {
      return NextResponse.json(
        { error: `Blog post already exists for this document: "${existingPost.title}"`, existingPostId: existingPost.id },
        { status: 400 }
      );
    }

    const blogPostId = await createBlogPostForDocument(documentId);

    if (!blogPostId) {
      return NextResponse.json(
        { error: 'Failed to generate blog post. Check server logs for details.' },
        { status: 500 }
      );
    }

    // Fetch the created blog post
    const { data: blogPost, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', blogPostId)
      .single();

    if (error) {
      log.error({ error }, 'Failed to fetch created blog post');
      return NextResponse.json(
        { error: 'Blog post created but failed to fetch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ blogPost, message: 'Blog post generated successfully!' });
  } catch (error) {
    log.error({ error }, 'Blog POST error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
