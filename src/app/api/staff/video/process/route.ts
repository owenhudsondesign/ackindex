import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { scrapingQueue } from '@/lib/queues';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    // Get video record
    const { data: video, error: videoError } = await supabase
      .from('meeting_videos')
      .select('*')
      .eq('id', videoId)
      .eq('uploaded_by', user.id) // Ensure user owns this video
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
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        source_type: 'video',
        source_url: video.storage_url || video.public_url,
        filename: video.original_filename,
        title: video.meeting_title,
        description: video.meeting_description || `${video.meeting_title} - ${new Date(video.meeting_date).toLocaleDateString()}`,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (docError || !document) {
      console.error('Document creation error:', docError);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Link video to document
    await supabase
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
