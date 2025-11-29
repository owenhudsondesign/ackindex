/**
 * Batch Document Upload API
 * POST /api/admin/documents/batch - Upload multiple documents with AI metadata extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { parseDocument, documentToChunks, isDocumentAIConfigured } from '@/lib/documentAI';
import { generateEmbedding } from '@/lib/embeddings';
import { claudeComplete } from '@/lib/anthropic';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

const log = logger.child({ endpoint: '/api/admin/documents/batch' });

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/gif',
  'image/webp',
];

interface ExtractedMetadata {
  title: string;
  documentType: 'warrant' | 'budget' | 'agenda' | 'minutes' | 'report' | 'other';
  meetingDate: string | null;
  meetingType: string | null;
  summary: string;
}

/**
 * Use Claude to extract metadata from parsed document text
 */
async function extractMetadataWithAI(text: string, fileName: string): Promise<ExtractedMetadata> {
  const textPreview = text.substring(0, 4000); // First ~4000 chars for context

  const prompt = `Analyze this Nantucket town document and extract metadata. The filename is "${fileName}".

Document text (first portion):
${textPreview}

Based on the content, extract:
1. A clear, descriptive title for this document
2. The document type (warrant, budget, agenda, minutes, report, or other)
3. The meeting date if mentioned (format: YYYY-MM-DD)
4. The meeting type if mentioned (e.g., "Annual Town Meeting", "Special Town Meeting", "Select Board Meeting", etc.)
5. A one-sentence summary of the document's main purpose

Respond ONLY with valid JSON in this exact format:
{
  "title": "Document title here",
  "documentType": "warrant",
  "meetingDate": "2024-04-06",
  "meetingType": "Annual Town Meeting",
  "summary": "Brief summary here"
}

If a field cannot be determined, use null for dates/meetingType, or make a reasonable inference for title/documentType/summary.`;

  try {
    const response = await claudeComplete(prompt, {
      maxTokens: 500,
      temperature: 0.3,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: parsed.title || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      documentType: ['warrant', 'budget', 'agenda', 'minutes', 'report', 'other'].includes(parsed.documentType)
        ? parsed.documentType
        : 'other',
      meetingDate: parsed.meetingDate || null,
      meetingType: parsed.meetingType || null,
      summary: parsed.summary || '',
    };
  } catch (error) {
    log.warn({ error, fileName }, 'Failed to extract metadata with AI, using defaults');

    // Fallback: infer from filename
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const lowerName = nameWithoutExt.toLowerCase();

    let documentType: ExtractedMetadata['documentType'] = 'other';
    if (lowerName.includes('warrant')) documentType = 'warrant';
    else if (lowerName.includes('budget')) documentType = 'budget';
    else if (lowerName.includes('agenda')) documentType = 'agenda';
    else if (lowerName.includes('minutes')) documentType = 'minutes';
    else if (lowerName.includes('report')) documentType = 'report';

    return {
      title: nameWithoutExt,
      documentType,
      meetingDate: null,
      meetingType: null,
      summary: '',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    if (!isDocumentAIConfigured()) {
      return NextResponse.json(
        { error: 'Google Document AI is not configured' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    log.info({ fileCount: files.length }, 'Starting batch document upload');

    const results: Array<{
      fileName: string;
      success: boolean;
      document?: {
        id: string;
        title: string;
        documentType: string;
        meetingDate: string | null;
        pages: number;
        tables: number;
        chunks: number;
      };
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            fileName: file.name,
            success: false,
            error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
          });
          continue;
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          results.push({
            fileName: file.name,
            success: false,
            error: `Unsupported file type: ${file.type}`,
          });
          continue;
        }

        log.info({ fileName: file.name, fileSize: file.size }, 'Processing file');

        // Parse document
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const parsed = await parseDocument(buffer, file.type);

        // Extract metadata with AI
        const metadata = await extractMetadataWithAI(parsed.text, file.name);

        log.info({
          fileName: file.name,
          extractedTitle: metadata.title,
          documentType: metadata.documentType
        }, 'Metadata extracted');

        // Create chunks
        const chunks = documentToChunks(parsed);

        // Create document record
        const { data: document, error: docError } = await supabaseAdmin
          .from('documents')
          .insert({
            title: metadata.title,
            source_url: null,
            source_type: 'document',
            status: 'processing',
            metadata: {
              documentType: metadata.documentType,
              meetingDate: metadata.meetingDate,
              meetingType: metadata.meetingType,
              summary: metadata.summary,
              originalFileName: file.name,
              mimeType: file.type,
              fileSize: file.size,
              pages: parsed.pages,
              tables: parsed.tables.length,
              processingTime: parsed.processingTime,
              batchUpload: true,
            },
          })
          .select()
          .single();

        if (docError || !document) {
          results.push({
            fileName: file.name,
            success: false,
            error: 'Failed to create document record',
          });
          continue;
        }

        // Generate embeddings and store chunks
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          try {
            const embedding = await generateEmbedding(chunk.content);
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

            if (chunkError) throw chunkError;
            successCount++;
          } catch {
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

        results.push({
          fileName: file.name,
          success: true,
          document: {
            id: document.id,
            title: metadata.title,
            documentType: metadata.documentType,
            meetingDate: metadata.meetingDate,
            pages: parsed.pages,
            tables: parsed.tables.length,
            chunks: successCount,
          },
        });

        log.info({
          fileName: file.name,
          documentId: document.id,
          chunks: successCount
        }, 'File processed successfully');

      } catch (error) {
        log.error({ error, fileName: file.name }, 'Failed to process file');
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    log.info({ successCount, failCount, total: files.length }, 'Batch upload complete');

    return NextResponse.json({
      success: failCount === 0,
      processed: files.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });

  } catch (error) {
    log.error({ error }, 'Batch upload failed');
    return NextResponse.json(
      { error: 'Batch upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
