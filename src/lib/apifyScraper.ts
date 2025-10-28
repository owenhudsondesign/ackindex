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
    
    // Use Apify's Website Content Crawler
    const actorId = process.env.APIFY_ACTOR_ID || 'apify/website-content-crawler';

    const run = await apifyClient.actor(actorId).call({
      startUrls: [{ url }],
      maxCrawlDepth: maxDepth,
      maxCrawlPages: maxPages,
      
      // Crawler settings
      crawlerType: 'playwright:firefox',
      includeUrlGlobs: [],
      excludeUrlGlobs: [],
      
      // Content extraction
      readableTextCharThreshold: 100,
      removeCookieWarnings: true,
      removeElementsCssSelector: 'nav, footer, header, .nav, .footer, .header',
      
      // PDF handling
      downloadFiles: extractPDFs,
      downloadFileTypes: ['pdf'],
      
      // Output settings
      saveHtml: false,
      saveMarkdown: true,
      saveScreenshots: false,
      
      // Performance
      maxRequestsPerCrawl: maxPages,
      maxSessionRotations: 10,
      
      // Proxy settings
      proxyConfiguration: {
        useApifyProxy: true,
      },
    });

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
  timeoutMs: number = 300000 // 5 minutes
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { status } = await checkJobStatus(runId);
    
    if (status === 'SUCCEEDED') {
      console.log(`[Apify] Job ${runId} completed successfully`);
      return;
    }
    
    if (status === 'FAILED' || status === 'TIMED-OUT' || status === 'ABORTED') {
      throw new Error(`Scraping job ${status.toLowerCase()}`);
    }
    
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
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
    
    const results: ScrapedContent[] = [];
    
    for (const item of items as any[]) {
      const content: ScrapedContent = {
        url: item.url || '',
        title: item.metadata?.title || extractTitleFromUrl(item.url),
        text: cleanText(item.text || item.markdown || ''),
        pdfs: [],
        metadata: {
          crawledAt: item.loadedTime || new Date().toISOString(),
          httpStatusCode: item.httpStatusCode,
          ...item.metadata,
        },
      };
      
      // Extract PDFs from the page
      if (item.downloadedFiles && Array.isArray(item.downloadedFiles)) {
        content.pdfs = item.downloadedFiles
          .filter((f: any) => f.url?.endsWith('.pdf'))
          .map((f: any) => ({
            url: f.url,
            filename: extractFilenameFromUrl(f.url),
          }));
      }
      
      // Only include pages with content
      if (content.text.length > 100 || content.pdfs.length > 0) {
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
