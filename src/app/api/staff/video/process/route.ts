import { NextRequest, NextResponse } from 'next/server';
import { scrapingQueue } from '@/lib/queues';
import { getStaffUserFromRequest } from '@/lib/staffAuth';
import { createClient } from '@supabase/supabase-js';

// Create a supabase client with service role for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, uploadToken } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    let userId: string;

    // Two auth methods:
    // 1. Upload token (for internal calls from complete endpoint)
    // 2. Cookie-based auth (for manual triggers from UI)
    if (uploadToken) {
      // Verify the upload token matches a session for this video
      const { data: session } = await supabaseAdmin
        .from('video_upload_sessions')
        .select('user_id, video_id')
        .eq('upload_token', uploadToken)
        .eq('video_id', videoId)
        .single();

      if (!session) {
        return NextResponse.json({ error: 'Invalid upload token' }, { status: 401 });
      }
      userId = session.user_id;
    } else {
      // Fall back to cookie auth
      const auth = await getStaffUserFromRequest();
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = auth.user.id;
    }

    // Get video record
    const { data: video, error: videoError } = await supabaseAdmin
      .from('meeting_videos')
      .select('*')
      .eq('id', videoId)
      .eq('uploaded_by', userId) // Ensure user owns this video
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if already processing
    if (video.processing_status === 'processing' || video.processing_status === 'completed') {
      return NextResponse.json({
        error: `Video is already ${video.processing_status}`,
      }, { status: 400 });
    }

    // Create document record for this video
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        source_type: 'url', // Database constraint only allows 'url' or 'pdf'
        source_url: video.storage_url || video.public_url,
        filename: video.original_filename,
        title: video.meeting_title,
        description: video.meeting_description || `${video.meeting_title} - ${new Date(video.meeting_date).toLocaleDateString()}`,
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single();

    if (docError || !document) {
      console.error('Document creation error:', docError);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Link video to document
    await supabaseAdmin
      .from('meeting_videos')
      .update({
        document_id: document.id,
        processing_status: 'processing',
      })
      .eq('id', videoId);

    // Extract audio and start transcription
    // Note: We'll need to download the video, extract audio, and upload to AssemblyAI
    // For now, queue a job to handle this async
    const job = await scrapingQueue.add(
      'process-meeting-video',
      {
        videoId,
        documentId: document.id,
        storagePath: video.storage_path,
        storageUrl: video.storage_url || video.public_url,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100
        removeOnFail: 200, // Keep last 200 failures
      }
    );

    return NextResponse.json({
      success: true,
      documentId: document.id,
      jobId: job.id,
      message: 'Video transcription started',
    });

  } catch (error) {
    console.error('Process video error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
