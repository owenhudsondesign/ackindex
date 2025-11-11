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

    // Check if document exists for this video
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('source_url', videoUrl)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Document not found for video ID: ${videoId}. Please submit the video URL through the YouTube processor first.` },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', document.id);

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
