import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  startScrapeJob,
  waitForJob,
  getJobResults,
  downloadPDF
} from '@/lib/apifyScraper';
import {
  updateDocument,
  createScrapeJob,
  updateScrapeJob,
  storeChunks,
  markDocumentCompleted,
  markDocumentFailed,
  updateChunkEmbedding,
} from '@/lib/database';
import { parsePDF } from '@/lib/pdfParser';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddingsBatch } from '@/lib/embeddings';

// Redis connection for Upstash
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
});

// Interface for scraping job data
interface ScrapingJobData {
  documentId: string;
  url: string;
  userId: string;
}

// Interface for embedding job data
interface EmbeddingJobData {
  chunks: Array<{
    id: string;
    content: string;
  }>;
}

/**
 * Process URL scraping - extracted from scrape-url route for reusability
 */
async function processUrlScraping(
  documentId: string,
  url: string,
  userId: string,
  job: Job
): Promise<void> {
  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);
    await job.updateProgress(10);

    // Start Apify scrape job
    const runId = await startScrapeJob(url, {
      maxDepth: 2,
      maxPages: 20,
      extractPDFs: true,
    });

    // Create scrape job record
    const scrapeJob = await createScrapeJob({
      document_id: documentId,
      url,
      apify_run_id: runId,
    });

    console.log(`[Worker] Waiting for Apify job ${runId} to complete...`);
    await job.updateProgress(20);

    // Wait for job to complete (with 2 minute timeout)
    await waitForJob(runId, 120000);
    await job.updateProgress(40);

    // Get results
    const results = await getJobResults(runId);
    console.log(`[Worker] Retrieved ${results.length} pages from scrape`);

    // Update scrape job
    await updateScrapeJob(scrapeJob.id, {
      apify_status: 'SUCCEEDED',
      pages_crawled: results.length,
      pdfs_found: results.reduce((sum, r) => sum + r.pdfs.length, 0),
      completed_at: new Date().toISOString(),
    } as any);

    await job.updateProgress(50);

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

    await job.updateProgress(70);

    // Process PDFs found during scraping
    for (const result of results) {
      for (const pdf of result.pdfs) {
        try {
          console.log(`[Worker] Processing PDF: ${pdf.url}`);

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
          console.error(`[Worker] Failed to process PDF ${pdf.url}:`, pdfError);
        }
      }
    }

    await job.updateProgress(85);

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

    await job.updateProgress(100);

    console.log(
      `[Worker] Completed scraping ${url}: ${allChunks.length} chunks, ${totalTokens} tokens`
    );
  } catch (error) {
    console.error('[Worker] Processing failed:', error);
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    throw error; // Re-throw so BullMQ knows it failed
  }
}

/**
 * Scraping Worker
 * Processes web scraping jobs
 */
export const scrapingWorker = new Worker<ScrapingJobData>(
  'scraping',
  async (job) => {
    const { documentId, url, userId } = job.data;

    console.log(`[Worker] Starting scraping job ${job.id} for URL: ${url}`);

    await processUrlScraping(documentId, url, userId, job);

    return { success: true, documentId, url };
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process max 5 scraping jobs at once
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (rate limit Apify)
    },
  }
);

/**
 * Embedding Worker
 * Processes embedding generation jobs
 */
export const embeddingWorker = new Worker<EmbeddingJobData>(
  'embedding',
  async (job) => {
    const { chunks } = job.data;

    console.log(`[Worker] Starting embedding job ${job.id} for ${chunks.length} chunks`);

    await job.updateProgress(10);

    // Generate embeddings
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddingsBatch(texts);

    await job.updateProgress(50);

    // Update database
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        await updateChunkEmbedding(chunks[i].id, embeddings[i]);
        successCount++;
      } catch (error) {
        console.error(`[Worker] Failed to update chunk ${chunks[i].id}:`, error);
      }
      await job.updateProgress(50 + (i / chunks.length) * 50);
    }

    console.log(`[Worker] Completed embedding job ${job.id}: ${successCount}/${chunks.length} chunks processed`);

    return { success: true, processed: successCount, total: chunks.length };
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process max 2 embedding jobs at once
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute (rate limit OpenAI)
    },
  }
);

// Event handlers for scraping worker
scrapingWorker.on('completed', (job) => {
  console.log(`[Worker] Scraping job ${job.id} completed successfully`);
});

scrapingWorker.on('failed', (job, err) => {
  console.error(`[Worker] Scraping job ${job?.id} failed:`, err.message);
});

scrapingWorker.on('error', (err) => {
  console.error('[Worker] Scraping worker error:', err);
});

// Event handlers for embedding worker
embeddingWorker.on('completed', (job) => {
  console.log(`[Worker] Embedding job ${job.id} completed successfully`);
});

embeddingWorker.on('failed', (job, err) => {
  console.error(`[Worker] Embedding job ${job?.id} failed:`, err.message);
});

embeddingWorker.on('error', (err) => {
  console.error('[Worker] Embedding worker error:', err);
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down workers...');
  await scrapingWorker.close();
  await embeddingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down workers...');
  await scrapingWorker.close();
  await embeddingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
