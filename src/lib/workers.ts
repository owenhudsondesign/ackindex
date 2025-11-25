import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import * as Sentry from '@sentry/node';
import {
  startScrapeJob,
  waitForJob,
  getJobResults,
  downloadPDF
} from '@/lib/apifyScraper';
import {
  updateDocument,
  createScrapeJob,
  updateScrapeJob,
  storeChunks,
  markDocumentCompleted,
  markDocumentFailed,
  updateChunkEmbedding,
} from '@/lib/database';
import { supabaseAdmin } from '@/lib/supabase';
import {
  processYouTubeVideo,
  processYouTubePlaylist,
} from '@/lib/youtubeGladiaScraper';
import { transcribeWithAssemblyAI } from '@/lib/assemblyAITranscriber';
import { storeLongVideoTranscript } from '@/lib/longVideoProcessor';
import { downloadFromDropbox, downloadFromFolder } from '@/lib/dropbox';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parsePDF } from '@/lib/pdfParser';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddingsBatch } from '@/lib/embeddings';
import { createLogger } from '@/lib/logger';

// Create logger for worker operations
const workerLogger = createLogger({ component: 'worker' });

// Redis connection for Upstash
console.log('🔌 Connecting to Redis...');
console.log(`   URL: ${process.env.REDIS_URL?.substring(0, 20)}...`);
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
});

// Log Redis connection events
redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisConnection.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redisConnection.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Interface for scraping job data
interface ScrapingJobData {
  documentId?: string;
  url?: string; // Optional for long video processing
  userId?: string; // Optional for long video processing
  language?: string;
  enableCodeSwitching?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
  // Playlist-specific options
  maxVideos?: number;
  skipExisting?: boolean;
  delayBetweenVideos?: number;
  // Long video processing options
  videoId?: string;
  transcriptId?: string; // AssemblyAI transcript ID to poll
  fileName?: string;
  // Meeting video processing options
  storagePath?: string;
  storageUrl?: string;
  // Dropbox import options
  dropboxUrl?: string;
  dropboxPath?: string;
  filename?: string;
  meetingTitle?: string;
  meetingDate?: string | null;
}

// Interface for embedding job data
interface EmbeddingJobData {
  chunks: Array<{
    id: string;
    content: string;
  }>;
}

// Interface for PDF processing job data
interface PDFProcessingJobData {
  documentId: string;
  storagePath: string;
  filename: string;
  userId: string;
}

/**
 * Process URL scraping - extracted from scrape-url route for reusability
 */
async function processUrlScraping(
  documentId: string,
  url: string,
  userId: string | undefined,
  job: Job
): Promise<void> {
  const log = workerLogger.child({ jobId: job.id, documentId, userId, url });

  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);
    await job.updateProgress(10);

    // Start Apify scrape job
    const runId = await startScrapeJob(url, {
      maxDepth: 2,
      maxPages: 20,
      extractPDFs: true,
    });

    // Create scrape job record
    const scrapeJob = await createScrapeJob({
      document_id: documentId,
      url,
      apify_run_id: runId,
    });

    log.info({ runId }, 'Waiting for Apify job to complete');
    await job.updateProgress(20);

    // Wait for job to complete (with 2 minute timeout)
    await waitForJob(runId, 120000);
    await job.updateProgress(40);

    // Get results
    const results = await getJobResults(runId);
    log.info({ pagesRetrieved: results.length }, 'Retrieved pages from scrape');

    // Update scrape job
    await updateScrapeJob(scrapeJob.id, {
      apify_status: 'SUCCEEDED',
      pages_crawled: results.length,
      pdfs_found: results.reduce((sum, r) => sum + r.pdfs.length, 0),
      completed_at: new Date().toISOString(),
    } as any);

    await job.updateProgress(50);

    // Process all scraped content
    let allChunks: any[] = [];
    let totalTokens = 0;

    // Process text content from pages
    for (const result of results) {
      if (result.text && result.text.length > 100) {
        const chunks = chunkText(result.text, {
          maxTokens: 500,
          overlap: 50,
        });

        chunks.forEach(chunk => {
          allChunks.push({
            ...chunk,
            metadata: {
              ...chunk.metadata,
              source_url: result.url,
              page_title: result.title,
            },
          });
          totalTokens += chunk.tokens;
        });
      }
    }

    await job.updateProgress(70);

    // Process PDFs found during scraping
    for (const result of results) {
      for (const pdf of result.pdfs) {
        try {
          log.info({ pdfUrl: pdf.url }, 'Processing PDF');

          const pdfBuffer = await downloadPDF(pdf.url);
          const parsed = await parsePDF(pdfBuffer, pdf.filename);

          const pdfChunks = chunkText(parsed.text, {
            maxTokens: 500,
            overlap: 50,
          });

          pdfChunks.forEach(chunk => {
            allChunks.push({
              ...chunk,
              metadata: {
                ...chunk.metadata,
                source_url: pdf.url,
                source_type: 'pdf',
                pdf_title: parsed.title,
                pdf_pages: parsed.pages,
              },
            });
            totalTokens += chunk.tokens;
          });
        } catch (pdfError) {
          log.error({ err: pdfError, pdfUrl: pdf.url }, 'Failed to process PDF');
        }
      }
    }

    await job.updateProgress(85);

    // Re-index all chunks
    allChunks = allChunks.map((chunk, index) => ({
      ...chunk,
      index,
    }));

    // Store all chunks
    if (allChunks.length > 0) {
      await storeChunks(documentId, allChunks);
    }

    // Update document with title from first result
    const firstResult = results[0];
    await updateDocument(documentId, {
      title: firstResult?.title || url,
      description: firstResult?.text?.slice(0, 200),
    } as any);

    // Mark document as completed
    await markDocumentCompleted(documentId, allChunks.length, totalTokens);

    await job.updateProgress(100);

    log.info(
      { chunksCount: allChunks.length, totalTokens },
      'Completed scraping successfully'
    );
  } catch (error) {
    log.error({ err: error }, 'Processing failed');
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    throw error; // Re-throw so BullMQ knows it failed
  }
}

