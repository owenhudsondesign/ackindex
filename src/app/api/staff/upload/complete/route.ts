import { NextRequest, NextResponse } from 'next/server';
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
    const { sessionId, uploadToken, storagePath } = body;

    if (!sessionId || !uploadToken) {
      return NextResponse.json({ error: 'Missing sessionId or uploadToken' }, { status: 400 });
    }

    // Authenticate using upload token (not cookies - allows completion after direct upload)
    const { data: uploadSession, error: uploadSessionError } = await supabaseAdmin
      .from('video_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('upload_token', uploadToken)
      .single();

    if (uploadSessionError || !uploadSession) {
      return NextResponse.json({ error: 'Invalid upload session or token' }, { status: 404 });
    }

    // For direct Bunny uploads, the file is already there
    // Just need to register it in the database
    const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;
    const cdnUrl = `${pullZoneUrl}/${storagePath}`;

    console.log('Direct upload complete. CDN URL:', cdnUrl);

    // Create meeting_videos record
    const { data: video, error: videoError } = await supabaseAdmin
      .from('meeting_videos')
      .insert({
        uploaded_by: uploadSession.user_id,
        original_filename: uploadSession.filename,
        file_size_bytes: uploadSession.file_size_bytes,
        meeting_date: uploadSession.meeting_date,
        meeting_type: uploadSession.meeting_type,
        meeting_title: uploadSession.meeting_title,
        meeting_description: uploadSession.meeting_description,
        storage_provider: 'bunny',
        storage_path: storagePath,
        storage_url: cdnUrl,
        public_url: cdnUrl,
        processing_status: 'pending',
        transcription_status: 'pending',
        is_public: false, // Admin must approve
      })
      .select()
      .single();

    if (videoError) {
      console.error('Video record creation error:', videoError);
      await supabaseAdmin
        .from('video_upload_sessions')
        .update({
          status: 'failed',
          error: 'Failed to create video record'
        })
        .eq('id', sessionId);
      return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
    }

    // Update session status
    await supabaseAdmin
      .from('video_upload_sessions')
      .update({
        status: 'completed',
        video_id: video.id,
        chunks_received: 1,
        bytes_uploaded: uploadSession.file_size_bytes,
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: 'Video uploaded successfully.',
    });

  } catch (error) {
    console.error('Complete upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
