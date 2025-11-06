/**
 * Apify Web Scraping Utilities
 *
 * Handles website crawling and PDF extraction using Apify actors.
 */

import { ApifyClient } from 'apify-client';
import { cleanText } from './chunking';
import logger from './logger';

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
 * Determine if a URL needs Stagehand (AI-powered) or Python (PDF-optimized) scraper
 * Stagehand is better for: dynamic sites, JavaScript-heavy portals, sites with complex interactions
 * Python is better for: static sites with PDFs, document archives, sites with tables
 * 
 * NOTE: Stagehand auto-detection is DISABLED until the actor is deployed
 * Set ENABLE_STAGEHAND_AUTO_DETECT=true in env to enable
 */
function shouldUseStagehand(url: string): boolean {
  // Disable auto-detection until Stagehand actor is deployed
  if (process.env.ENABLE_STAGEHAND_AUTO_DETECT !== 'true') {
    return false;
  }
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Sites that need Stagehand (dynamic/JavaScript-heavy)
    const stagehandDomains = [
      // Meeting/Agenda Management Platforms
      'civicclerk.com',         // CivicClerk portal - needs JavaScript interaction
      'legistar.com',           // Legistar portal - dynamic content
      'granicusideas.com',      // Granicus - dynamic platform
      'granicus.com',           // Granicus main domain
      'novusagenda.com',        // NovusAgenda - meeting management
      'primegov.com',           // PrimeGov - agenda management
      'swagit.com',             // Swagit - video streaming + agendas

      // Civic Engagement Platforms
      'civicplus.com',          // CivicPlus - JavaScript-heavy
      'civicengage.com',        // CivicEngage - citizen engagement
      'opengov.com',            // OpenGov - transparency platform
      'seeclickfix.com',        // SeeClickFix - issue reporting
      'citizenlab.co',          // CitizenLab - participation platform
      'polco.us',               // Polco - polling/engagement
      'zencity.io',             // Zencity - civic analytics

      // Document/Records Management
      'laserfiche.com',         // Laserfiche - document management
      'acomrapps.net',          // ACOM - agenda/records system
      'municode.com',           // Municode - online code/documents
      'generalcode.com',        // General Code - municipal codes
      'qcode.us',               // Qcode - municipal code platform

      // Permit/Planning Systems
      'clarityintuitivetech.com', // Clarity - permit tracking
      'viewpointcloud.com',     // Viewpoint - project management
      'accela.com',             // Accela - civic apps/permits
      'cityworks.com',          // Cityworks - asset management

      // Other Common Platforms
      'revize.com',             // Revize - CMS for government
      'govqa.com',              // GovQA - request management
      'nextrequest.com',        // NextRequest - FOIA/records
      'caseware.com',           // CaseWare - financial reporting
    ];
    
    // Check if URL matches any Stagehand-required domains
    return stagehandDomains.some(domain => hostname.includes(domain));
  } catch (error) {
    logger.error({ error, url }, 'Error parsing URL for actor selection');
    return false; // Default to Python actor
  }
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

  logger.info({ url }, 'Starting scrape job');

  try {
    const apifyClient = getApifyClient();
    
    // Auto-detect which actor to use based on URL
    // Stagehand for dynamic/JavaScript-heavy sites, Python for static sites with PDFs
    const needsStagehand = shouldUseStagehand(url);
    const useStagehand = process.env.USE_STAGEHAND_ACTOR === 'true' || needsStagehand;
    
    const actorId = useStagehand 
      ? (process.env.STAGEHAND_ACTOR_ID || 'legible_radish/stagehand-nantucket-scraper')
      : (process.env.APIFY_ACTOR_ID || 'legible_radish/ackindex-3');

    logger.info({ actorId, useStagehand }, `Using ${useStagehand ? 'Stagehand (AI-powered)' : 'Python (PDF-optimized)'} actor`);
    
    let runConfig: any;
    
    if (useStagehand) {
      // Stagehand actor configuration
      runConfig = {
        startUrl: url,
        maxPages: maxPages,
        maxDepth: maxDepth,
        extractPDFs: extractPDFs,
        openaiApiKey: process.env.OPENAI_API_KEY, // Required for Stagehand AI
      };
      logger.info('Using Stagehand AI-powered scraper');
    } else {
      // Python actor configuration (legacy)
      runConfig = {
        startUrls: [{ url }],
        downloadPdfs: extractPDFs,
        maxCrawlDepth: maxDepth,
        maxRequests: maxPages,
        minDelay: 5.0,
        maxDelay: 10.0,
        respectRobots: true,
        proxyConfiguration: {
          useApifyProxy: false,
        },
      };
      logger.info('Using Python PDF scraper with table extraction');
    }
    
    const run = await apifyClient.actor(actorId).call(runConfig);

    logger.info({ runId: run.id }, 'Job started');
    return run.id;
  } catch (error) {
    logger.error({ error }, 'Failed to start scrape job');
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
    logger.error({ error, runId }, 'Failed to check job status');
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
      logger.info({ runId, status }, 'Job status check');
      lastStatus = status;
    }
    
    if (status === 'SUCCEEDED') {
      logger.info({ runId }, 'Job completed successfully');
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
  logger.info({ runId }, 'Fetching results for job');

  try {
    const apifyClient = getApifyClient();
    
    // Get the run details to find the default dataset ID
    const run = await apifyClient.run(runId).get();
    const datasetId = run?.defaultDatasetId;
    
    if (!datasetId) {
      logger.error({ runId }, 'No dataset ID found for run');
      throw new Error('No dataset found for this run');
    }
    
    logger.info({ datasetId }, 'Using dataset ID');
    const { items } = await apifyClient.dataset(datasetId).listItems();
    
    logger.info({ itemCount: items.length }, 'Dataset items retrieved');
    
    const results: ScrapedContent[] = [];
    
    for (const item of items as any[]) {
      logger.debug({ itemPreview: JSON.stringify(item).substring(0, 300) }, 'Processing item');
      
      // Handle different item types from custom actor
      if (item.type === 'page') {
        // Regular page data with HTML content
        const content: ScrapedContent = {
          url: item.url || '',
          title: item.title || extractTitleFromUrl(item.url || ''),
          text: cleanText(item.text || ''),
          pdfs: [],
          tables: item.tables || [],
          metadata: {
            crawledAt: new Date().toISOString(),
            pdf_count: item.pdf_count || 0,
            text_length: item.text_length || 0,
          },
        };
        
        // Only add pages with meaningful content
        if (content.url && content.text.length > 100) {
          results.push(content);
          logger.debug({ contentLength: content.text.length }, 'Added page with content');
        } else {
          logger.debug({ contentLength: content.text.length }, 'Skipped page with insufficient content');
        }
      } else if (item.type === 'pdf' && item.full_text) {
        // PDF data from Stagehand actor
        const content: ScrapedContent = {
          url: item.url || '',
          title: item.title || extractFilenameFromUrl(item.url || ''),
          text: cleanText(item.full_text || ''),
          pdfs: [{
            url: item.url || '',
            filename: extractFilenameFromUrl(item.url || ''),
          }],
          tables: item.tables || [],
          metadata: {
            crawledAt: item.scraped_at || new Date().toISOString(),
            num_pages: item.num_pages || 0,
            total_tables: item.total_tables || 0,
            parser: item.parser || 'pdf-parse',
            source_page: item.source_page || '',
            ...item.metadata,
          },
        };
        
        if (content.text.length > 100 || (content.tables && content.tables.length > 0)) {
          results.push(content);
          logger.debug({ contentLength: content.text.length }, 'Added PDF with content');
        }
      } else if (item.status === 'success' && item.full_text) {
        // PDF data from Python actor (legacy format)
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
        
        if (content.text.length > 100 || (content.tables && content.tables.length > 0)) {
          results.push(content);
          logger.debug({ tableCount: content.tables?.length || 0 }, 'Added PDF with tables');
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
    
    logger.info({ resultCount: results.length }, 'Retrieved pages with content');
    return results;
  } catch (error) {
    logger.error({ error, runId }, 'Failed to get job results');
    throw new Error('Failed to retrieve scraping results');
  }
}

/**
 * Download a PDF file from a URL
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  try {
    logger.info({ url }, 'Downloading PDF');
    
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
    logger.error({ error, url }, 'Failed to download PDF');
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
