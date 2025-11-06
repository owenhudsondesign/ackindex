import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import * as Sentry from '@sentry/node';
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
import { createLogger } from '@/lib/logger';

// Create logger for worker operations
const workerLogger = createLogger({ component: 'worker' });

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

// Interface for PDF processing job data
interface PDFProcessingJobData {
  documentId: string;
  storagePath: string;
  filename: string;
  userId: string;
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
  const log = workerLogger.child({ jobId: job.id, documentId, userId, url });

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

    log.info({ runId }, 'Waiting for Apify job to complete');
    await job.updateProgress(20);

    // Wait for job to complete (with 2 minute timeout)
    await waitForJob(runId, 120000);
    await job.updateProgress(40);

    // Get results
    const results = await getJobResults(runId);
    log.info({ pagesRetrieved: results.length }, 'Retrieved pages from scrape');

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
          log.info({ pdfUrl: pdf.url }, 'Processing PDF');

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
          log.error({ err: pdfError, pdfUrl: pdf.url }, 'Failed to process PDF');
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

    log.info(
      { chunksCount: allChunks.length, totalTokens },
      'Completed scraping successfully'
    );
  } catch (error) {
    log.error({ err: error }, 'Processing failed');
    await markDocumentFailed(
      documentId,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    throw error; // Re-throw so BullMQ knows it failed
  }
}

/**
 * Process PDF from storage
 */
async function processPDFFromStorage(
  documentId: string,
  storagePath: string,
  filename: string,
  userId: string,
  job: Job
): Promise<void> {
  const log = workerLogger.child({ jobId: job.id, documentId, userId, filename });

  try {
    // Update status to processing
    await updateDocument(documentId, { status: 'processing' } as any);
    await job.updateProgress(5);

    log.info({ filename, storagePath }, 'Downloading PDF from storage');

    // Create Supabase admin client for storage access
    const { createClient } = require('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('pdfs')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download PDF from storage: ${downloadError.message}`);
    }

    await job.updateProgress(20);

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    log.info({ filename, size: buffer.length }, 'Downloaded PDF, parsing');
    await job.updateProgress(30);

    // Parse PDF with AI enhancement
    const parsed = await parsePDF(buffer, filename, true);

    log.info({ textLength: parsed.text.length, pages: parsed.pages }, 'Extracted text from PDF');
    await job.updateProgress(50);

    // Chunk the text
    const chunks = chunkText(parsed.text, {
      maxTokens: 500,
      overlap: 50,
      preserveParagraphs: true,
      preserveHeadings: true,
    });

    log.info({ chunksCount: chunks.length }, 'Created chunks');
    await job.updateProgress(60);

    // Add PDF metadata to chunks
    const enrichedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      index,
      metadata: {
        ...chunk.metadata,
        source_type: 'pdf',
        filename: filename,
        pdf_title: parsed.title,
        pdf_pages: parsed.pages,
        ...parsed.metadata,
      },
    }));

    // Calculate total tokens
    const totalTokens = enrichedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);

    // Store chunks
    await storeChunks(documentId, enrichedChunks);
    await job.updateProgress(70);

    // Update document with parsed metadata
    await updateDocument(documentId, {
      title: parsed.title || filename.replace('.pdf', ''),
      description: parsed.description,
    } as any);
    await job.updateProgress(75);

    // Queue embedding generation for the chunks
    const { embeddingQueue } = await import('./queues');
    await embeddingQueue.add(
      'generate-embeddings',
      {
        chunks: enrichedChunks.map(chunk => ({
          id: `${documentId}-${chunk.index}`,
          content: chunk.content,
        })),
      },
      {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );

    log.info({ chunksCount: enrichedChunks.length }, 'Queued embedding generation');
    await job.updateProgress(85);

    // Mark as completed
    await markDocumentCompleted(documentId, chunks.length, totalTokens);
    await job.updateProgress(95);

    // Clean up storage
    await supabaseClient.storage.from('pdfs').remove([storagePath]);

    await job.updateProgress(100);

    log.info(
      { filename, chunksCount: chunks.length, totalTokens },
      'Completed PDF processing from storage'
    );
  } catch (error) {
    log.error({ err: error }, 'PDF processing from storage failed');
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

    workerLogger.info({ jobId: job.id, url }, 'Starting scraping job');

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

    workerLogger.info({ jobId: job.id, chunksCount: chunks.length }, 'Starting embedding job');

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
        workerLogger.error({ err: error, chunkId: chunks[i].id }, 'Failed to update chunk');
      }
      await job.updateProgress(50 + (i / chunks.length) * 50);
    }

    workerLogger.info(
      { jobId: job.id, successCount, totalChunks: chunks.length },
      'Completed embedding job'
    );

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

