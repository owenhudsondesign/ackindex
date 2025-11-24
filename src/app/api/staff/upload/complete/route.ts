import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { bunnyStorage } from '@/lib/bunnyStorage';

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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Get upload session
    const { data: session, error: sessionError } = await supabase
      .from('video_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid upload session' }, { status: 404 });
    }

    // Verify all chunks received
    if (session.chunks_received !== session.total_chunks) {
      return NextResponse.json({
        error: `Incomplete upload: ${session.chunks_received}/${session.total_chunks} chunks received`,
      }, { status: 400 });
    }

    // Update session status
    await supabase
      .from('video_upload_sessions')
      .update({ status: 'assembling' })
      .eq('id', sessionId);

    // Assemble chunks into final file
    // Note: This is a simplified approach - in production you might want to use a background job
    const chunks: Blob[] = [];
    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = `uploads/${sessionId}/chunk_${i}`;
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('meeting-videos')
        .download(chunkPath);

      if (downloadError || !chunkData) {
        console.error(`Failed to download chunk ${i}:`, downloadError);
        await supabase
          .from('video_upload_sessions')
          .update({
            status: 'failed',
            error: `Failed to assemble chunks: chunk ${i} missing`
          })
          .eq('id', sessionId);
        return NextResponse.json({ error: 'Failed to assemble video file' }, { status: 500 });
      }

      chunks.push(chunkData);
    }

    // Combine chunks into single blob
    const finalBlob = new Blob(chunks, { type: session.mime_type });

    // Convert blob to buffer for Bunny upload
    const arrayBuffer = await finalBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Bunny.net
    const bunnyPath = bunnyStorage.generateMeetingPath(
      session.organization_id || 'default', // Use organization_id if multi-tenant
      sessionId,
      session.filename
    );

    console.log('Uploading to Bunny.net:', bunnyPath);

    const uploadResult = await bunnyStorage.uploadVideo(
      fileBuffer,
      bunnyPath,
      {
        contentType: session.mime_type,
      }
    );

    if (!uploadResult.success) {
      console.error('Bunny upload error:', uploadResult.error);
      await supabase
        .from('video_upload_sessions')
        .update({
          status: 'failed',
          error: `Failed to upload to Bunny: ${uploadResult.error}`
        })
        .eq('id', sessionId);
      return NextResponse.json({ error: 'Failed to save video to storage' }, { status: 500 });
    }

    console.log('Bunny upload successful. CDN URL:', uploadResult.cdnUrl);

    // Create meeting_videos record
    const { data: video, error: videoError } = await supabase
      .from('meeting_videos')
      .insert({
        uploaded_by: user.id,
        original_filename: session.filename,
        file_size_bytes: uploadResult.fileSize,
        meeting_date: session.meeting_date,
        meeting_type: session.meeting_type,
        meeting_title: session.meeting_title,
        meeting_description: session.meeting_description,
        storage_provider: 'bunny',
        storage_path: bunnyPath,
        storage_url: uploadResult.cdnUrl, // Use CDN URL for playback
        public_url: uploadResult.cdnUrl,
        processing_status: 'pending',
        transcription_status: 'pending',
        is_public: false, // Admin must approve
      })
      .select()
      .single();

    if (videoError) {
      console.error('Video record creation error:', videoError);
      await supabase
        .from('video_upload_sessions')
        .update({
          status: 'failed',
          error: 'Failed to create video record'
        })
        .eq('id', sessionId);
      return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
    }

    // Update session status
    await supabase
      .from('video_upload_sessions')
      .update({
        status: 'completed',
        video_id: video.id,
      })
      .eq('id', sessionId);

    // Clean up chunks (optional - could be done by background job)
    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = `uploads/${sessionId}/chunk_${i}`;
      await supabase.storage
        .from('meeting-videos')
        .remove([chunkPath]);
    }

    // Automatically trigger transcription processing
    try {
      const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/staff/video/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward auth from current request
          ...(request.headers.get('cookie') ? { 'cookie': request.headers.get('cookie')! } : {}),
        },
        body: JSON.stringify({ videoId: video.id }),
      });

      if (!processResponse.ok) {
        console.error('Failed to trigger video processing:', await processResponse.text());
      }
    } catch (processError) {
      console.error('Error triggering video processing:', processError);
      // Non-fatal - video is uploaded, processing can be triggered manually
    }

    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: 'Video uploaded successfully. Transcription processing started.',
    });

  } catch (error) {
    console.error('Complete upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
