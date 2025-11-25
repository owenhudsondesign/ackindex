import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create admin client with service role
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

async function getAdminUserFromCookies(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Find the Supabase auth cookie
    const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
    if (!authCookie) return null;

    let accessToken: string;
    const cookieValue = authCookie.value;

    // Parse the cookie value - it's JSON array format ["token", "refresh_token"]
    if (cookieValue.startsWith('[')) {
      const parsed = JSON.parse(cookieValue);
      accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
    } else {
      accessToken = cookieValue;
    }

    // Verify the token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) return null;

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') return null;

    return { id: user.id, email: user.email || '' };
  } catch (error) {
    console.error('Admin auth error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const admin = await getAdminUserFromCookies();
    console.log('Admin videos API - admin check:', { hasAdmin: !!admin, adminId: admin?.id });

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    console.log('Admin videos API - filter:', filter);

    // First, let's see ALL videos without any filter
    const { data: allVideos, error: allError } = await supabaseAdmin
      .from('meeting_videos')
      .select('id, meeting_title, processing_status, is_public, uploaded_by, created_at')
      .order('created_at', { ascending: false });

    console.log('Admin videos API - ALL videos count:', allVideos?.length, 'error:', allError?.message);
    if (allVideos && allVideos.length > 0) {
      console.log('Admin videos API - ALL videos:', allVideos.map(v => ({
        id: v.id.substring(0, 8),
        title: v.meeting_title,
        status: v.processing_status,
        is_public: v.is_public
      })));
    }

    // Build query with service role (bypasses RLS)
    let query = supabaseAdmin
      .from('meeting_videos')
      .select(`
        *,
        user_profiles!meeting_videos_uploaded_by_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('is_public', false).eq('processing_status', 'completed');
    } else if (filter === 'approved') {
      query = query.eq('is_public', true);
    } else if (filter === 'processing') {
      query = query.in('processing_status', ['pending', 'processing']);
    }

    const { data, error } = await query;

    console.log('Admin videos API - filtered result count:', data?.length, 'error:', error?.message);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to load videos' }, { status: 500 });
    }

    return NextResponse.json({ videos: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin
    const admin = await getAdminUserFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, action } = body;

    if (!videoId || !action) {
      return NextResponse.json({ error: 'Missing videoId or action' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error } = await supabaseAdmin
        .from('meeting_videos')
        .update({
          is_public: true,
          approved_by: admin.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', videoId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Video approved' });
    }

    if (action === 'reject') {
      const reason = body.reason || 'Rejected by admin';
      const { error } = await supabaseAdmin
        .from('meeting_videos')
        .update({
          is_archived: true,
          transcription_error: reason,
        })
        .eq('id', videoId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Video archived' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
