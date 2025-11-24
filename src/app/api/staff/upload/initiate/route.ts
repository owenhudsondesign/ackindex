import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is approved staff or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('staff_approved, role')
      .eq('id', user.id)
      .single();

    if (!profile || (!profile.staff_approved && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Not authorized to upload videos' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const {
      filename,
      fileSize,
      mimeType,
      meetingDate,
      meetingTitle,
      meetingDescription,
      chunkSize = 10 * 1024 * 1024, // 10MB default
    } = body;

    // Validation
    if (!filename || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Missing required fields: filename, fileSize, mimeType' }, { status: 400 });
    }

    if (!meetingDate || !meetingTitle) {
      return NextResponse.json({ error: 'Meeting date and title are required' }, { status: 400 });
    }

    // Check file size limit (50GB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB in bytes
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50GB limit' }, { status: 400 });
    }

    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / chunkSize);

    // Create upload session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4); // 4 hour expiry

    const { data: session, error: sessionError } = await supabase
      .from('video_upload_sessions')
      .insert({
        user_id: user.id,
        filename,
        file_size_bytes: fileSize,
        mime_type: mimeType,
        chunk_size: chunkSize,
        total_chunks: totalChunks,
        chunks_received: 0,
        bytes_uploaded: 0,
        meeting_date: meetingDate,
        meeting_type: null, // Simplified - no dropdown for now
        meeting_title: meetingTitle,
        meeting_description: meetingDescription || null,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.id,
      chunkSize,
      totalChunks,
      expiresAt: session.expires_at,
    });

  } catch (error) {
    console.error('Initiate upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
