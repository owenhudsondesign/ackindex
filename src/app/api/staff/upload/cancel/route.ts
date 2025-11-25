import { NextRequest, NextResponse } from 'next/server';
import { getStaffUserFromRequest } from '@/lib/staffAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getStaffUserFromRequest();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, supabase } = auth;

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Get upload session
    const { data: uploadSession, error: uploadSessionError } = await supabase
      .from('video_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (uploadSessionError || !uploadSession) {
      return NextResponse.json({ error: 'Invalid upload session' }, { status: 404 });
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('video_upload_sessions')
      .update({
        status: 'cancelled',
        error: 'Upload cancelled by user',
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Cancel update error:', updateError);
      return NextResponse.json({ error: 'Failed to cancel upload' }, { status: 500 });
    }

    // Clean up uploaded chunks
    try {
      for (let i = 0; i < uploadSession.chunks_received; i++) {
        const chunkPath = `uploads/${sessionId}/chunk_${i}`;
        await supabase.storage
          .from('meeting-videos')
          .remove([chunkPath]);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      // Non-fatal, session is cancelled anyway
    }

    return NextResponse.json({
      success: true,
      message: 'Upload cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
