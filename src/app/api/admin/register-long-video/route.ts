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
      data: { user },
    } = await supabaseClient.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) {
      console.log('[register-long-video] Auth failed');
      return adminOrError;
    }

    console.log('[register-long-video] Auth successful');

    const { title, youtubeUrl, transcriptId, fileName } = await req.json();
    console.log('[register-long-video] Params:', { title, youtubeUrl, transcriptId, fileName });

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    // Create document for this audio file
    console.log('Creating document with title:', title);
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        title: title.trim(),
        source_url: youtubeUrl?.trim() || null, // Store YouTube URL if provided
        source_type: 'url', // Keep as 'url' for compatibility
        status: 'processing',
        total_chunks: 0,
      })
      .select('id, title, status')
      .single();

    if (createError || !document) {
      console.error('Failed to create document:', createError);
      return NextResponse.json(
        { error: `Failed to create document record: ${createError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('Document created successfully:', document.id);

    // Update status to processing (if not already set during creation)
    if (document.status !== 'processing') {
      await supabase
        .from('documents')
        .update({ status: 'processing' })
        .eq('id', document.id);
    }

    // Queue a job to poll for completion
    console.log('[register-long-video] Queueing job with:', {
      documentId: document.id,
      transcriptId,
      fileName,
    });

    const job = await scrapingQueue.add('process-long-video', {
      documentId: document.id,
      transcriptId,
      fileName: fileName || 'audio.mp3',
    });

    console.log('[register-long-video] Job queued successfully:', job.id);
    console.log('[register-long-video] Document created with ID:', document.id);

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
