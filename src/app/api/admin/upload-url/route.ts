import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import logger from '@/lib/logger';

/**
 * Generate presigned upload URL for direct client-side upload to Supabase Storage
 * This bypasses Vercel's 4.5MB serverless function limit
 */
export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/upload-url' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename) {
      return NextResponse.json(
        { message: 'Filename is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (contentType !== 'application/pdf') {
      return NextResponse.json(
        { message: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Generate unique path: userId/timestamp-filename
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${adminOrError.id}/${timestamp}-${sanitizedFilename}`;

    log.info({ filename, storagePath }, 'Generating upload URL');

    // Create a signed URL for upload (valid for 10 minutes)
    const { data, error } = await supabase.storage
      .from('pdfs')
      .createSignedUploadUrl(storagePath);

    if (error) {
      log.error({ err: error }, 'Failed to create signed upload URL');
      return NextResponse.json(
        { message: 'Failed to generate upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      storagePath: storagePath,
      token: data.token,
    });
  } catch (error) {
    log.error({ err: error }, 'Upload-url endpoint error');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