/**
 * PDF Processing Worker
 * Processes PDF uploads from storage
 */
export const pdfProcessingWorker = new Worker<PDFProcessingJobData>(
  'pdf-processing',
  async (job) => {
    const { documentId, storagePath, filename, userId } = job.data;

    workerLogger.info({ jobId: job.id, filename }, 'Starting PDF processing job');

    await processPDFFromStorage(documentId, storagePath, filename, userId, job);

    return { success: true, documentId, filename };
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process max 3 PDFs at once
    lockDuration: 600000, // 10 minutes lock for large PDFs
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute (rate limit OpenAI for embeddings)
    },
  }
);

// Event handlers for scraping worker
scrapingWorker.on('completed', (job) => {
  workerLogger.info({ jobId: job.id }, 'Scraping job completed successfully');
});

scrapingWorker.on('failed', (job, err) => {
  workerLogger.error({ jobId: job?.id, error: err.message }, 'Scraping job failed');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'scraping',
      jobId: job?.id,
      queue: 'scraping',
    },
    extra: {
      jobData: job?.data,
      attemptsMade: job?.attemptsMade,
    },
  });
});

scrapingWorker.on('error', (err) => {
  workerLogger.error({ err }, 'Scraping worker error');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'scraping',
      type: 'worker-error',
    },
  });
});

// Event handlers for embedding worker
embeddingWorker.on('completed', (job) => {
  workerLogger.info({ jobId: job.id }, 'Embedding job completed successfully');
});

embeddingWorker.on('failed', (job, err) => {
  workerLogger.error({ jobId: job?.id, error: err.message }, 'Embedding job failed');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'embedding',
      jobId: job?.id,
      queue: 'embedding',
    },
    extra: {
      jobData: job?.data,
      attemptsMade: job?.attemptsMade,
    },
  });
});

embeddingWorker.on('error', (err) => {
  workerLogger.error({ err }, 'Embedding worker error');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'embedding',
      type: 'worker-error',
    },
  });
});

// Event handlers for PDF processing worker
pdfProcessingWorker.on('completed', (job) => {
  workerLogger.info({ jobId: job.id }, 'PDF processing job completed successfully');
});

pdfProcessingWorker.on('failed', (job, err) => {
  workerLogger.error({ jobId: job?.id, error: err.message }, 'PDF processing job failed');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'pdf-processing',
      jobId: job?.id,
      queue: 'pdf-processing',
    },
    extra: {
      jobData: job?.data,
      attemptsMade: job?.attemptsMade,
    },
  });
});

pdfProcessingWorker.on('error', (err) => {
  workerLogger.error({ err }, 'PDF processing worker error');

  // Send to Sentry
  Sentry.captureException(err, {
    tags: {
      worker: 'pdf-processing',
      type: 'worker-error',
    },
  });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  workerLogger.info('SIGTERM received, shutting down workers');
  await scrapingWorker.close();
  await embeddingWorker.close();
  await pdfProcessingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  workerLogger.info('SIGINT received, shutting down workers');
  await scrapingWorker.close();
  await embeddingWorker.close();
  await pdfProcessingWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
