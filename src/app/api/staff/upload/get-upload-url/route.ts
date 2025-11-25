import { NextRequest, NextResponse } from 'next/server';
import { getStaffUserFromRequest } from '@/lib/staffAuth';
import crypto from 'crypto';

/**
 * Generate a direct upload URL for Bunny.net
 * This allows the browser to upload directly to Bunny, bypassing Vercel's 4.5MB limit
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getStaffUserFromRequest();
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
    } = body;

    // Validation
    if (!filename || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!meetingDate || !meetingTitle) {
      return NextResponse.json({ error: 'Meeting date and title are required' }, { status: 400 });
    }

    // Check file size limit (50GB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50GB limit' }, { status: 400 });
    }

    // Generate unique storage path
    const uploadId = crypto.randomUUID();
    const ext = filename.split('.').pop() || 'mp4';
    const storagePath = `staff-uploads/${user.id}/${uploadId}/original.${ext}`;

    // Generate upload token for verification
    const uploadToken = crypto.randomBytes(32).toString('hex');

    // Create upload session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    const { data: uploadSession, error: sessionError } = await supabase
      .from('video_upload_sessions')
      .insert({
        user_id: user.id,
        filename,
        file_size_bytes: fileSize,
        mime_type: mimeType,
        chunk_size: fileSize, // Single upload, not chunked
        total_chunks: 1,
        chunks_received: 0,
        bytes_uploaded: 0,
        meeting_date: meetingDate,
        meeting_type: null,
        meeting_title: meetingTitle,
        meeting_description: meetingDescription || null,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        upload_token: uploadToken,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
    }

    // Bunny.net configuration
    const storageZone = process.env.BUNNY_STORAGE_ZONE;
    const accessKey = process.env.BUNNY_ACCESS_KEY;
    const storageRegion = process.env.BUNNY_STORAGE_REGION || 'ny';
    const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;

    if (!storageZone || !accessKey || !pullZoneUrl) {
      console.error('Bunny.net not configured');
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    // Construct Bunny storage URL
    const regionPrefix = storageRegion !== 'de' ? `${storageRegion}.` : '';
    const uploadUrl = `https://${regionPrefix}storage.bunnycdn.com/${storageZone}/${storagePath}`;

    return NextResponse.json({
      sessionId: uploadSession.id,
      uploadToken,
      uploadUrl,
      accessKey, // Client needs this to authenticate with Bunny
      storagePath,
      cdnUrl: `${pullZoneUrl}/${storagePath}`,
      expiresAt: uploadSession.expires_at,
    });

  } catch (error) {
    console.error('Get upload URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
