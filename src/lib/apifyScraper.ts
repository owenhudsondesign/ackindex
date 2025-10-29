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
    
    // Use Apify's Website Content Crawler - best for PDF extraction
    const actorId = process.env.APIFY_ACTOR_ID || 'apify/website-content-crawler';

    console.log(`[Apify] Using actor: ${actorId}`);
    
    // Check if using custom PDF scraper actor
    const isCustomPdfActor = actorId.includes('ackindex-pdf-actor');
    
    let runConfig: any;
    
    if (isCustomPdfActor) {
      // Custom actor with table extraction
      console.log('[Apify] Using custom PDF scraper with table extraction');
      runConfig = {
        startUrls: [{ url }],
        downloadPdfs: extractPDFs,
        maxCrawlDepth: maxDepth,
        maxRequests: maxPages,
        proxyConfiguration: {
          useApifyProxy: false, // Custom actor doesn't need proxy
        },
      };
    } else {
      // Default website-content-crawler
      console.log('[Apify] Using default website content crawler');
      runConfig = {
        startUrls: [{ url }],
        crawlerType: 'playwright:firefox',
        maxCrawlDepth: maxDepth,
        maxCrawlPages: maxPages,
        
        // Link crawling settings
        includeUrlGlobs: [],
        excludeUrlGlobs: [],
        
        // Wait for dynamic content
        waitForLoadMoreSecs: 5,
        dynamicContentWaitSecs: 5,
        
        // Content extraction
        readableTextCharThreshold: 100,
        removeCookieWarnings: true,
        removeElementsCssSelector: 'nav, footer, header, .nav, .footer, .header, #nav, #footer, #header',
        
        // PDF handling - download ALL PDFs
        downloadFiles: extractPDFs,
        downloadFileTypes: extractPDFs ? ['pdf'] : [],
        maxFileDownloadSizeMB: 50,
        
        // Output settings
        saveHtml: false,
        saveMarkdown: true,
        saveScreenshots: false,
        saveFiles: extractPDFs,
        
        // Performance
        maxRequestsPerCrawl: maxPages,
        maxSessionRotations: 10,
        requestTimeoutSecs: 60,
        
        // Proxy settings
        proxyConfiguration: {
          useApifyProxy: true,
        },
      };
    }
    
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
      
      // Extract URL - website-content-crawler uses 'url'
      const itemUrl = item.url || item.loadedUrl || '';
      
      // Extract text content - website-content-crawler uses 'text' or 'markdown'
      const textContent = item.text || item.markdown || item.readableText || '';
      
      // Extract title - website-content-crawler uses metadata.title
      const pageTitle = item.metadata?.title || item.title || extractTitleFromUrl(itemUrl);
      
      const content: ScrapedContent = {
        url: itemUrl,
        title: pageTitle,
        text: cleanText(textContent),
        pdfs: [],
        metadata: {
          crawledAt: item.loadedTime || item.crawledAt || new Date().toISOString(),
          httpStatusCode: item.httpStatusCode || item.statusCode || 200,
          depth: item.depth || 0,
          ...item.metadata,
        },
      };
      
      // Extract PDFs from downloaded files
      // website-content-crawler puts files in 'downloadedFiles' array
      const downloadedFiles = item.downloadedFiles || item.files || [];
      
      if (Array.isArray(downloadedFiles) && downloadedFiles.length > 0) {
        console.log(`[Apify] Found ${downloadedFiles.length} downloaded files on ${itemUrl}`);
        
        content.pdfs = downloadedFiles
          .filter((f: any) => {
            const fileUrl = f.url || f.path || f.key || '';
            const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || 
                         fileUrl.toLowerCase().includes('.pdf') ||
                         (f.mimeType && f.mimeType.includes('pdf'));
            if (isPdf) {
              console.log(`[Apify] Found PDF: ${fileUrl}`);
            }
            return isPdf;
          })
          .map((f: any) => ({
            url: f.url || f.key || f.path || '',
            filename: f.filename || extractFilenameFromUrl(f.url || f.key || f.path || ''),
          }));
      }
      
      // Only include pages with content or PDFs
      if (content.text.length > 100 || content.pdfs.length > 0) {
        results.push(content);
        if (content.pdfs.length > 0) {
          console.log(`[Apify] Added page with ${content.pdfs.length} PDFs`);
        }
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
