import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
