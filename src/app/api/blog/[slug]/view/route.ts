/**
 * Blog View Tracking API
 * POST /api/blog/[slug]/view - Increment view count for a blog post
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const log = logger.child({ endpoint: '/api/blog/[slug]/view', slug });

  try {
    // Get the blog post ID from slug
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('blog_posts')
      .select('id, view_count')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (fetchError || !post) {
      log.warn({ fetchError }, 'Blog post not found for view tracking');
      return NextResponse.json({ success: false }, { status: 404 });
    }

    // Increment view count
    const newViewCount = (post.view_count || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update({ view_count: newViewCount })
      .eq('id', post.id);

    if (updateError) {
      log.error({ updateError }, 'Failed to increment view count');
      return NextResponse.json({ success: false }, { status: 500 });
    }

    log.debug({ blogId: post.id, newViewCount }, 'View count incremented');

    return NextResponse.json({ success: true, viewCount: newViewCount });
  } catch (error) {
    log.error({ err: error }, 'View tracking error');
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
