/**
 * API endpoint for processing YouTube videos with Gladia transcription
 * POST /api/admin/process-video
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import {
  processYouTubeVideo,
  isYouTubeUrl,
  extractVideoId,
} from '@/lib/youtubeGladiaScraper';
import logger from '@/lib/logger';
import { scrapingQueue } from '@/lib/queues';

export const maxDuration = 300; // 5 minutes for API route (actual processing happens in background)

/**
 * POST /api/admin/process-video
 * Triggers YouTube video processing with Gladia transcription
 */
export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/process-video' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Parse request body
    const body = await request.json();
    const {
      url,
      language = 'en',
      enableCodeSwitching = false,
      chunkSize = 500,
      chunkOverlap = 50,
      useQueue = true, // Process in background by default
    } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!isYouTubeUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }

    const userId = session?.user?.id;

    log.info(
      { url, videoId, userId },
      'Video processing request received'
    );

    // Check if video is already being processed
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id, status')
      .eq('source_url', url)
      .single();

    if (existingDoc && existingDoc.status === 'processing') {
      return NextResponse.json(
        {
          message: 'Video is already being processed',
          documentId: existingDoc.id,
          status: 'processing',
        },
        { status: 200 }
      );
    }

    // Process video (either in queue or immediately)
    if (useQueue) {
      // Add to BullMQ queue for background processing
      const job = await scrapingQueue.add(
        'process-youtube-video',
        {
          url,
          language,
          enableCodeSwitching,
          chunkSize,
          chunkOverlap,
          userId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
          },
          removeOnComplete: {
            age: 86400, // Keep completed jobs for 24 hours
          },
          removeOnFail: {
            age: 604800, // Keep failed jobs for 7 days
          },
        }
      );

      log.info(
        { jobId: job.id, url, videoId },
        'Video processing job queued'
      );

      return NextResponse.json(
        {
          message: 'Video processing started',
          jobId: job.id,
          videoId,
          status: 'queued',
        },
        { status: 202 }
      );
    } else {
      // Process immediately (not recommended for long videos)
      const documentId = await processYouTubeVideo(url, undefined, {
        language,
        enableCodeSwitching,
        chunkSize,
        chunkOverlap,
      });

      log.info(
        { documentId, url, videoId },
        'Video processing completed'
      );

      return NextResponse.json(
        {
          message: 'Video processed successfully',
          documentId,
          videoId,
          status: 'completed',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    log.error({ error }, 'Video processing endpoint error');

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/process-video?videoId=xxx
 * Check the status of a video processing job
 */
export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/process-video/GET' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get video ID or document ID from query params
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const documentId = searchParams.get('documentId');

    if (!videoId && !documentId) {
      return NextResponse.json(
        { error: 'videoId or documentId is required' },
        { status: 400 }
      );
    }

    // Query database for document status
    let query = supabase
      .from('documents')
      .select('id, status, title, chunk_count, total_tokens, created_at, updated_at');

    if (documentId) {
      query = query.eq('id', documentId);
    } else {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      query = query.eq('source_url', url);
    }

    const { data: document, error } = await query.single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        documentId: document.id,
        status: document.status,
        title: document.title,
        chunkCount: document.chunk_count,
        totalTokens: document.total_tokens,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error({ error }, 'Video status check error');

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
