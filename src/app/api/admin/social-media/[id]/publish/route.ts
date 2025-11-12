/**
 * Publish Social Media Post
 * POST - Publish an approved post to Instagram/Facebook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/social-media/[id]/publish' });

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Publish post to Instagram
 */
async function publishToInstagram(
  postId: string,
  content: string,
  imageUrl: string,
  hashtags: string[]
): Promise<{ success: boolean; platformPostId?: string; permalink?: string; error?: string }> {
  const accessToken = process.env.META_INSTAGRAM_ACCESS_TOKEN;
  const instagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;

  if (!accessToken || !instagramAccountId) {
    return {
      success: false,
      error: 'Instagram credentials not configured. Set META_INSTAGRAM_ACCESS_TOKEN and META_INSTAGRAM_ACCOUNT_ID',
    };
  }

  try {
    // Format caption with hashtags
    const caption = content + '\n\n' + hashtags.map(h => `#${h}`).join(' ');

    // Step 1: Create media container
    const createResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Instagram media creation failed: ${JSON.stringify(error)}`);
    }

    const { id: creationId } = await createResponse.json();

    // Step 2: Publish the media
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Instagram publish failed: ${JSON.stringify(error)}`);
    }

    const { id: platformPostId } = await publishResponse.json();

    // Get permalink
    const permalinkResponse = await fetch(
      `https://graph.facebook.com/v18.0/${platformPostId}?fields=permalink&access_token=${accessToken}`
    );
    const { permalink } = await permalinkResponse.json();

    log.info({ postId, platformPostId, permalink }, 'Published to Instagram');

    return {
      success: true,
      platformPostId,
      permalink,
    };
  } catch (error) {
    log.error({ error, postId }, 'Instagram publish error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Publish post to Facebook
 */
async function publishToFacebook(
  postId: string,
  content: string,
  imageUrl: string,
  hashtags: string[]
): Promise<{ success: boolean; platformPostId?: string; permalink?: string; error?: string }> {
  const accessToken = process.env.META_FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    return {
      success: false,
      error: 'Facebook credentials not configured. Set META_FACEBOOK_PAGE_ACCESS_TOKEN and META_FACEBOOK_PAGE_ID',
    };
  }

  try {
    // Format message with hashtags
    const message = content + '\n\n' + hashtags.map(h => `#${h}`).join(' ');

    // Publish photo post
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          caption: message,
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook publish failed: ${JSON.stringify(error)}`);
    }

    const { id: platformPostId, post_id } = await response.json();

    // Construct permalink (format: facebook.com/{pageId}/posts/{postId})
    const permalink = `https://www.facebook.com/${pageId}/posts/${post_id || platformPostId}`;

    log.info({ postId, platformPostId, permalink }, 'Published to Facebook');

    return {
      success: true,
      platformPostId,
      permalink,
    };
  } catch (error) {
    log.error({ error, postId }, 'Facebook publish error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST /api/admin/social-media/[id]/publish
 * Publish an approved post to the platform
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createAdminSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Fetch the post
    const { data: post, error: fetchError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validate post can be published
    if (post.status !== 'approved' && post.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Post must be approved before publishing' },
        { status: 400 }
      );
    }

    if (!post.image_url) {
      return NextResponse.json(
        { error: 'Post must have an image to publish' },
        { status: 400 }
      );
    }

    // Publish to platform
    let result: { success: boolean; platformPostId?: string; permalink?: string; error?: string };

    if (post.platform === 'instagram') {
      result = await publishToInstagram(id, post.content, post.image_url, post.hashtags);
    } else if (post.platform === 'facebook') {
      result = await publishToFacebook(id, post.content, post.image_url, post.hashtags);
    } else {
      return NextResponse.json(
        { error: 'Platform not supported yet. Currently supports Instagram and Facebook.' },
        { status: 400 }
      );
    }

    if (result.success) {
      // Update post as published
      const { data: updatedPost, error: updateError } = await supabase
        .from('social_media_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          platform_post_id: result.platformPostId,
          platform_permalink: result.permalink,
          error_message: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        log.error({ error: updateError, id }, 'Failed to update post after publishing');
      }

      return NextResponse.json({
        success: true,
        post: updatedPost,
        permalink: result.permalink,
      });
    } else {
      // Update post as failed
      await supabase
        .from('social_media_posts')
        .update({
          status: 'failed',
          error_message: result.error,
          retry_count: (post.retry_count || 0) + 1,
        })
        .eq('id', id);

      return NextResponse.json(
        { error: result.error || 'Publishing failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error({ error }, 'Publish endpoint error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