/**
 * Process PDF from storage
 */
async function processPDFFromStorage(
  documentId: string,
  storagePath: string,
  filename: string,
  userId: string,
  job: Job
): Promise<void> {
  const log = workerLogger.child({ jobId: job.id, documentId, userId, filename });

  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);
    await job.updateProgress(5);

    log.info({ filename, storagePath }, 'Downloading PDF from storage');

    // Create Supabase admin client for storage access
    const { createClient } = require('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('pdfs')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download PDF from storage: ${downloadError.message}`);
    }

    await job.updateProgress(20);

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    log.info({ filename, size: buffer.length }, 'Downloaded PDF, parsing');
    await job.updateProgress(30);

    // Parse PDF with AI enhancement
    const parsed = await parsePDF(buffer, filename, true);

    log.info({ textLength: parsed.text.length, pages: parsed.pages }, 'Extracted text from PDF');
    await job.updateProgress(50);

    // Chunk the text
    const chunks = chunkText(parsed.text, {
      maxTokens: 500,
      overlap: 50,
      preserveParagraphs: true,
      preserveHeadings: true,
    });

    log.info({ chunksCount: chunks.length }, 'Created chunks');
    await job.updateProgress(60);

    // Add PDF metadata to chunks
    const enrichedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      index,
      metadata: {
        ...chunk.metadata,
        source_type: 'pdf',
        filename: filename,
        pdf_title: parsed.title,
        pdf_pages: parsed.pages,
        ...parsed.metadata,
      },
    }));

    // Calculate total tokens
    const totalTokens = enrichedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);

    // Store chunks
    await storeChunks(documentId, enrichedChunks);
    await job.updateProgress(70);

    // Update document with parsed metadata
    await updateDocument(documentId, {
      title: parsed.title || filename.replace('.pdf', ''),
      description: parsed.description,
    } as any);
    await job.updateProgress(75);

    // Queue embedding generation for the chunks
    const { embeddingQueue } = await import('./queues');
    await embeddingQueue.add(
      'generate-embeddings',
      {
        chunks: enrichedChunks.map(chunk => ({
          id: `${documentId}-${chunk.index}`,
          content: chunk.content,
        })),
      },
      {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );

    log.info({ chunksCount: enrichedChunks.length }, 'Queued embedding generation');
    await job.updateProgress(85);

    // Mark as completed
    await markDocumentCompleted(documentId, chunks.length, totalTokens);
    await job.updateProgress(95);

    // Clean up storage
    await supabaseClient.storage.from('pdfs').remove([storagePath]);

    await job.updateProgress(100);

    log.info(
      { filename, chunksCount: chunks.length, totalTokens },
      'Completed PDF processing from storage'
    );
  } catch (error) {
    log.error({ err: error }, 'PDF processing from storage failed');
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    throw error; // Re-throw so BullMQ knows it failed
  }
}

/**
 * Process YouTube video with Gladia transcription
 */
