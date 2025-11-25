/**
 * Admin API to link a meeting video to its document
 *
 * This fixes videos that were processed before the document linking was added
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { videoId, documentId } = await request.json();

    if (!videoId || !documentId) {
      return NextResponse.json(
        { error: 'videoId and documentId are required' },
        { status: 400 }
      );
    }

    // Update the meeting_videos record with the document_id
    const { error: videoError } = await supabaseAdmin
      .from('meeting_videos')
      .update({ document_id: documentId })
      .eq('id', videoId);

    if (videoError) {
      return NextResponse.json(
        { error: `Failed to update video: ${videoError.message}` },
        { status: 500 }
      );
    }

    // Get the video's public_url to update the blog post thumbnail
    const { data: video } = await supabaseAdmin
      .from('meeting_videos')
      .select('public_url, storage_url')
      .eq('id', videoId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Video ${videoId} linked to document ${documentId}`,
      videoUrl: video?.public_url || video?.storage_url,
    });
  } catch (error) {
    console.error('Link video error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: List all videos with their document links (for debugging)
 */
export async function GET() {
  try {
    const { data: videos, error } = await supabaseAdmin
      .from('meeting_videos')
      .select('id, meeting_title, document_id, public_url, storage_url, processing_status')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get blog posts to help match
    const { data: blogPosts } = await supabaseAdmin
      .from('blog_posts')
      .select('id, title, document_id, slug')
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      videos: videos || [],
      blogPosts: blogPosts || [],
    });
  } catch (error) {
    console.error('Get videos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
