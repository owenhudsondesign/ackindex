import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

// Helper to get user from cookies
async function getUserFromRequest() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Find the Supabase auth token cookie
    const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
    if (!authCookie) return null;

    let cookieValue = authCookie.value;
    let accessToken: string;

    // Handle "base64-" prefix format - decode the base64 content
    if (cookieValue.startsWith('base64-')) {
      const base64Content = cookieValue.substring(7);
      try {
        cookieValue = Buffer.from(base64Content, 'base64').toString('utf-8');
      } catch (e) {
        return null;
      }
    }

    // Parse the cookie value - could be JSON object, JSON array, or raw JWT
    if (cookieValue.startsWith('{')) {
      const parsed = JSON.parse(cookieValue);
      accessToken = parsed.access_token || parsed.accessToken;
    } else if (cookieValue.startsWith('[')) {
      const parsed = JSON.parse(cookieValue);
      accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
    } else if (cookieValue.startsWith('eyJ')) {
      accessToken = cookieValue;
    } else {
      return null;
    }

    if (!accessToken || !accessToken.startsWith('eyJ')) {
      return null;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (user && !error) {
      return { user, supabase: supabaseAdmin };
    }
  } catch (error) {
    console.error('Auth error:', error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromRequest();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    // Get the video to check ownership and status
    const { data: video, error: videoError } = await supabaseAdmin
      .from('meeting_videos')
      .select('*')
      .eq('id', videoId)
      .eq('uploaded_by', auth.user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Don't allow deleting approved (public) videos
    if (video.is_public) {
      return NextResponse.json({ error: 'Cannot delete approved videos' }, { status: 400 });
    }

    // Delete from Bunny CDN if we have a storage path
    if (video.storage_path) {
      try {
        const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE || 'ackindex';
        const bunnyApiKey = process.env.BUNNY_STORAGE_API_KEY;
        const bunnyRegion = process.env.BUNNY_STORAGE_REGION || 'ny';

        const regionEndpoints: Record<string, string> = {
          'ny': 'ny.storage.bunnycdn.com',
          'la': 'la.storage.bunnycdn.com',
          'sg': 'sg.storage.bunnycdn.com',
          'syd': 'syd.storage.bunnycdn.com',
        };
        const endpoint = regionEndpoints[bunnyRegion] || 'storage.bunnycdn.com';

        const deleteUrl = `https://${endpoint}/${bunnyStorageZone}/${video.storage_path}`;
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'AccessKey': bunnyApiKey!,
          },
        });

        if (!deleteResponse.ok) {
          console.warn('Failed to delete from Bunny CDN:', deleteResponse.status);
          // Continue anyway - we'll still delete from DB
        }
      } catch (bunnyError) {
        console.warn('Error deleting from Bunny CDN:', bunnyError);
        // Continue anyway
      }
    }

    // Delete associated document if exists
    if (video.document_id) {
      await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', video.document_id);
    }

    // Delete any upload sessions
    await supabaseAdmin
      .from('video_upload_sessions')
      .delete()
      .eq('video_id', videoId);

    // Delete the video record
    const { error: deleteError } = await supabaseAdmin
      .from('meeting_videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete video error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
