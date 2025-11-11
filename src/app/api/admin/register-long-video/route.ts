import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/adminAuth';
import { scrapingQueue } from '@/lib/queues';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Register a long video transcript that was uploaded directly to AssemblyAI by the client
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { videoId, transcriptId, fileName } = await req.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    // Check if document exists for this video, if not create it
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('source_url', videoUrl)
      .single();

    if (docError || !document) {
      // Document doesn't exist, fetch video metadata and create it
      const youtubeApiKey = process.env.YOUTUBE_API_KEY;
      if (!youtubeApiKey) {
        return NextResponse.json(
          { error: 'YouTube API key not configured' },
          { status: 500 }
        );
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch video metadata from YouTube' },
          { status: 500 }
        );
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        return NextResponse.json(
          { error: `Video not found on YouTube: ${videoId}` },
          { status: 404 }
        );
      }

      const video = data.items[0];
      const title = video.snippet.title;
      const description = video.snippet.description || '';
      const channelTitle = video.snippet.channelTitle || '';

      // Create document
      const { data: newDocument, error: createError } = await supabase
        .from('documents')
        .insert({
          title,
          source_url: videoUrl,
          status: 'processing',
          metadata: {
            channel: channelTitle,
            description: description.substring(0, 500),
            videoId,
            uploadedViaAudio: true,
          },
        })
        .select('id, title, status')
        .single();

      if (createError || !newDocument) {
        console.error('Failed to create document:', createError);
        return NextResponse.json(
          { error: 'Failed to create document record' },
          { status: 500 }
        );
      }

      document = newDocument;
    }

    // Update status to processing (if not already set during creation)
    if (document.status !== 'processing') {
      await supabase
        .from('documents')
        .update({ status: 'processing' })
        .eq('id', document.id);
    }

    // Queue a job to poll for completion
    const job = await scrapingQueue.add('process-long-video', {
      documentId: document.id,
      videoId,
      transcriptId,
      fileName: fileName || 'audio.mp3',
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      jobId: job.id,
      transcriptId,
      message: 'Transcript registered successfully. Processing in background (15-30 minutes).',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register transcript',
      },
      { status: 500 }
    );
  }
}
