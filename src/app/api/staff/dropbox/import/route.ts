/**
 * Dropbox Import API
 *
 * Queues videos from Dropbox for server-side download and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStaffUserFromRequest } from '@/lib/staffAuth';
import { createClient } from '@supabase/supabase-js';
import { scrapingQueue } from '@/lib/queues';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/staff/dropbox/import' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ImportFile {
  id: string;
  name: string;
  path: string;
  size: number;
  downloadUrl: string;
  meetingTitle: string;
  meetingDate: string | null;
  boardOrCommittee: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check staff authentication
    const session = await getStaffUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folderPath, dropboxUrl, files } = body as { folderPath?: string; dropboxUrl?: string; files: ImportFile[] };

    const sourcePath = folderPath || dropboxUrl;

    if (!sourcePath || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Folder path and files are required' },
        { status: 400 }
      );
    }

    log.info({
      staffId: session.user.id,
      fileCount: files.length,
      sourcePath,
    }, 'Starting Dropbox import');

    const results: Array<{ filename: string; videoId?: string; error?: string }> = [];

    for (const file of files) {
      try {
        // Create meeting_videos record
        const { data: video, error: insertError } = await supabase
          .from('meeting_videos')
          .insert({
            uploaded_by: session.user.id,
            original_filename: file.name,
            meeting_title: file.meetingTitle,
            meeting_date: file.meetingDate,
            meeting_description: file.boardOrCommittee,
            file_size_bytes: file.size,
            processing_status: 'pending',
            storage_provider: 'dropbox', // Will be changed to bunny after download
            storage_url: '', // Will be set after download
            dropbox_path: file.path,
            dropbox_shared_link: sourcePath,
          })
          .select()
          .single();

        if (insertError || !video) {
          log.error({ err: insertError, filename: file.name }, 'Failed to create video record');
          results.push({ filename: file.name, error: insertError?.message || 'Failed to create record' });
          continue;
        }

        // Queue job for server-side download and processing
        await scrapingQueue.add(
          'process-dropbox-video',
          {
            videoId: video.id,
            dropboxUrl: sourcePath,
            dropboxPath: file.path,
            filename: file.name,
            meetingTitle: file.meetingTitle,
            meetingDate: file.meetingDate,
            userId: session.user.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 30000, // 30 seconds initial delay
            },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
          }
        );

        log.info({ videoId: video.id, filename: file.name }, 'Queued Dropbox video for processing');
        results.push({ filename: file.name, videoId: video.id });
      } catch (error) {
        log.error({ err: error, filename: file.name }, 'Error queuing file');
        results.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.videoId).length;
    const failed = results.filter(r => r.error).length;

    log.info({
      staffId: session.user.id,
      successful,
      failed,
      total: files.length,
    }, 'Dropbox import complete');

    return NextResponse.json({
      success: true,
      message: `Queued ${successful} videos for processing${failed > 0 ? `, ${failed} failed` : ''}`,
      results,
      summary: {
        total: files.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Dropbox import error');
    return NextResponse.json(
      { error: 'Failed to import from Dropbox' },
      { status: 500 }
    );
  }
}