async function processYouTubeVideoJob(
  url: string,
  options: {
    language?: string;
    enableCodeSwitching?: boolean;
    chunkSize?: number;
    chunkOverlap?: number;
  },
  job: Job
): Promise<string> {
  const log = workerLogger.child({ jobId: job.id, url });

  try {
    console.log('='.repeat(60));
    console.log(`[${new Date().toISOString()}] YOUTUBE VIDEO PROCESSING STARTED`);
    console.log(`Job ID: ${job.id}`);
    console.log(`URL: ${url}`);
    console.log(`Language: ${options.language || 'en'}`);
    console.log(`Code Switching: ${options.enableCodeSwitching ?? false}`);
    console.log('='.repeat(60));

    log.info({ url }, 'Starting YouTube video processing with Gladia');
    await job.updateProgress(5);

    // Import the YouTube processor
    const { processYouTubeVideo } = await import('@/lib/youtubeGladiaScraper');

    await job.updateProgress(10);

    // Process video (this handles everything: metadata, transcription, enrichment, storage)
    const documentId = await processYouTubeVideo(url, undefined, {
      language: options.language || 'en',
      enableCodeSwitching: options.enableCodeSwitching ?? false,
      chunkSize: options.chunkSize ?? 500,
      chunkOverlap: options.chunkOverlap ?? 50,
    });

    await job.updateProgress(90);

    // Queue embedding generation
    const { embeddingQueue } = await import('./queues');
    const { createClient } = require('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get chunks that need embeddings
    const { data: chunks } = await supabaseClient
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .is('embedding', null)
      .limit(100);

    if (chunks && chunks.length > 0) {
      await embeddingQueue.add('generate-embeddings', { chunks });
      log.info({ documentId, chunkCount: chunks.length }, 'Queued embedding generation');
    }

    await job.updateProgress(100);

    log.info({ documentId, url }, 'Completed YouTube video processing');
    return documentId;
  } catch (error) {
    log.error({ err: error, url }, 'YouTube video processing failed');
    throw error;
  }
}

/**
 * Process YouTube playlist with Gladia transcription
 */
async function processYouTubePlaylistJob(
  url: string,
  options: {
    language?: string;
    enableCodeSwitching?: boolean;
    chunkSize?: number;
    chunkOverlap?: number;
    maxVideos?: number;
    skipExisting?: boolean;
    delayBetweenVideos?: number;
  },
  job: Job
): Promise<{ documentIds: string[]; totalVideos: number; processedVideos: number }> {
  const log = workerLogger.child({ jobId: job.id, url });

  try {
    console.log('='.repeat(60));
    console.log(`[${new Date().toISOString()}] YOUTUBE PLAYLIST PROCESSING STARTED`);
    console.log(`Job ID: ${job.id}`);
    console.log(`URL: ${url}`);
    console.log(`Max Videos: ${options.maxVideos || 'unlimited'}`);
    console.log(`Skip Existing: ${options.skipExisting ?? false}`);
    console.log('='.repeat(60));

    log.info({ url, options }, 'Starting YouTube playlist processing with Gladia');
    await job.updateProgress(5);

    // Process playlist (this handles everything: fetching videos, processing each one)
    const result = await processYouTubePlaylist(url, undefined, {
      language: options.language || 'en',
      enableCodeSwitching: options.enableCodeSwitching ?? false,
      chunkSize: options.chunkSize ?? 500,
      chunkOverlap: options.chunkOverlap ?? 50,
      maxVideos: options.maxVideos,
      skipExisting: options.skipExisting ?? false,
      delayBetweenVideos: options.delayBetweenVideos ?? 2000,
    });

    await job.updateProgress(90);

    // Queue embedding generation for all processed documents
    const { embeddingQueue } = await import('./queues');
    const { createClient } = require('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const documentId of result.documentIds) {
      const { data: chunks } = await supabaseClient
        .from('document_chunks')
        .select('id, content')
        .eq('document_id', documentId)
        .is('embedding', null)
        .limit(100);

      if (chunks && chunks.length > 0) {
        await embeddingQueue.add('generate-embeddings', { chunks });
        log.info({ documentId, chunkCount: chunks.length }, 'Queued embedding generation');
      }
    }

    await job.updateProgress(100);

    log.info(
      {
        playlistId: result.playlistId,
        totalVideos: result.totalVideos,
        processedVideos: result.processedVideos,
        failedVideos: result.failedVideos,
      },
      'Completed YouTube playlist processing'
    );

    return {
      documentIds: result.documentIds,
      totalVideos: result.totalVideos,
      processedVideos: result.processedVideos,
    };
  } catch (error) {
    log.error({ err: error, url }, 'YouTube playlist processing failed');
    throw error;
  }
}

/**
 * Process Dropbox video import job
 * Downloads from Dropbox, uploads to Bunny, then processes through normal pipeline
 */
async function processDropboxVideoJob(
  data: {
    videoId: string;
    dropboxUrl: string;
    dropboxPath: string;
    filename: string;
    meetingTitle: string;
    meetingDate: string | null;
  },
  job: Job
): Promise<{ documentId?: string }> {
  const { videoId, dropboxUrl, dropboxPath, filename, meetingTitle, meetingDate } = data;
  const log = workerLogger.child({ jobId: job.id, videoId, filename });

  try {
    log.info('Starting Dropbox video import');
    await job.updateProgress(5);

    // Update status to processing
    await supabaseAdmin
      .from('meeting_videos')
      .update({
        processing_status: 'processing',
        processing_step: 'downloading',
        processing_progress: 5,
      })
      .eq('id', videoId);

    // Step 1: Download from Dropbox
    log.info({ dropboxPath }, 'Downloading from Dropbox');
    await job.updateProgress(10);

    // Use folder download (your own folder) or shared link download
    const isSharedLink = dropboxUrl.startsWith('http');
    const downloadResult = isSharedLink
      ? await downloadFromDropbox(dropboxUrl, dropboxPath)
      : await downloadFromFolder(dropboxPath);

    if (!downloadResult) {
      throw new Error('Failed to download from Dropbox');
    }

    await supabaseAdmin
      .from('meeting_videos')
      .update({
        processing_step: 'uploading',
        processing_progress: 30,
      })
      .eq('id', videoId);

    await job.updateProgress(30);

    // Step 2: Upload to Bunny.net
    log.info('Uploading to Bunny.net');

    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE;
    const bunnyApiKey = process.env.BUNNY_API_KEY;
    const bunnyPullZone = process.env.BUNNY_PULL_ZONE_URL;

    if (!bunnyStorageZone || !bunnyApiKey) {
      throw new Error('Bunny.net credentials not configured');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const bunnyPath = `videos/${timestamp}-${safeFilename}`;

    // Stream upload to Bunny
    const bunnyUploadUrl = `https://storage.bunnycdn.com/${bunnyStorageZone}/${bunnyPath}`;

    // Convert web stream to node stream for upload
    const chunks: Uint8Array[] = [];
    const reader = downloadResult.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Bunny upload failed: ${uploadResponse.status}`);
    }

    const publicUrl = `${bunnyPullZone}/${bunnyPath}`;

    log.info({ publicUrl, fileSize: buffer.length }, 'Uploaded to Bunny.net');

    await job.updateProgress(50);

    // Update video record with Bunny URL
    await supabaseAdmin
      .from('meeting_videos')
      .update({
        storage_provider: 'bunny',
        storage_url: publicUrl,
        storage_path: bunnyPath,
        public_url: publicUrl,
        file_size: buffer.length,
        processing_step: 'transcribing',
        processing_progress: 50,
      })
      .eq('id', videoId);

    // Step 3: Now process through the normal meeting video pipeline
    // This reuses the existing processMeetingVideoJob logic
    log.info('Starting transcription pipeline');

    // Create a synthetic job data object to reuse existing processing
    const meetingVideoData: ScrapingJobData = {
      videoId,
      userId: '', // Already set in video record
    };

    // Call the existing meeting video processor
    // It will pick up from where we left off (video already uploaded)
    const result = await processMeetingVideoJob(meetingVideoData, job);

    log.info({ documentId: result?.documentId }, 'Dropbox video import complete');

    return { documentId: result?.documentId };
  } catch (error) {
    log.error({ err: error }, 'Dropbox video import failed');

    await supabaseAdmin
      .from('meeting_videos')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', videoId);

    throw error;
  }
}

/**
 * Process long video job handler
 */
async function processLongVideoJob(
  data: ScrapingJobData,
  job: Job
) {
  const { documentId, transcriptId, fileName } = data;

  if (!documentId || !transcriptId) {
    throw new Error('Missing required fields for long video processing');
  }
  const log = workerLogger.child({ jobId: job.id, documentId, transcriptId });

  try {
    log.info('Starting long video processing - polling AssemblyAI for transcript');
    await job.updateProgress(10);

    // 1. Get document info from database
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('title, created_at, source_url')
      .eq('id', documentId)
      .single();

    if (!doc) {
      throw new Error('Document not found');
    }

    // Extract video ID from YouTube URL if provided
    let thumbnailUrl: string | null = null;
    if (doc.source_url) {
      const videoIdMatch = doc.source_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        log.info({ videoId, thumbnailUrl }, 'Extracted YouTube thumbnail');

        // Update document with thumbnail
        await supabaseAdmin
          .from('documents')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', documentId);
      }
    }

    const videoInfo = {
      title: doc.title || 'Untitled Audio',
      channel: 'Uploaded Audio',
      publishedAt: doc.created_at,
      description: '',
    };

    log.info({ videoInfo, thumbnailUrl }, 'Document metadata fetched');
    await job.updateProgress(20);

    // 2. Poll AssemblyAI for transcript completion
    log.info('Polling AssemblyAI for transcript completion');
    const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyAIKey) {
      throw new Error('ASSEMBLYAI_API_KEY not configured');
    }

    let transcriptData: any = null;
    let attempts = 0;
    const maxAttempts = 360; // 30 minutes at 5 second intervals

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': assemblyAIKey,
        },
      });

      if (!response.ok) {
        throw new Error(`AssemblyAI API error: ${response.status}`);
      }

      transcriptData = await response.json();

      if (transcriptData.status === 'completed') {
        log.info('Transcript completed');
        break;
      } else if (transcriptData.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${transcriptData.error}`);
      }

      // Update progress based on polling attempts
      const progress = Math.min(20 + (attempts / maxAttempts) * 50, 70);
      await job.updateProgress(progress);

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!transcriptData || transcriptData.status !== 'completed') {
      throw new Error('Transcription timed out');
    }

    // Convert AssemblyAI response to our format
    const transcription = {
      fullText: transcriptData.text || '',
      segments: (transcriptData.utterances || []).map((utterance: any) => ({
        text: utterance.text,
        start: utterance.start / 1000, // Convert ms to seconds
        end: utterance.end / 1000,
        speaker: parseInt(utterance.speaker.replace('Speaker ', '')) || undefined,
        confidence: utterance.confidence,
      })),
      duration: (transcriptData.audio_duration || 0) / 1000, // Convert ms to seconds
    };

    log.info(
      {
        transcriptLength: transcription.fullText.length,
        duration: transcription.duration,
        segments: transcription.segments.length,
      },
      'Transcription completed'
    );
    await job.updateProgress(75);

    // 3. Store in database
    log.info('Storing transcript in database');
    await storeLongVideoTranscript(
      documentId,
      null, // No videoId for uploaded audio
      {
        fullText: transcription.fullText,
        segments: transcription.segments,
        totalDuration: transcription.duration,
      },
      videoInfo
    );

    await job.updateProgress(90);

    // 4. Queue embedding generation for all chunks
    log.info('Queuing embedding generation');
    const { embeddingQueue } = await import('./queues');

    const { data: chunks } = await supabaseAdmin
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .is('embedding', null)
      .limit(1000); // Process up to 1000 chunks at a time

    if (chunks && chunks.length > 0) {
      await embeddingQueue.add('generate-embeddings', { chunks });
      log.info({ chunkCount: chunks.length }, 'Queued embedding generation');
    } else {
      log.warn('No chunks found for embedding generation');
    }

    await job.updateProgress(100);

    log.info('Long video processing completed successfully');

    return {
      documentId,
      duration: transcription.duration,
      segmentCount: transcription.segments.length,
    };
  } catch (error) {
    log.error({ err: error }, 'Long video processing failed');

    // Mark document as failed
    try {
      await markDocumentFailed(
        documentId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (updateError) {
      log.error({ err: updateError }, 'Failed to mark document as failed');
    }

    throw error;
  }
}

/**
 * Process meeting video job handler
 * Downloads video from storage, extracts audio, uploads to AssemblyAI, and processes transcript
 */
async function processMeetingVideoJob(
  data: ScrapingJobData,
  job: Job
) {
  const { videoId, documentId, storageUrl, storagePath } = data;

  if (!videoId || !documentId || !storageUrl) {
    throw new Error('Missing required fields for meeting video processing');
  }

  const log = workerLogger.child({ jobId: job.id, videoId, documentId });

  try {
    log.info('Starting meeting video processing');
    await job.updateProgress(5);

    // Update meeting_videos status
    await supabaseAdmin
      .from('meeting_videos')
      .update({
        processing_status: 'processing',
        transcription_status: 'processing',
      })
      .eq('id', videoId);

    // Get video metadata
    const { data: video } = await supabaseAdmin
      .from('meeting_videos')
      .select('meeting_title, meeting_date, meeting_description, original_filename')
      .eq('id', videoId)
      .single();

    if (!video) {
      throw new Error('Video not found');
    }

    log.info({ video }, 'Video metadata fetched');
    await job.updateProgress(10);

    // Download video from storage (supports both Bunny and Supabase)
    log.info('Downloading video from storage URL');

    let buffer: Buffer;

    // Determine storage provider and download accordingly
    const { data: videoRecord } = await supabaseAdmin
      .from('meeting_videos')
      .select('storage_provider, storage_url, storage_path')
      .eq('id', videoId)
      .single();

    if (videoRecord?.storage_provider === 'bunny' || !storagePath) {
      // Download from Bunny CDN via HTTP
      log.info({ url: storageUrl }, 'Downloading from Bunny.net');
      const videoResponse = await fetch(storageUrl);

      if (!videoResponse.ok) {
        throw new Error(`Failed to download video from Bunny: ${videoResponse.status}`);
      }

      buffer = Buffer.from(await videoResponse.arrayBuffer());
    } else {
      // Legacy: Download from Supabase Storage
      log.info({ path: storagePath }, 'Downloading from Supabase Storage');
      const { data: videoBlob, error: downloadError } = await supabaseAdmin.storage
        .from('meeting-videos')
        .download(storagePath!);

      if (downloadError || !videoBlob) {
        throw new Error(`Failed to download video: ${downloadError?.message}`);
      }

      buffer = Buffer.from(await videoBlob.arrayBuffer());
    }

    // Save to temp file
    const tempDir = os.tmpdir();
    const tempVideoPath = path.join(tempDir, `meeting_video_${videoId}.mp4`);
    fs.writeFileSync(tempVideoPath, buffer);

    log.info({ tempVideoPath, size: buffer.length }, 'Video downloaded to temp file');
    await job.updateProgress(15);

    // Extract thumbnail from video (non-blocking, continues even if it fails)
    try {
      const { extractAndSaveThumbnail } = await import('./videoThumbnail');
      const thumbnailUrl = await extractAndSaveThumbnail(videoId, tempVideoPath, documentId);
      if (thumbnailUrl) {
        log.info({ thumbnailUrl }, 'Thumbnail extracted successfully');
      } else {
        log.warn('Thumbnail extraction skipped or failed (non-fatal)');
      }
    } catch (thumbError) {
      log.warn({ err: thumbError }, 'Thumbnail extraction failed (non-fatal)');
    }
    await job.updateProgress(20);

    // Upload to AssemblyAI and start transcription
    log.info('Starting AssemblyAI transcription');
    const { AssemblyAI } = await import('assemblyai');
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY || '',
    });

    // Upload video file
    const uploadUrl = await client.files.upload(tempVideoPath);
    log.info({ uploadUrl }, 'Video uploaded to AssemblyAI');
    await job.updateProgress(30);

    // Start transcription with best quality settings
    const transcript = await client.transcripts.transcribe({
      audio: uploadUrl,

      // Core settings
      speech_model: 'best',          // Highest quality model
      speaker_labels: true,          // Speaker diarization
      language_code: 'en_us',

      // Accuracy enhancements
      punctuate: true,               // Auto punctuation
      format_text: true,             // Proper formatting

      // Enhanced features (no additional cost!)
      auto_highlights: true,         // Extract key moments
      entity_detection: true,        // Detect names, dates, locations
      sentiment_analysis: true,      // Understand tone/sentiment
      iab_categories: true,          // Topic categorization
      content_safety: true,          // Flag sensitive content

      // Boost accuracy for town meeting terms
      word_boost: [
        'Select Board',
        'Town Meeting',
        'Planning Board',
        'Zoning Board',
        'Board of Selectmen',
        'Town Manager',
        'Town Administrator',
        'Town Clerk',
        'Acton',  // Add your town name if applicable
      ],
      boost_param: 'high',           // Maximum boost for custom terms
    });

    log.info({ transcriptId: transcript.id, status: transcript.status }, 'Transcription started');

    // Update video with transcript ID
    await supabaseAdmin
      .from('meeting_videos')
      .update({ transcription_job_id: transcript.id })
      .eq('id', videoId);

    await job.updateProgress(40);

    // Poll for completion
    log.info('Polling for transcription completion');
    let attempts = 0;
    const maxAttempts = 360; // 30 minutes
    let finalTranscript = transcript;

    while (attempts < maxAttempts && finalTranscript.status !== 'completed' && finalTranscript.status !== 'error') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      finalTranscript = await client.transcripts.get(transcript.id);

      const progress = Math.min(40 + (attempts / maxAttempts) * 40, 80);
      await job.updateProgress(progress);
      attempts++;
    }

    if (finalTranscript.status === 'error') {
      throw new Error(`Transcription failed: ${finalTranscript.error}`);
    }

    if (finalTranscript.status !== 'completed') {
      throw new Error('Transcription timed out');
    }

    log.info({ duration: finalTranscript.audio_duration }, 'Transcription completed');
    await job.updateProgress(85);

    // Convert to our format
    const transcription = {
      fullText: finalTranscript.text || '',
      segments: (finalTranscript.utterances || []).map((utterance: any) => ({
        text: utterance.text,
        start: utterance.start / 1000, // ms to seconds
        end: utterance.end / 1000,
        speaker: parseInt(utterance.speaker.replace('Speaker ', '')) || undefined,
        confidence: utterance.confidence,
      })),
      totalDuration: (finalTranscript.audio_duration || 0) / 1000,
    };

    // Store transcript
    log.info('Storing transcript in database');
    const videoInfo = {
      title: video.meeting_title,
      channel: 'Town Meeting Recording',
      publishedAt: video.meeting_date,
      description: video.meeting_description || '',
    };

    await storeLongVideoTranscript(documentId, null, transcription, videoInfo);

    // Update video record
    await supabaseAdmin
      .from('meeting_videos')
      .update({
        duration_seconds: Math.floor(transcription.totalDuration),
        processing_status: 'completed',
        transcription_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    await job.updateProgress(90);

    // Queue embedding generation
    log.info('Queuing embedding generation');
    const { embeddingQueue } = await import('./queues');

    const { data: chunks } = await supabaseAdmin
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .is('embedding', null)
      .limit(1000);

    if (chunks && chunks.length > 0) {
      await embeddingQueue.add('generate-embeddings', { chunks });
      log.info({ chunkCount: chunks.length }, 'Queued embedding generation');
    }

    // Generate blog post draft
    try {
      const { createBlogPostForDocument } = await import('./blogGenerator');
      const blogPostId = await createBlogPostForDocument(documentId);
      if (blogPostId) {
        log.info({ blogPostId }, 'Blog post draft created');
      }
    } catch (blogError) {
      log.warn({ err: blogError }, 'Failed to create blog post draft (non-fatal)');
    }

    // Cleanup temp file
    try {
      fs.unlinkSync(tempVideoPath);
    } catch (cleanupError) {
      log.warn({ err: cleanupError }, 'Failed to cleanup temp file');
    }

    await job.updateProgress(100);
    log.info('Meeting video processing completed successfully');

    return {
      videoId,
      documentId,
      duration: transcription.totalDuration,
      segmentCount: transcription.segments.length,
    };

  } catch (error) {
    log.error({ err: error }, 'Meeting video processing failed');

    // Mark video and document as failed
    try {
      await supabaseAdmin
        .from('meeting_videos')
        .update({
          processing_status: 'failed',
          transcription_status: 'failed',
          transcription_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', videoId);

      await markDocumentFailed(
        documentId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (updateError) {
      log.error({ err: updateError }, 'Failed to mark as failed');
    }

    throw error;
  }
}

/**
 * Scraping Worker
 * Processes web scraping jobs and YouTube video processing
 */
export const scrapingWorker = new Worker<ScrapingJobData>(
  'scraping',
  async (job) => {
    const { documentId, url, userId, language, enableCodeSwitching, chunkSize, chunkOverlap } = job.data;

    console.log(`\n🎬 [WORKER] Received job: ${job.name} (ID: ${job.id})`);
    console.log(`📋 Job data:`, JSON.stringify(job.data, null, 2));

    // Check job name to determine which processor to use
    if (job.name === 'process-meeting-video') {
      console.log(`✅ [WORKER] Job identified as meeting video processing`);
      return await processMeetingVideoJob(job.data, job);
    } else if (job.name === 'process-youtube-video') {
      console.log(`✅ [WORKER] Job identified as YouTube video processing`);

      if (!url) {
        throw new Error('URL is required for YouTube video processing');
      }

      workerLogger.info({ jobId: job.id, url }, 'Starting YouTube video processing job');

      const resultDocumentId = await processYouTubeVideoJob(
        url,
        { language, enableCodeSwitching, chunkSize, chunkOverlap },
        job
      );

      console.log(`✅ [WORKER] YouTube job completed. Document ID: ${resultDocumentId}`);
      return { success: true, documentId: resultDocumentId, url };
    } else if (job.name === 'process-youtube-playlist') {
      console.log(`✅ [WORKER] Job identified as YouTube playlist processing`);

      if (!url) {
        throw new Error('URL is required for YouTube playlist processing');
      }

      workerLogger.info({ jobId: job.id, url }, 'Starting YouTube playlist processing job');

      const { maxVideos, skipExisting, delayBetweenVideos } = job.data;

      const result = await processYouTubePlaylistJob(
        url,
        {
          language,
          enableCodeSwitching,
          chunkSize,
          chunkOverlap,
          maxVideos,
          skipExisting,
          delayBetweenVideos,
        },
        job
      );

      console.log(`✅ [WORKER] YouTube playlist job completed. Processed ${result.processedVideos}/${result.totalVideos} videos`);
      return { success: true, ...result, url };
    } else if (job.name === 'process-long-video') {
      console.log(`✅ [WORKER] Job identified as long video processing (AssemblyAI)`);
      workerLogger.info({ jobId: job.id, documentId: job.data.documentId }, 'Starting long video processing job');

      const result = await processLongVideoJob(job.data, job);

      console.log(`✅ [WORKER] Long video job completed. Document ID: ${result.documentId}`);
      return { success: true, ...result };
    } else if (job.name === 'process-dropbox-video') {
      console.log(`✅ [WORKER] Job identified as Dropbox video import`);
      const { videoId, dropboxUrl, dropboxPath, filename, meetingTitle, meetingDate } = job.data;

      if (!videoId || !dropboxUrl || !dropboxPath || !filename) {
        throw new Error('Missing required fields for Dropbox video import');
      }

      workerLogger.info({ jobId: job.id, videoId, filename }, 'Starting Dropbox video import');

      const result = await processDropboxVideoJob({
        videoId,
        dropboxUrl,
        dropboxPath,
        filename,
        meetingTitle: meetingTitle || 'Untitled Meeting',
        meetingDate: meetingDate || null,
      }, job);

      console.log(`✅ [WORKER] Dropbox import job completed. Video ID: ${videoId}`);
      return { success: true, videoId, ...result };
    } else {
      // Regular URL scraping
      if (!url) {
        throw new Error('URL is required for scraping jobs');
      }

      if (!documentId) {
        throw new Error('documentId is required for regular scraping jobs');
      }

      workerLogger.info({ jobId: job.id, url }, 'Starting scraping job');

      await processUrlScraping(documentId, url, userId, job);

      return { success: true, documentId, url };
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process max 5 scraping jobs at once
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (rate limit Apify)
    },
  }
);

/**
 * Embedding Worker
 * Processes embedding generation jobs
 */
export const embeddingWorker = new Worker<EmbeddingJobData>(
  'embedding',
  async (job) => {
    const { chunks } = job.data;

    workerLogger.info({ jobId: job.id, chunksCount: chunks.length }, 'Starting embedding job');

    await job.updateProgress(10);

    // Generate embeddings
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddingsBatch(texts);

    await job.updateProgress(50);

    // Update database
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        await updateChunkEmbedding(chunks[i].id, embeddings[i]);
        successCount++;
      } catch (error) {
        workerLogger.error({ err: error, chunkId: chunks[i].id }, 'Failed to update chunk');
      }
      await job.updateProgress(50 + (i / chunks.length) * 50);
    }

    workerLogger.info(
      { jobId: job.id, successCount, totalChunks: chunks.length },
      'Completed embedding job'
    );

    return { success: true, processed: successCount, total: chunks.length };
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process max 2 embedding jobs at once
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute (rate limit OpenAI)
    },
  }
);

/**
 * PDF Processing Worker
 * Processes PDF uploads from storage
 */
export const pdfProcessingWorker = new Worker<PDFProcessingJobData>(
  'pdf-processing',
  async (job) => {
    const { documentId, storagePath, filename, userId } = job.data;

    workerLogger.info({ jobId: job.id, filename }, 'Starting PDF processing job');

    await processPDFFromStorage(documentId, storagePath, filename, userId, job);

    return { success: true, documentId, filename };
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process max 3 PDFs at once
    lockDuration: 600000, // 10 minutes lock for large PDFs
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute (rate limit OpenAI for embeddings)
    },
  }
);

