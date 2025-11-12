/**
 * Individual Social Media Post Management
 * GET - Get single post
 * PATCH - Update post
 * DELETE - Delete post
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/social-media/[id]' });

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/social-media/[id]
 * Get a single social media post
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const { data: post, error } = await supabase
      .from('social_media_posts')
      .select(`
        *,
        document:documents(id, title, source_url, thumbnail_url),
        blog_post:blog_posts(id, title, slug)
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    log.error({ error }, 'Failed to fetch post');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/social-media/[id]
 * Update a post (edit content, change status, etc.)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const {
      content,
      hashtags,
      imageUrl,
      scheduledAt,
      status,
    } = body;

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updates.content = content;
    if (hashtags !== undefined) updates.hashtags = hashtags;
    if (imageUrl !== undefined) updates.image_url = imageUrl;
    if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt;
    if (status !== undefined) {
      updates.status = status;

      // Track reviewer when status changes to approved/rejected
      if (status === 'approved' || status === 'rejected') {
        updates.reviewed_by = adminOrError.id;
        updates.reviewed_at = new Date().toISOString();
      }
    }

    const { data: post, error } = await supabase
      .from('social_media_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error({ error, id }, 'Failed to update post');
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      );
    }

    log.info({ postId: id, updates }, 'Post updated');

    return NextResponse.json({ post });
  } catch (error) {
    log.error({ error }, 'Failed to update post');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/social-media/[id]
 * Delete a post
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const { error } = await supabase
      .from('social_media_posts')
      .delete()
      .eq('id', id);

    if (error) {
      log.error({ error, id }, 'Failed to delete post');
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      );
    }

    log.info({ postId: id }, 'Post deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, 'Failed to delete post');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
