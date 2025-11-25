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
    console.log('Admin videos - All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value?.length })));

    // Find the Supabase auth cookie
    const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
    if (!authCookie) {
      console.log('Admin videos - No auth cookie found');
      return null;
    }

    let cookieValue = authCookie.value;
    let accessToken: string;

    console.log('Admin videos - Cookie name:', authCookie.name);
    console.log('Admin videos - Cookie value prefix:', cookieValue.substring(0, 30));

    // Handle "base64-" prefix format - decode the base64 content
    if (cookieValue.startsWith('base64-')) {
      const base64Content = cookieValue.substring(7);
      try {
        cookieValue = Buffer.from(base64Content, 'base64').toString('utf-8');
        console.log('Admin videos - Decoded base64, result prefix:', cookieValue.substring(0, 30));
      } catch (e) {
        console.log('Admin videos - Failed to decode base64:', e);
        return null;
      }
    }

    // Parse the cookie value - could be JSON object, JSON array, or raw JWT
    if (cookieValue.startsWith('{')) {
      // JSON object format: {"access_token": "...", "refresh_token": "..."}
      try {
        const parsed = JSON.parse(cookieValue);
        accessToken = parsed.access_token || parsed.accessToken;
        console.log('Admin videos - Parsed JSON object, token length:', accessToken?.length);
      } catch (e) {
        console.log('Admin videos - Failed to parse as JSON object:', e);
        return null;
      }
    } else if (cookieValue.startsWith('[')) {
      // JSON array format: ["access_token", "refresh_token"]
      try {
        const parsed = JSON.parse(cookieValue);
        accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
        console.log('Admin videos - Parsed JSON array, token length:', accessToken?.length);
      } catch (e) {
        console.log('Admin videos - Failed to parse as JSON array:', e);
        return null;
      }
    } else if (cookieValue.startsWith('eyJ')) {
      // Raw JWT token
      accessToken = cookieValue;
      console.log('Admin videos - Using raw JWT token, length:', accessToken.length);
    } else {
      console.log('Admin videos - Cookie format not recognized, starts with:', cookieValue.substring(0, 10));
      return null;
    }

    if (!accessToken || !accessToken.startsWith('eyJ')) {
      console.log('Admin videos - No valid JWT token found');
      return null;
    }

    // Verify the token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    console.log('Admin videos - Auth result:', { hasUser: !!user, userId: user?.id, error: error?.message });

    if (error || !user) return null;

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Admin videos - Profile role:', profile?.role);

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
    // Note: Don't use foreign key join - fetch user profiles separately if needed
    let query = supabaseAdmin
      .from('meeting_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('is_public', false).eq('processing_status', 'completed');
    } else if (filter === 'approved') {
      query = query.eq('is_public', true);
    } else if (filter === 'processing') {
      query = query.in('processing_status', ['pending', 'processing']);
    }

    const { data: videos, error } = await query;

    console.log('Admin videos API - filtered result count:', videos?.length, 'error:', error?.message);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to load videos' }, { status: 500 });
    }

    // Fetch user profiles for the uploaders
    if (videos && videos.length > 0) {
      const uploaderIds = [...new Set(videos.map(v => v.uploaded_by).filter(Boolean))];

      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', uploaderIds);

        // Create a lookup map
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Merge profiles into videos
        const videosWithProfiles = videos.map(video => ({
          ...video,
          user_profiles: profileMap.get(video.uploaded_by) || null
        }));

        return NextResponse.json({ videos: videosWithProfiles });
      }
    }

    return NextResponse.json({ videos: videos || [] });
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

    if (action === 'process') {
      // Get the video details
      const { data: video, error: videoError } = await supabaseAdmin
        .from('meeting_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      // Check if already completed (allow re-processing of stuck "processing" videos)
      if (video.processing_status === 'completed') {
        return NextResponse.json({
          error: 'Video is already completed',
        }, { status: 400 });
      }

      // Get or create document record
      let documentId = video.document_id;

      if (documentId) {
        // Document exists, check if we need to reset its status
        const { data: existingDoc } = await supabaseAdmin
          .from('documents')
          .select('id, status')
          .eq('id', documentId)
          .single();

        if (existingDoc) {
          // Reset document status to pending for reprocessing
          await supabaseAdmin
            .from('documents')
            .update({ status: 'pending' })
            .eq('id', documentId);
          console.log('Reusing existing document:', documentId);
        } else {
          // Document ID exists in video but document was deleted - clear it
          documentId = null;
        }
      }

      if (!documentId) {
        const { data: document, error: docError } = await supabaseAdmin
          .from('documents')
          .insert({
            source_type: 'url', // Database constraint only allows 'url' or 'pdf'
            source_url: video.storage_url || video.public_url,
            filename: video.original_filename,
            title: video.meeting_title,
            description: video.meeting_description || `${video.meeting_title} - ${new Date(video.meeting_date).toLocaleDateString()}`,
            status: 'pending',
            created_by: video.uploaded_by,
          })
          .select()
          .single();

        if (docError || !document) {
          console.error('Document creation error:', docError);
          return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
        }
        documentId = document.id;

        // Link video to document
        await supabaseAdmin
          .from('meeting_videos')
          .update({ document_id: documentId })
          .eq('id', videoId);
      }

      // Update processing status
      await supabaseAdmin
        .from('meeting_videos')
        .update({ processing_status: 'processing' })
        .eq('id', videoId);

      // Queue the processing job using dynamic import to avoid serverless issues
      try {
        const { scrapingQueue } = await import('@/lib/queues');
        const job = await scrapingQueue.add(
          'process-meeting-video',
          {
            videoId,
            documentId,
            storagePath: video.storage_path,
            storageUrl: video.storage_url || video.public_url,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Video processing started',
          jobId: job.id,
          documentId,
        });
      } catch (queueError) {
        console.error('Queue error:', queueError);
        // Even if queue fails, the status is updated - worker will pick it up
        return NextResponse.json({
          success: true,
          message: 'Video processing initiated (worker will process)',
          documentId,
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
