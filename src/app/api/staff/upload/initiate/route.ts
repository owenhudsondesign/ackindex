import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Helper to get user from cookies (same pattern as conversations route)
async function getUserFromRequest() {
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

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return { user: session.user, supabase };
    }
  } catch (error) {
    console.error('Staff initiate - Auth error:', error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromRequest();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, supabase } = auth;

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

    const { data: uploadSession, error: uploadSessionError } = await supabase
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

    if (uploadSessionError) {
      console.error('Session creation error:', uploadSessionError);
      return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: uploadSession.id,
      chunkSize,
      totalChunks,
      expiresAt: uploadSession.expires_at,
    });

  } catch (error) {
    console.error('Initiate upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
