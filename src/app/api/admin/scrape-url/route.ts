import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateUrl, startScrapeJob, waitForJob, getJobResults, downloadPDF } from '@/lib/apifyScraper';
import { createDocument, updateDocument, createScrapeJob, updateScrapeJob, storeChunks, markDocumentCompleted, markDocumentFailed } from '@/lib/database';
import { parsePDF } from '@/lib/pdfParser';
import { chunkText } from '@/lib/chunking';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Basic env preflight to fail fast with clear messages
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ message: 'Supabase URL/Anon key not configured' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Scrape API] SUPABASE_SERVICE_ROLE_KEY is not set; DB writes may fail due to RLS');
    }
    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json({ message: 'APIFY_API_TOKEN is not configured' }, { status: 500 });
    }
    if (process.env.USE_STAGEHAND_ACTOR === 'true' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ message: 'OPENAI_API_KEY required when USE_STAGEHAND_ACTOR=true' }, { status: 500 });
    }

    // Check authentication
    const supabase = await getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { message: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { message: validation.error || 'Invalid URL' },
        { status: 400 }
      );
    }

    console.log(`[Scrape API] Starting scrape for: ${url}`);

    // Create document record
    const document = await createDocument({
      source_type: 'url',
      source_url: url,
      title: url,
      created_by: session.user.id,
    });

    // Start processing in the background
    processUrlScraping(document.id, url, session.user.id).catch(error => {
      console.error('[Scrape API] Background processing failed:', error);
    });

    return NextResponse.json({
      message: 'URL scraping started successfully',
      documentId: document.id,
      url,
    });
  } catch (error) {
    console.error('Error in scrape-url endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Process URL scraping in the background
 */
async function processUrlScraping(
  documentId: string,
  url: string,
  userId: string
): Promise<void> {
  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);

    // Start Apify scrape job
    const runId = await startScrapeJob(url, {
      maxDepth: 1,
      maxPages: 5,
      extractPDFs: true,
    });

    // Create scrape job record
    const scrapeJob = await createScrapeJob({
      document_id: documentId,
      url,
      apify_run_id: runId,
    });

    console.log(`[Scrape API] Waiting for Apify job ${runId} to complete...`);

    // Wait for job to complete (with 2 minute timeout - jobs typically finish faster)
    await waitForJob(runId, 120000);

    // Get results
    const results = await getJobResults(runId);

    console.log(`[Scrape API] Retrieved ${results.length} pages from scrape`);

    // Update scrape job
    await updateScrapeJob(scrapeJob.id, {
      apify_status: 'SUCCEEDED',
      pages_crawled: results.length,
      pdfs_found: results.reduce((sum, r) => sum + r.pdfs.length, 0),
      completed_at: new Date().toISOString(),
    } as any);

    // Process all scraped content
    let allChunks: any[] = [];
    let totalTokens = 0;

    // Process text content from pages
    for (const result of results) {
      if (result.text && result.text.length > 100) {
        const chunks = chunkText(result.text, {
          maxTokens: 500,
          overlap: 50,
        });

        chunks.forEach(chunk => {
          allChunks.push({
            ...chunk,
            metadata: {
              ...chunk.metadata,
              source_url: result.url,
              page_title: result.title,
            },
          });
          totalTokens += chunk.tokens;
        });
      }
    }

    // Process PDFs found during scraping
    for (const result of results) {
      for (const pdf of result.pdfs) {
        try {
          console.log(`[Scrape API] Processing PDF: ${pdf.url}`);
          
          const pdfBuffer = await downloadPDF(pdf.url);
          const parsed = await parsePDF(pdfBuffer, pdf.filename);

          const pdfChunks = chunkText(parsed.text, {
            maxTokens: 500,
            overlap: 50,
          });

          pdfChunks.forEach(chunk => {
            allChunks.push({
              ...chunk,
              metadata: {
                ...chunk.metadata,
                source_url: pdf.url,
                source_type: 'pdf',
                pdf_title: parsed.title,
                pdf_pages: parsed.pages,
              },
            });
            totalTokens += chunk.tokens;
          });
        } catch (pdfError) {
          console.error(`[Scrape API] Failed to process PDF ${pdf.url}:`, pdfError);
        }
      }
    }

    // Re-index all chunks
    allChunks = allChunks.map((chunk, index) => ({
      ...chunk,
      index,
    }));

    // Store all chunks
    if (allChunks.length > 0) {
      await storeChunks(documentId, allChunks);
    }

    // Update document with title from first result
    const firstResult = results[0];
    await updateDocument(documentId, {
      title: firstResult?.title || url,
      description: firstResult?.text?.slice(0, 200),
    } as any);

    // Mark document as completed
    await markDocumentCompleted(documentId, allChunks.length, totalTokens);

    console.log(
      `[Scrape API] Completed scraping ${url}: ${allChunks.length} chunks, ${totalTokens} tokens`
    );
  } catch (error) {
    console.error('[Scrape API] Processing failed:', error);
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}
