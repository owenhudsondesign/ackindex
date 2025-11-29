/**
 * Document Parsing API
 * POST /api/admin/documents/parse - Parse a document using Google Document AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { parseDocument, documentToChunks, isDocumentAIConfigured, getDocumentAIStatus } from '@/lib/documentAI';
import { generateEmbedding } from '@/lib/embeddings';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/documents/parse' });

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Check if Document AI is configured
    if (!isDocumentAIConfigured()) {
      const status = getDocumentAIStatus();
      log.warn('Document AI not configured');
      return NextResponse.json(
        {
          error: 'Google Document AI is not configured',
          status,
          setup: 'Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and GOOGLE_APPLICATION_CREDENTIALS environment variables'
        },
        { status: 503 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const documentType = formData.get('documentType') as string || 'warrant';
    const meetingDate = formData.get('meetingDate') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Document title is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: PDF, PNG, JPEG, TIFF, GIF, WebP` },
        { status: 400 }
      );
    }

    log.info({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      title,
      documentType
    }, 'Processing document upload');

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse with Google Document AI
    const parsed = await parseDocument(buffer, file.type);

    log.info({
      pages: parsed.pages,
      tables: parsed.tables.length,
      textLength: parsed.text.length,
      processingTime: parsed.processingTime
    }, 'Document parsed successfully');

    // Convert to chunks
    const chunks = documentToChunks(parsed);

    log.info({ chunkCount: chunks.length }, 'Document chunked');

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title,
        source_url: null, // No source URL for uploaded docs
        source_type: 'document',
        status: 'processing',
        metadata: {
          documentType,
          meetingDate,
          originalFileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          pages: parsed.pages,
          tables: parsed.tables.length,
          processingTime: parsed.processingTime,
        },
      })
      .select()
      .single();

    if (docError || !document) {
      log.error({ error: docError }, 'Failed to create document record');
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Generate embeddings and store chunks
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk.content);

        // Store chunk with embedding
        const { error: chunkError } = await supabaseAdmin
          .from('document_chunks')
          .insert({
            document_id: document.id,
            content: chunk.content,
            chunk_index: i,
            embedding,
            metadata: {
              type: chunk.type,
              pageNumber: chunk.pageNumber,
              ...chunk.metadata,
            },
          });

        if (chunkError) {
          throw chunkError;
        }

        successCount++;
      } catch (error) {
        log.warn({ error, chunkIndex: i }, 'Failed to process chunk');
        errorCount++;
      }
    }

    // Update document status
    const finalStatus = errorCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');

    await supabaseAdmin
      .from('documents')
      .update({
        status: finalStatus,
        metadata: {
          ...document.metadata,
          chunksProcessed: successCount,
          chunksFailed: errorCount,
        }
      })
      .eq('id', document.id);

    log.info({
      documentId: document.id,
      successCount,
      errorCount,
      status: finalStatus
    }, 'Document processing complete');

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title,
        pages: parsed.pages,
        tables: parsed.tables.length,
        chunks: successCount,
        status: finalStatus,
      },
      parsed: {
        textPreview: parsed.text.substring(0, 500) + (parsed.text.length > 500 ? '...' : ''),
        tables: parsed.tables.map(t => ({
          headers: t.headers,
          rowCount: t.rows.length,
          pageNumber: t.pageNumber,
          confidence: Math.round(t.confidence * 100) + '%',
        })),
      },
    });

  } catch (error) {
    log.error({ error }, 'Document parsing failed');
    return NextResponse.json(
      { error: 'Failed to parse document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check Document AI configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const status = getDocumentAIStatus();

    return NextResponse.json({
      ...status,
      supportedTypes: ALLOWED_MIME_TYPES,
      maxFileSize: MAX_FILE_SIZE,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get Document AI status');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
