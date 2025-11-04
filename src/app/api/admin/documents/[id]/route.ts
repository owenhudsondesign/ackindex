import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { deleteDocument } from '@/lib/database';
import logger from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const log = logger.child({ endpoint: '/api/admin/documents/[id]', documentId });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    if (!documentId) {
      return NextResponse.json(
        { message: 'Document ID is required' },
        { status: 400 }
      );
    }

    log.info({ documentId }, 'Deleting document');

    // Delete the document (will cascade delete chunks, embeddings, etc.)
    await deleteDocument(documentId);

    log.info({ documentId }, 'Document deleted successfully');

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to delete document');
    return NextResponse.json(
      { message: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
