import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { getRecentDocuments } from '@/lib/database';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/documents' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as any;

    // Fetch documents
    const documents = await getRecentDocuments(limit, status);

    return NextResponse.json({
      documents,
      count: documents.length,
    });
  } catch (error) {
    log.error({ err: error }, 'Documents endpoint error');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