// Event handlers for scraping worker
scrapingWorker.on('completed', (job) => {
  console.log(`\n✅ [WORKER] Job ${job.id} completed successfully`);
  workerLogger.info({ jobId: job.id }, 'Scraping job completed successfully');
});

scrapingWorker.on('failed', (job, err) => {
  console.error(`\n❌ [WORKER] Job ${job?.id} FAILED: ${err.message}`);
  console.error(`Stack trace:`, err.stack);
  workerLogger.error({ jobId: job?.id, error: err.message }, 'Scraping job failed');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'scraping',
      jobId: job?.id,
      queue: 'scraping',
    },
    extra: {
      jobData: job?.data,
      attemptsMade: job?.attemptsMade,
    },
  });
});

scrapingWorker.on('error', (err) => {
  console.error(`\n💥 [WORKER ERROR] Scraping worker encountered an error:`);
  console.error(err);
  workerLogger.error({ err }, 'Scraping worker error');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'scraping',
      type: 'worker-error',
    },
  });
});

// Add active event handler for debugging
scrapingWorker.on('active', (job) => {
  console.log(`\n⚡ [WORKER] Job ${job.id} is now ACTIVE (processing started)`);
});

// Event handlers for embedding worker
embeddingWorker.on('completed', (job) => {
  workerLogger.info({ jobId: job.id }, 'Embedding job completed successfully');
});

