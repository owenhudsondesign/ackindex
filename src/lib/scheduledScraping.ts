/**
 * Shared scheduled scraping logic
 * Used by both the cron endpoint and manual trigger endpoint
 */

import { createClient } from '@supabase/supabase-js';
import { startScrapeJob, waitForJob, getJobResults } from '@/lib/apifyScraper';
import {
  createDocument,
  updateDocument,
  createScrapeJob,
  updateScrapeJob,
  storeChunks,
  markDocumentCompleted,
} from '@/lib/database';
import { chunkText } from '@/lib/chunking';
import { createHash } from 'crypto';

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface ScrapeResults {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Execute scheduled scraping for URLs that are ready
 * This is the main scraping logic used by both cron and manual triggers
 */
export async function executeScheduledScraping(
  batchSize: number = 5
): Promise<ScrapeResults> {
  console.log('[Scheduled Scraping] Starting scrape job...');

  // Get URLs that need scraping using the SQL function
  const { data: urlsToScrape, error: fetchError } = await supabase.rpc(
    'get_urls_for_scraping',
    { batch_size: batchSize }
  );

  if (fetchError) {
    console.error('[Scheduled Scraping] Error fetching URLs:', fetchError);
    throw new Error(`Failed to fetch URLs: ${fetchError.message}`);
  }

  if (!urlsToScrape || urlsToScrape.length === 0) {
    console.log('[Scheduled Scraping] No URLs need scraping at this time');
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };
  }

  console.log(`[Scheduled Scraping] Found ${urlsToScrape.length} URLs to scrape`);

  const results: ScrapeResults = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  // Process each URL
  for (const schedule of urlsToScrape) {
    try {
      console.log(`[Scheduled Scraping] Processing: ${schedule.url}`);

      // Mark as being processed
      await supabase
        .from('scheduled_scrapes')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', schedule.id);

      // Trigger the scrape job
      await processScheduledUrl(schedule);

      results.processed++;
      results.succeeded++;
    } catch (error) {
      console.error(`[Scheduled Scraping] Failed to process ${schedule.url}:`, error);

      // Increment error count and mark as failed if too many errors
      const errorCount = (schedule.error_count || 0) + 1;
      const status = errorCount >= 3 ? 'failed' : 'active';

      await supabase
        .from('scheduled_scrapes')
        .update({
          error_count: errorCount,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          status,
        })
        .eq('id', schedule.id);

      results.processed++;
      results.failed++;
    }
  }

  console.log(
    `[Scheduled Scraping] Completed: ${results.succeeded} succeeded, ${results.failed} failed`
  );

  return results;
}

/**
 * Process a single scheduled URL
 */
async function processScheduledUrl(schedule: {
  id: string;
  url: string;
  title?: string;
  priority: number;
}): Promise<void> {
  try {
    console.log(`[Scheduled Scraping] Starting scrape for: ${schedule.url}`);

    // Check if content has changed (deduplication)
    const shouldScrape = await checkIfShouldScrape(schedule.url);
    if (!shouldScrape) {
      console.log(`[Scheduled Scraping] Content unchanged for ${schedule.url}, skipping...`);
      return;
    }

    // Create or find existing document
    let documentId: string;
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('source_url', schedule.url)
      .single();

    if (existingDoc) {
      documentId = existingDoc.id;
      await updateDocument(documentId, { status: 'processing' } as any);
    } else {
      const { data: scheduleData } = await supabase
        .from('scheduled_scrapes')
        .select('created_by')
        .eq('id', schedule.id)
        .single();

      const document = await createDocument({
        source_type: 'url',
        source_url: schedule.url,
        title: schedule.title || schedule.url,
        created_by: scheduleData?.created_by,
      });
      documentId = document.id;
    }

    // Start Apify scrape job
    const runId = await startScrapeJob(schedule.url, {
      maxDepth: 2,
      maxPages: 20,
      extractPDFs: true,
    });

    // Create scrape job record
    const scrapeJob = await createScrapeJob({
      document_id: documentId,
      url: schedule.url,
      apify_run_id: runId,
    });

    console.log(`[Scheduled Scraping] Waiting for Apify job ${runId} to complete...`);

    // Wait for job to complete (with 5 minute timeout)
    await waitForJob(runId, 300000);

    // Get results
    const results = await getJobResults(runId);

    console.log(`[Scheduled Scraping] Retrieved ${results.length} pages from scrape`);

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
    let fullContent = '';

    // Process text content from pages
    for (const result of results) {
      if (result.text && result.text.length > 100) {
        fullContent += result.text + '\n\n';

        const chunks = chunkText(result.text, {
          maxTokens: 500,
          overlap: 50,
        });

        chunks.forEach((chunk) => {
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

    // Re-index all chunks
    allChunks = allChunks.map((chunk, index) => ({
      ...chunk,
      index,
    }));

    // Store content hash for deduplication
    if (fullContent.length > 0) {
      const contentHash = createHash('sha256').update(fullContent).digest('hex');
      await supabase.from('content_hashes').insert({
        url: schedule.url,
        content_hash: contentHash,
        document_id: documentId,
        chunk_count: allChunks.length,
        content_length: fullContent.length,
      });
    }

    // Store all chunks
    if (allChunks.length > 0) {
      await storeChunks(documentId, allChunks);
    }

    // Update document
    const firstResult = results[0];
    await updateDocument(documentId, {
      title: firstResult?.title || schedule.title || schedule.url,
      description: firstResult?.text?.slice(0, 200),
    } as any);

    // Mark document as completed
    await markDocumentCompleted(documentId, allChunks.length, totalTokens);

    // Reset error count on success
    await supabase
      .from('scheduled_scrapes')
      .update({
        error_count: 0,
        error_message: null,
      })
      .eq('id', schedule.id);

    console.log(
      `[Scheduled Scraping] Completed scraping ${schedule.url}: ${allChunks.length} chunks, ${totalTokens} tokens`
    );
  } catch (error) {
    console.error('[Scheduled Scraping] Processing failed:', error);
    throw error;
  }
}

/**
 * Check if URL should be scraped based on content hash
 * Returns true if content has changed or never been scraped
 */
async function checkIfShouldScrape(url: string): Promise<boolean> {
  try {
    // For now, always scrape (we'll add hash comparison later)
    // This is a placeholder for the deduplication logic
    return true;
  } catch (error) {
    console.error('[Scheduled Scraping] Error checking if should scrape:', error);
    // On error, scrape anyway
    return true;
  }
}

