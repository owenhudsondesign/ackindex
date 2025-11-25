import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Helper to get user from cookies
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
    console.error('Staff chunk - Auth error:', error);
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

    // Get form data (multipart)
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const chunkFile = formData.get('chunk') as File;

    if (!sessionId || chunkIndex === undefined || !chunkFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get upload session
    const { data: uploadSession, error: uploadSessionError } = await supabase
      .from('video_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id) // Ensure user owns this session
      .single();

    if (uploadSessionError || !uploadSession) {
      return NextResponse.json({ error: 'Invalid or expired upload session' }, { status: 404 });
    }

    // Check if session is still active
    if (uploadSession.status !== 'active') {
      return NextResponse.json({ error: 'Upload session is not active' }, { status: 400 });
    }

    // Check expiration
    if (new Date(uploadSession.expires_at) < new Date()) {
      await supabase
        .from('video_upload_sessions')
        .update({ status: 'failed', error: 'Session expired' })
        .eq('id', sessionId);
      return NextResponse.json({ error: 'Upload session expired' }, { status: 410 });
    }

    // Upload chunk to Supabase Storage
    const chunkPath = `uploads/${sessionId}/chunk_${chunkIndex}`;
    const chunkBuffer = await chunkFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('meeting-videos')
      .upload(chunkPath, chunkBuffer, {
        contentType: 'application/octet-stream',
        upsert: true, // Allow overwrite for retry
      });

    if (uploadError) {
      console.error('Chunk upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload chunk' }, { status: 500 });
    }

    // Update session progress
    const newChunksReceived = uploadSession.chunks_received + 1;
    const newBytesUploaded = uploadSession.bytes_uploaded + chunkFile.size;

    const { error: updateError } = await supabase
      .from('video_upload_sessions')
      .update({
        chunks_received: newChunksReceived,
        bytes_uploaded: newBytesUploaded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Session update error:', updateError);
      // Non-fatal, chunk is uploaded
    }

    return NextResponse.json({
      success: true,
      chunksReceived: newChunksReceived,
      totalChunks: uploadSession.total_chunks,
      bytesUploaded: newBytesUploaded,
      progress: (newChunksReceived / uploadSession.total_chunks) * 100,
    });

  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Increase body size limit for chunks (default is 4MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Allow up to 15MB chunks
    },
  },
};
