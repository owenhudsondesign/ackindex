/**
 * Individual Blog Post Management
 * GET - Get single post
 * PATCH - Update post (edit content, publish, etc.)
 * DELETE - Delete post
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { generateSocialMediaPosts } from '@/lib/socialMediaGenerator';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/blog/[id]' });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        document:documents(id, title, source_url, thumbnail_url, created_at)
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    log.error({ error }, 'Failed to fetch blog post');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const {
      title,
      content,
      excerpt,
      keywords,
      status,
      thumbnail_url,
      og_image_url,
      published_at,
    } = body;

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (keywords !== undefined) updates.keywords = keywords;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
    if (og_image_url !== undefined) updates.og_image_url = og_image_url;
    if (status !== undefined) {
      updates.status = status;
      // Set published_at when publishing (or use provided value)
      if (status === 'published') {
        updates.published_at = published_at || new Date().toISOString();
      } else if (published_at !== undefined) {
        updates.published_at = published_at;
      }
    }

    // Generate social media posts when publishing
    let socialPosts = null;
    if (status === 'published') {
      try {
        // Fetch current post data for social generation
        const { data: currentPost } = await supabase
          .from('blog_posts')
          .select('id, title, excerpt, content, slug, meeting_type, meeting_date, thumbnail_url, keywords')
          .eq('id', id)
          .single();

        if (currentPost) {
          // Use updated values if provided, otherwise use current values
          const postData = {
            id: currentPost.id,
            title: title || currentPost.title,
            excerpt: excerpt || currentPost.excerpt,
            content: content || currentPost.content,
            slug: currentPost.slug,
            meeting_type: currentPost.meeting_type,
            meeting_date: currentPost.meeting_date,
            thumbnail_url: thumbnail_url || currentPost.thumbnail_url,
            keywords: keywords || currentPost.keywords,
          };

          socialPosts = await generateSocialMediaPosts(postData);
          updates.social_posts = {
            ...socialPosts,
            generated_at: new Date().toISOString(),
          };
          log.info({ postId: id }, 'Generated social media posts on publish');
        }
      } catch (socialError) {
        log.warn({ error: socialError, postId: id }, 'Failed to generate social media posts, continuing with publish');
        // Don't block publishing if social generation fails
      }
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error({ error, id }, 'Failed to update blog post');
      return NextResponse.json(
        { error: 'Failed to update blog post' },
        { status: 500 }
      );
    }

    log.info({ postId: id, updates }, 'Blog post updated');
    return NextResponse.json({ post, socialPosts });
  } catch (error) {
    log.error({ error }, 'Failed to update blog post');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      log.error({ error, id }, 'Failed to delete blog post');
      return NextResponse.json(
        { error: 'Failed to delete blog post' },
        { status: 500 }
      );
    }

    log.info({ postId: id }, 'Blog post deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, 'Failed to delete blog post');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
