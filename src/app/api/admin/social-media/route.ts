/**
 * Social Media Posts Management API
 * GET - List posts with filters
 * POST - Create new post manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/social-media' });

/**
 * GET /api/admin/social-media
 * List social media posts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending_review, approved, published, etc.
    const platform = searchParams.get('platform'); // instagram, facebook
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('social_media_posts')
      .select(`
        *,
        document:documents(id, title, source_url),
        blog_post:blog_posts(id, title, slug)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: posts, error } = await query;

    if (error) {
      log.error({ error }, 'Failed to fetch social media posts');
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts });
  } catch (error) {
    log.error({ error }, 'Social media GET error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/social-media
 * Create a new social media post manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const {
      documentId,
      blogPostId,
      platform,
      content,
      hashtags,
      imageUrl,
      scheduledAt,
    } = body;

    // Validate required fields
    if (!platform || !content) {
      return NextResponse.json(
        { error: 'Platform and content are required' },
        { status: 400 }
      );
    }

    if (!['instagram', 'facebook', 'twitter', 'linkedin'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    // Insert post
    const { data: post, error } = await supabase
      .from('social_media_posts')
      .insert({
        document_id: documentId || null,
        blog_post_id: blogPostId || null,
        platform,
        content,
        hashtags: hashtags || [],
        image_url: imageUrl || null,
        scheduled_at: scheduledAt || null,
        status: 'draft',
        created_by: adminOrError.id,
      })
      .select()
      .single();

    if (error) {
      log.error({ error }, 'Failed to create social media post');
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    log.info({ postId: post.id, platform }, 'Social media post created');

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    log.error({ error }, 'Social media POST error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
