import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { parsePDF, validatePDFFile } from '@/lib/pdfParser';
import { createDocument, storeChunks, markDocumentCompleted, markDocumentFailed, updateDocument } from '@/lib/database';
import { chunkText } from '@/lib/chunking';
import logger from '@/lib/logger';
import { pdfProcessingQueue } from '@/lib/queues';

// Configure route to handle large file uploads
export const maxDuration = 300; // 5 minutes timeout for large PDFs

export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/upload-pdf' });

  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const contentType = request.headers.get('content-type') || '';

    // Two modes: Direct upload (small files) or Storage path (large files)
    if (contentType.includes('application/json')) {
      // Storage-based upload (for large files)
      const body = await request.json();
      const { storagePath, filename, youtubeUrl } = body;

      if (!storagePath || !filename) {
        return NextResponse.json(
          { message: 'Storage path and filename are required' },
          { status: 400 }
        );
      }

      log.info({ filename, storagePath, youtubeUrl }, 'Starting storage-based PDF processing');

      // Extract YouTube video ID and fetch thumbnail if URL provided
      let thumbnailUrl: string | undefined;
      if (youtubeUrl) {
        try {
          const videoIdMatch = youtubeUrl.match(/(?:v=|\/videos\/|embed\/|youtu\.be\/|\/v\/|watch\?v=|&v=)([^#&?]*)/);
          if (videoIdMatch && videoIdMatch[1]) {
            const videoId = videoIdMatch[1];
            // Use maxresdefault for highest quality
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            log.info({ videoId, thumbnailUrl }, 'Extracted YouTube thumbnail');
          }
        } catch (error) {
          log.warn({ error, youtubeUrl }, 'Failed to extract thumbnail from YouTube URL');
        }
      }

      // Create document record
      const document = await createDocument({
        source_type: 'pdf',
        source_url: youtubeUrl,
        filename: filename,
        title: filename.replace('.pdf', ''),
        thumbnail_url: thumbnailUrl,
        created_by: adminOrError.id,
      } as any);

      // Queue PDF processing job
      const job = await pdfProcessingQueue.add('process-pdf', {
        documentId: document.id,
        storagePath,
        filename,
        userId: adminOrError.id,
      });

      log.info({ jobId: job.id, documentId: document.id }, 'PDF processing job queued');

      return NextResponse.json({
        message: 'PDF processing started successfully',
        documentId: document.id,
        jobId: job.id,
        filename: filename,
      });
    } else {
      // Direct file upload (legacy, for small files)
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { message: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file
      const validation = validatePDFFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { message: validation.error || 'Invalid file' },
          { status: 400 }
        );
      }

      log.info({ filename: file.name }, 'Starting direct PDF upload');

      // Create document record
      const document = await createDocument({
        source_type: 'pdf',
        filename: file.name,
        title: file.name.replace('.pdf', ''),
        created_by: adminOrError.id,
      });

      // Process PDF in the background
      processPDFUpload(document.id, file, adminOrError.id, log).catch(error => {
        log.error({ err: error }, 'Background processing failed');
      });

      return NextResponse.json({
        message: 'PDF upload started successfully',
        documentId: document.id,
        filename: file.name,
      });
    }
  } catch (error) {
    log.error({ err: error }, 'Upload-pdf endpoint error');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process PDF upload in the background (direct upload, legacy)
 */
async function processPDFUpload(
  documentId: string,
  file: File,
  userId: string,
  log: any
): Promise<void> {
  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);

    log.info({ filename: file.name }, 'Parsing PDF');

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF with AI enhancement
    const parsed = await parsePDF(buffer, file.name, true);

    log.info({ textLength: parsed.text.length, pages: parsed.pages }, 'Extracted text from PDF');

    // Chunk the text
    const chunks = chunkText(parsed.text, {
      maxTokens: 350,
      overlap: 75,
      preserveParagraphs: true,
      preserveHeadings: true,
    });

    log.info({ chunksCount: chunks.length }, 'Created chunks');

    // Add PDF metadata to chunks
    const enrichedChunks = chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        source_type: 'pdf',
        filename: file.name,
        pdf_title: parsed.title,
        pdf_pages: parsed.pages,
        ...parsed.metadata,
      },
    }));

    // Calculate total tokens
    const totalTokens = enrichedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);

    // Store chunks
    await storeChunks(documentId, enrichedChunks);

    // Update document with parsed metadata
    await updateDocument(documentId, {
      title: parsed.title || file.name.replace('.pdf', ''),
      description: parsed.description,
    } as any);

    // Mark as completed
    await markDocumentCompleted(documentId, chunks.length, totalTokens);

    log.info(
      { filename: file.name, chunksCount: chunks.length, totalTokens },
      'Completed PDF processing'
    );
  } catch (error) {
    log.error({ err: error }, 'PDF processing failed');
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