embeddingWorker.on('failed', (job, err) => {
  workerLogger.error({ jobId: job?.id, error: err.message }, 'Embedding job failed');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'embedding',
      jobId: job?.id,
      queue: 'embedding',
    },
    extra: {
      jobData: job?.data,
      attemptsMade: job?.attemptsMade,
    },
  });
});

embeddingWorker.on('error', (err) => {
  workerLogger.error({ err }, 'Embedding worker error');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'embedding',
      type: 'worker-error',
    },
  });
});

// Event handlers for PDF processing worker
pdfProcessingWorker.on('completed', (job) => {
  workerLogger.info({ jobId: job.id }, 'PDF processing job completed successfully');
});

pdfProcessingWorker.on('failed', (job, err) => {
  workerLogger.error({ jobId: job?.id, error: err.message }, 'PDF processing job failed');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'pdf-processing',
      jobId: job?.id,
      queue: 'pdf-processing',
    },
    extra: {
      jobData: job?.data,
      attemptsMade: job?.attemptsMade,
    },
  });
});

pdfProcessingWorker.on('error', (err) => {
  workerLogger.error({ err }, 'PDF processing worker error');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'pdf-processing',
      type: 'worker-error',
    },
  });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  workerLogger.info('SIGTERM received, shutting down workers');
  await scrapingWorker.close();
  await embeddingWorker.close();
  await pdfProcessingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  workerLogger.info('SIGINT received, shutting down workers');
  await scrapingWorker.close();
  await embeddingWorker.close();
  await pdfProcessingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
