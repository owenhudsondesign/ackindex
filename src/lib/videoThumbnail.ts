/**
 * Video Thumbnail Extraction
 *
 * Uses ffmpeg CLI to extract a frame from a video for use as a thumbnail.
 * Requires ffmpeg to be installed on the system (available on Railway).
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { bunnyStorage } from './bunnyStorage';
import logger from './logger';
import { createClient } from '@supabase/supabase-js';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ThumbnailResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Check if ffmpeg is available on the system
 */
async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract a thumbnail from a video file at a specific time
 *
 * @param videoPath - Local path to the video file
 * @param timestampSeconds - Time in seconds to extract frame (default: 10)
 * @returns Result with thumbnail CDN URL
 */
export async function extractVideoThumbnail(
  videoPath: string,
  timestampSeconds: number = 10
): Promise<ThumbnailResult> {
  const tempDir = join(tmpdir(), 'ackindex-thumbnails');
  const tempId = randomUUID();
  const tempOutputPath = join(tempDir, `${tempId}.jpg`);

  try {
    // Check if ffmpeg is available
    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      logger.warn('ffmpeg not available, skipping thumbnail extraction');
      return {
        success: false,
        error: 'ffmpeg not installed',
      };
    }

    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    logger.info({ videoPath, timestampSeconds }, 'Extracting video thumbnail');

    // Extract frame using ffmpeg CLI
    // -ss: seek to timestamp (before input for faster seeking)
    // -i: input file
    // -vframes 1: extract only 1 frame
    // -vf: video filter for scaling to 1280x720 with padding
    // -q:v 2: high quality JPEG
    const ffmpegCmd = `ffmpeg -ss ${timestampSeconds} -i "${videoPath}" -vframes 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -q:v 2 -y "${tempOutputPath}"`;

    await execAsync(ffmpegCmd, { timeout: 30000 }); // 30 second timeout

    // Read the extracted frame
    const thumbnailBuffer = await readFile(tempOutputPath);

    // Generate storage path
    const storagePath = `thumbnails/${tempId}.jpg`;

    // Upload to Bunny CDN
    const uploadResult = await bunnyStorage.uploadVideo(
      thumbnailBuffer,
      storagePath,
      { contentType: 'image/jpeg' }
    );

    // Clean up temp file
    await unlink(tempOutputPath).catch(() => {});

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload thumbnail');
    }

    logger.info({ thumbnailUrl: uploadResult.cdnUrl }, 'Thumbnail extracted and uploaded');

    return {
      success: true,
      thumbnailUrl: uploadResult.cdnUrl,
    };
  } catch (error) {
    // Clean up temp file on error
    await unlink(tempOutputPath).catch(() => {});

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, videoPath }, 'Failed to extract thumbnail');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Extract and save thumbnail for a meeting video
 *
 * @param videoId - Meeting video ID
 * @param videoPath - Local path to the video file
 * @param documentId - Associated document ID (optional, for blog post thumbnail)
 */
export async function extractAndSaveThumbnail(
  videoId: string,
  videoPath: string,
  documentId?: string
): Promise<string | null> {
  try {
    // Extract thumbnail at 10 seconds (usually past any intro)
    let result = await extractVideoThumbnail(videoPath, 10);

    if (!result.success || !result.thumbnailUrl) {
      // Try again at 30 seconds if first attempt failed
      result = await extractVideoThumbnail(videoPath, 30);
      if (!result.success || !result.thumbnailUrl) {
        logger.warn({ videoId, error: result.error }, 'Failed to extract thumbnail after retry');
        return null;
      }
    }

    // Update document thumbnail if documentId provided
    if (documentId) {
      const { error: docError } = await supabase
        .from('documents')
        .update({ thumbnail_url: result.thumbnailUrl })
        .eq('id', documentId);

      if (docError) {
        logger.error({ error: docError, documentId }, 'Failed to update document thumbnail');
      }

      // Update any associated blog post
      const { error: blogError } = await supabase
        .from('blog_posts')
        .update({
          thumbnail_url: result.thumbnailUrl,
          og_image_url: result.thumbnailUrl,
        })
        .eq('document_id', documentId);

      if (blogError && blogError.code !== 'PGRST116') {
        // Ignore 'no rows returned' error - blog post may not exist yet
        logger.error({ error: blogError, documentId }, 'Failed to update blog post thumbnail');
      }
    } else {
      logger.warn({ videoId }, 'No documentId provided, cannot save thumbnail');
    }

    logger.info({ videoId, thumbnailUrl: result.thumbnailUrl }, 'Thumbnail saved successfully');
    return result.thumbnailUrl;
  } catch (error) {
    logger.error({ error, videoId }, 'Failed to extract and save thumbnail');
    return null;
  }
}
