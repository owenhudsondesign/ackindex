import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({
      cookies
    });

    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    console.log('Staff uploads auth check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionError: sessionError?.message,
      cookies: cookieStore.getAll().map(c => c.name)
    });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized', debug: { hasSession: !!session, sessionError: sessionError?.message } }, { status: 401 });
    }
    const user = session.user;

    // Get user's uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from('meeting_videos')
      .select('*')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false });

    if (uploadsError) {
      console.error('Uploads fetch error:', uploadsError);
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }

    // Get active upload sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('video_upload_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError);
      // Non-fatal
    }

    return NextResponse.json({
      uploads: uploads || [],
      activeSessions: sessions || [],
    });

  } catch (error) {
    console.error('Get uploads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
