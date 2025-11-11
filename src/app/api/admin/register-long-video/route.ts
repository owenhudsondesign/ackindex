import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
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
    console.log('[register-long-video] Request received');

    // Check authentication and admin authorization
    const supabaseClient = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) {
      console.log('[register-long-video] Auth failed');
      return adminOrError;
    }

    console.log('[register-long-video] Auth successful');

    const { videoId, transcriptId, fileName } = await req.json();
    console.log('[register-long-video] Params:', { videoId, transcriptId, fileName });

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
      console.log('Document not found, creating new document for video:', videoId);

      const youtubeApiKey = process.env.YOUTUBE_API_KEY;
      if (!youtubeApiKey) {
        console.error('YouTube API key not configured');
        return NextResponse.json(
          { error: 'YouTube API key not configured' },
          { status: 500 }
        );
      }

      console.log('Fetching video metadata from YouTube API...');
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API error:', response.status, errorText);
        return NextResponse.json(
          { error: `Failed to fetch video metadata from YouTube: ${response.status}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      console.log('YouTube API response:', JSON.stringify(data, null, 2));

      if (!data.items || data.items.length === 0) {
        console.error('Video not found on YouTube:', videoId);
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
      console.log('Creating document with title:', title);
      const { data: newDocument, error: createError } = await supabase
        .from('documents')
        .insert({
          title,
          source_url: videoUrl,
          status: 'processing',
          // Note: metadata column doesn't exist, store basic info only
        })
        .select('id, title, status')
        .single();

      if (createError || !newDocument) {
        console.error('Failed to create document:', createError);
        return NextResponse.json(
          { error: `Failed to create document record: ${createError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      console.log('Document created successfully:', newDocument.id);
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
