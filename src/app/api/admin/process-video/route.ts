/**
 * API endpoint for processing YouTube videos with Gladia transcription
 * POST /api/admin/process-video
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import {
  processYouTubeVideo,
  processYouTubePlaylist,
  isYouTubeUrl,
  extractVideoId,
  extractPlaylistId,
  isPlaylistUrl,
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
      maxVideos, // For playlists: limit number of videos to process
      skipExisting = false, // For playlists: skip already-processed videos
      delayBetweenVideos = 2000, // For playlists: delay between videos (ms)
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

    // Check if it's a playlist or single video
    const isPlaylist = isPlaylistUrl(url);
    const playlistId = isPlaylist ? extractPlaylistId(url) : null;
    const videoId = !isPlaylist ? extractVideoId(url) : null;

    if (!isPlaylist && !videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }

    if (isPlaylist && !playlistId) {
      return NextResponse.json(
        { error: 'Could not extract playlist ID from URL' },
        { status: 400 }
      );
    }

    const userId = session?.user?.id;

    log.info(
      { url, videoId, playlistId, isPlaylist, userId },
      isPlaylist ? 'Playlist processing request received' : 'Video processing request received'
    );

    // For single videos: check if already being processed or exists
    if (!isPlaylist) {
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id, status')
        .eq('source_url', url)
        .single();

      if (existingDoc) {
        if (existingDoc.status === 'processing') {
          return NextResponse.json(
            {
              message: 'Video is already being processed',
              documentId: existingDoc.id,
              status: 'processing',
            },
            { status: 200 }
          );
        }

        // If document exists but is completed or failed, delete it to allow re-processing
        if (existingDoc.status === 'completed' || existingDoc.status === 'failed') {
          log.info(
            { documentId: existingDoc.id, status: existingDoc.status, url },
            'Deleting existing document for re-processing'
          );

          // Delete existing chunks first
          await supabase
            .from('chunks')
            .delete()
            .eq('document_id', existingDoc.id);

          // Delete the document
          await supabase
            .from('documents')
            .delete()
            .eq('id', existingDoc.id);

          log.info(
            { documentId: existingDoc.id },
            'Existing document deleted, will create new one'
          );
        }
      }
    }

    // Process video or playlist (either in queue or immediately)
    if (useQueue) {
      console.log('\n' + '='.repeat(80));
      console.log(`[API] ADDING JOB TO QUEUE`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`URL: ${url}`);
      console.log(`Type: ${isPlaylist ? 'PLAYLIST' : 'VIDEO'}`);
      console.log(`${isPlaylist ? 'Playlist ID' : 'Video ID'}: ${isPlaylist ? playlistId : videoId}`);
      console.log(`User ID: ${userId}`);
      console.log('='.repeat(80));

      // Add to BullMQ queue for background processing
      const jobName = isPlaylist ? 'process-youtube-playlist' : 'process-youtube-video';
      const job = await scrapingQueue.add(
        jobName,
        {
          url,
          language,
          enableCodeSwitching,
          chunkSize,
          chunkOverlap,
          userId,
          ...(isPlaylist && {
            maxVideos,
            skipExisting,
            delayBetweenVideos,
          }),
        },
        {
          attempts: isPlaylist ? 1 : 3, // Don't retry playlists (too long)
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

      console.log(`✅ [API] Job added to queue successfully!`);
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Job Name: ${job.name}`);
      console.log(`   Queue: scraping`);
      console.log('='.repeat(80) + '\n');

      log.info(
        { jobId: job.id, url, videoId, playlistId, isPlaylist },
        isPlaylist ? 'Playlist processing job queued' : 'Video processing job queued'
      );

      return NextResponse.json(
        {
          message: isPlaylist ? 'Playlist processing started' : 'Video processing started',
          jobId: job.id,
          type: isPlaylist ? 'playlist' : 'video',
          ...(isPlaylist ? { playlistId } : { videoId }),
          status: 'queued',
        },
        { status: 202 }
      );
    } else {
      // Process immediately (not recommended for playlists or long videos)
      if (isPlaylist) {
        const result = await processYouTubePlaylist(url, undefined, {
          language,
          enableCodeSwitching,
          chunkSize,
          chunkOverlap,
          maxVideos,
          skipExisting,
          delayBetweenVideos,
        });

        log.info(
          { playlistId, result },
          'Playlist processing completed'
        );

        return NextResponse.json(
          {
            message: 'Playlist processed successfully',
            type: 'playlist',
            playlistId,
            ...result,
            status: 'completed',
          },
          { status: 200 }
        );
      } else {
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
            type: 'video',
            documentId,
            videoId,
            status: 'completed',
          },
          { status: 200 }
        );
      }
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
