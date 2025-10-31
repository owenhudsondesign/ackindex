import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { parsePDF, validatePDFFile } from '@/lib/pdfParser';
import { createDocument, storeChunks, markDocumentCompleted, markDocumentFailed, updateDocument } from '@/lib/database';
import { chunkText } from '@/lib/chunking';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

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

    console.log(`[PDF API] Starting upload for: ${file.name}`);

    // Create document record
    const document = await createDocument({
      source_type: 'pdf',
      filename: file.name,
      title: file.name.replace('.pdf', ''),
      created_by: session.user.id,
    });

    // Process PDF in the background
    processPDFUpload(document.id, file, session.user.id).catch(error => {
      console.error('[PDF API] Background processing failed:', error);
    });

    return NextResponse.json({
      message: 'PDF upload started successfully',
      documentId: document.id,
      filename: file.name,
    });
  } catch (error) {
    console.error('Error in upload-pdf endpoint:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process PDF upload in the background
 */
async function processPDFUpload(
  documentId: string,
  file: File,
  userId: string
): Promise<void> {
  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);

    console.log(`[PDF API] Parsing PDF: ${file.name}`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF with AI enhancement
    const parsed = await parsePDF(buffer, file.name, true);

    console.log(`[PDF API] Extracted ${parsed.text.length} characters from ${parsed.pages} pages`);

    // Chunk the text
    const chunks = chunkText(parsed.text, {
      maxTokens: 500,
      overlap: 50,
      preserveParagraphs: true,
      preserveHeadings: true,
    });

    console.log(`[PDF API] Created ${chunks.length} chunks`);

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

    console.log(
      `[PDF API] Completed processing ${file.name}: ${chunks.length} chunks, ${totalTokens} tokens`
    );
  } catch (error) {
    console.error('[PDF API] Processing failed:', error);
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

