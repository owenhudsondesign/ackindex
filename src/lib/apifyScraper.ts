/**
 * Apify Web Scraping Utilities
 * 
 * Handles website crawling and PDF extraction using Apify actors.
 */

import { ApifyClient } from 'apify-client';
import { cleanText } from './chunking';

// Initialize Apify client with error handling
function getApifyClient() {
  if (!process.env.APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN is not configured in environment variables');
  }
  
  return new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
  });
}

export interface ScrapedContent {
  url: string;
  title?: string;
  text: string;
  pdfs: Array<{
    url: string;
    filename: string;
  }>;
  tables?: Array<{
    page: number;
    table_index: number;
    rows: number;
    cols: number;
    data: any[][];
    headers: any[];
    body: any[][];
  }>;
  metadata: Record<string, any>;
}

export interface ScrapeOptions {
  maxDepth?: number;
  maxPages?: number;
  followLinks?: boolean;
  extractPDFs?: boolean;
}

/**
 * Start a web scraping job with Apify
 * 
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns Run ID for tracking
 */
export async function startScrapeJob(
  url: string,
  options: ScrapeOptions = {}
): Promise<string> {
  const {
    maxDepth = 2,
    maxPages = 50,
    followLinks = true,
    extractPDFs = true,
  } = options;

  console.log(`[Apify] Starting scrape job for: ${url}`);

  try {
    const apifyClient = getApifyClient();
    
    // Use custom PDF scraper actor with table extraction
    const actorId = process.env.APIFY_ACTOR_ID || 'ackindex-pdf-actor';

    console.log(`[Apify] Using custom actor: ${actorId}`);
    
    // Custom actor with table extraction
    console.log('[Apify] Using custom PDF scraper with table extraction');
    const runConfig = {
      startUrls: [{ url }],
      downloadPdfs: extractPDFs,
      maxCrawlDepth: maxDepth,
      maxRequests: maxPages,
      proxyConfiguration: {
        useApifyProxy: false, // Custom actor doesn't need proxy
      },
    };
    
    const run = await apifyClient.actor(actorId).call(runConfig);

    console.log(`[Apify] Job started with run ID: ${run.id}`);
    return run.id;
  } catch (error) {
    console.error('[Apify] Failed to start scrape job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to start web scraping job: ${errorMessage}`);
  }
}

/**
 * Check the status of a scraping job
 */
export async function checkJobStatus(runId: string): Promise<{
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
  statusMessage?: string;
}> {
  try {
    const apifyClient = getApifyClient();
    const run = await apifyClient.run(runId).get();
    
    return {
      status: run?.status as any,
      statusMessage: run?.statusMessage,
    };
  } catch (error) {
    console.error('[Apify] Failed to check job status:', error);
    throw new Error('Failed to check scraping job status');
  }
}

/**
 * Wait for a scraping job to complete
 */
export async function waitForJob(
  runId: string,
  timeoutMs: number = 120000 // 2 minutes
): Promise<void> {
  const startTime = Date.now();
  let lastStatus = '';
  
  while (Date.now() - startTime < timeoutMs) {
    const { status } = await checkJobStatus(runId);
    
    if (status !== lastStatus) {
      console.log(`[Apify] Job ${runId} status: ${status}`);
      lastStatus = status;
    }
    
    if (status === 'SUCCEEDED') {
      console.log(`[Apify] Job ${runId} completed successfully`);
      return;
    }
    
    if (status === 'FAILED' || status === 'TIMED-OUT' || status === 'ABORTED') {
      throw new Error(`Scraping job ${status.toLowerCase()}`);
    }
    
    // Wait 3 seconds before checking again (more frequent updates)
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  throw new Error('Scraping job timed out');
}

/**
 * Get the results from a completed scraping job
 */
export async function getJobResults(runId: string): Promise<ScrapedContent[]> {
  console.log(`[Apify] Fetching results for job: ${runId}`);

  try {
    const apifyClient = getApifyClient();
    const { items } = await apifyClient.dataset(runId).listItems();
    
    console.log(`[Apify] Dataset has ${items.length} items`);
    
    const results: ScrapedContent[] = [];
    
    for (const item of items as any[]) {
      console.log(`[Apify] Processing item:`, JSON.stringify(item).substring(0, 300));
      
      // Handle different item types from custom actor
      if (item.type === 'page') {
        // Regular page data
        const content: ScrapedContent = {
          url: item.url || '',
          title: item.title || extractTitleFromUrl(item.url || ''),
          text: '',
          pdfs: [],
          tables: [],
          metadata: {
            crawledAt: new Date().toISOString(),
            pdf_count: item.pdf_count || 0,
          },
        };
        
        if (content.url) {
          results.push(content);
        }
      } else if (item.status === 'success' && item.full_text) {
        // PDF data with extracted content and tables
        const content: ScrapedContent = {
          url: item.url || '',
          title: item.text || extractFilenameFromUrl(item.url || ''),
          text: cleanText(item.full_text || ''),
          pdfs: [{
            url: item.url || '',
            filename: extractFilenameFromUrl(item.url || ''),
          }],
          tables: item.tables || [],
          metadata: {
            crawledAt: new Date().toISOString(),
            num_pages: item.num_pages || 0,
            total_tables: item.total_tables || 0,
            parser: item.parser || 'unknown',
            source_page: item.source_page || '',
            ...item.metadata,
          },
        };
        
        if (content.text.length > 100 || content.tables.length > 0) {
          results.push(content);
          console.log(`[Apify] Added PDF with ${content.tables.length} tables`);
        }
      } else if (item.url && item.url.toLowerCase().endsWith('.pdf')) {
        // PDF link without content
        const content: ScrapedContent = {
          url: item.url,
          title: item.text || extractFilenameFromUrl(item.url),
          text: '',
          pdfs: [{
            url: item.url,
            filename: extractFilenameFromUrl(item.url),
          }],
          tables: [],
          metadata: {
            crawledAt: new Date().toISOString(),
            source_page: item.source_page || '',
          },
        };
        
        results.push(content);
      }
    }
    
    console.log(`[Apify] Retrieved ${results.length} pages with content`);
    return results;
  } catch (error) {
    console.error('[Apify] Failed to get job results:', error);
    throw new Error('Failed to retrieve scraping results');
  }
}

/**
 * Download a PDF file from a URL
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  try {
    console.log(`[Apify] Downloading PDF from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('pdf')) {
      throw new Error('URL does not point to a PDF file');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Apify] Failed to download PDF:', error);
    throw error;
  }
}

/**
 * Scrape a URL and get results (convenience function)
 * 
 * This combines startScrapeJob, waitForJob, and getJobResults
 */
export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<{
  runId: string;
  results: ScrapedContent[];
}> {
  const runId = await startScrapeJob(url, options);
  await waitForJob(runId);
  const results = await getJobResults(runId);
  
  return { runId, results };
}

/**
 * Helper: Extract title from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const lastSegment = path.split('/').filter(Boolean).pop() || urlObj.hostname;
    
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\.[^.]+$/, '') // Remove extension
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch {
    return url;
  }
}

/**
 * Helper: Extract filename from URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return path.split('/').pop() || 'document.pdf';
  } catch {
    return 'document.pdf';
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
