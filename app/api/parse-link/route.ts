import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { extractTextFromPDF } from '@/lib/pdf-utils';
import { parseDocumentWithClaude, parseDocumentWithOpenAI } from '@/lib/ai-parser';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for crawling

interface ParseLinkRequest {
  url: string;
  category?: string;
  source?: string;
  parseHTML?: boolean; // If true, parse HTML pages in addition to PDFs
  recursive?: boolean; // If true, follow internal links (1 level deep)
  maxPages?: number;   // Maximum number of pages to process
}

interface ParsedDocument {
  title: string;
  url: string;
  status: 'success' | 'error' | 'duplicate';
  message?: string;
}

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AckIndex Bot (civic data aggregator)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function extractPDFLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const pdfLinks: string[] = [];

  // Find all links that might be PDFs
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      const lowerHref = href.toLowerCase();

      // Check if it's a direct PDF link or a PDF viewer/download link
      const isPdfLink =
        lowerHref.endsWith('.pdf') ||
        lowerHref.includes('.pdf?') ||
        lowerHref.includes('/viewfile') ||
        lowerHref.includes('/download') ||
        lowerHref.includes('getfile');

      if (isPdfLink) {
        try {
          // Convert relative URLs to absolute
          const absoluteUrl = new URL(href, baseUrl).toString();

          // Only include links from the same domain (or nantucket-ma.gov)
          const parsedUrl = new URL(absoluteUrl);
          const baseDomain = new URL(baseUrl).hostname;

          if (parsedUrl.hostname === baseDomain ||
              parsedUrl.hostname.includes('nantucket-ma.gov')) {
            pdfLinks.push(absoluteUrl);
          }
        } catch (error) {
          console.error('Invalid URL:', href, error);
        }
      }
    }
  });

  // Remove duplicates
  return Array.from(new Set(pdfLinks));
}

function extractInternalLinks(html: string, baseUrl: string, maxLinks: number = 20): string[] {
  const $ = cheerio.load(html);
  const internalLinks: string[] = [];

  $('a[href]').each((_, element) => {
    if (internalLinks.length >= maxLinks) return false;

    const href = $(element).attr('href');
    if (href) {
      const lowerHref = href.toLowerCase();

      // Skip PDFs, anchors, external links, and non-relevant pages
      if (
        lowerHref.startsWith('#') ||
        lowerHref.startsWith('mailto:') ||
        lowerHref.startsWith('tel:') ||
        lowerHref.includes('.pdf') ||
        lowerHref.includes('.jpg') ||
        lowerHref.includes('.png') ||
        lowerHref.includes('.gif')
      ) {
        return;
      }

      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const parsedUrl = new URL(absoluteUrl);
        const baseDomain = new URL(baseUrl).hostname;

        // Only same domain
        if (parsedUrl.hostname === baseDomain ||
            parsedUrl.hostname.includes('nantucket-ma.gov')) {
          internalLinks.push(absoluteUrl);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
  });

  // Remove duplicates
  return Array.from(new Set(internalLinks));
}

function extractTextFromHTML(html: string): string {
  const $ = cheerio.load(html);

  // Remove script, style, nav, header, footer tags
  $('script, style, nav, header, footer, aside, .sidebar, .navigation, .menu').remove();

  // Try to find main content
  let content = '';
  const mainSelectors = ['main', 'article', '.content', '#content', '.main-content', 'body'];

  for (const selector of mainSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }

  // Clean up the text
  content = content
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\n+/g, '\n')          // Normalize newlines
    .trim();

  return content;
}

async function downloadPDF(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AckIndex Bot (civic data aggregator)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function extractTitleFromURL(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'document';
    // Remove .pdf extension and clean up
    const title = filename
      .replace(/\.pdf$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter of each word
    return title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch {
    return 'Untitled Document';
  }
}

async function checkIfExists(supabase: any, sourceUrl: string, title: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('entries')
    .select('id')
    .or(`file_path.eq.${sourceUrl},title.eq.${title}`)
    .limit(1);

  if (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }

  return data && data.length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseLinkRequest = await request.json();
    const { url, category, source, parseHTML = true, recursive = false, maxPages = 50 } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`Starting crawl of: ${url} (parseHTML: ${parseHTML}, recursive: ${recursive})`);

    const results: ParsedDocument[] = [];
    const supabase = getServiceSupabase();
    const processedUrls = new Set<string>();
    const urlsToProcess: string[] = [url];

    while (urlsToProcess.length > 0 && results.length < maxPages) {
      const currentUrl = urlsToProcess.shift()!;

      // Skip if already processed
      if (processedUrls.has(currentUrl)) {
        continue;
      }
      processedUrls.add(currentUrl);

      try {
        console.log(`Processing: ${currentUrl}`);

        // Fetch the page
        const html = await fetchHTML(currentUrl);

        // Extract PDF links
        const pdfLinks = extractPDFLinks(html, currentUrl);
        console.log(`Found ${pdfLinks.length} PDF links on ${currentUrl}`);

        // Process PDFs
        for (const pdfUrl of pdfLinks) {
          if (results.length >= maxPages) break;

          try {
            const extractedTitle = extractTitleFromURL(pdfUrl);
            const exists = await checkIfExists(supabase, pdfUrl, extractedTitle);

            if (exists) {
              console.log(`Skipping duplicate PDF: ${extractedTitle}`);
              results.push({
                title: extractedTitle,
                url: pdfUrl,
                status: 'duplicate',
                message: 'Document already exists in database',
              });
              continue;
            }

            const pdfBuffer = await downloadPDF(pdfUrl);
            const documentText = await extractTextFromPDF(pdfBuffer);

            if (!documentText || documentText.length < 50) {
              throw new Error('Insufficient text extracted from PDF');
            }

            await processDocument(supabase, documentText, pdfUrl, extractedTitle, category, source, results);

          } catch (error: any) {
            console.error(`Error processing PDF ${pdfUrl}:`, error);
            results.push({
              title: extractTitleFromURL(pdfUrl),
              url: pdfUrl,
              status: 'error',
              message: error.message,
            });
          }
        }

        // Parse HTML page content if enabled
        if (parseHTML) {
          const pageText = extractTextFromHTML(html);

          if (pageText && pageText.length > 100) {
            const pageTitle = extractTitleFromURL(currentUrl);
            const exists = await checkIfExists(supabase, currentUrl, pageTitle);

            if (!exists) {
              console.log(`Processing HTML page: ${currentUrl}`);
              await processDocument(supabase, pageText, currentUrl, pageTitle, category, source, results);
            } else {
              console.log(`Skipping duplicate HTML page: ${pageTitle}`);
              results.push({
                title: pageTitle,
                url: currentUrl,
                status: 'duplicate',
                message: 'Page already exists in database',
              });
            }
          }
        }

        // Extract internal links for recursive crawling
        if (recursive && urlsToProcess.length < maxPages) {
          const internalLinks = extractInternalLinks(html, currentUrl, 10);
          for (const link of internalLinks) {
            if (!processedUrls.has(link) && !urlsToProcess.includes(link)) {
              urlsToProcess.push(link);
            }
          }
        }

      } catch (error: any) {
        console.error(`Error processing page ${currentUrl}:`, error);
        results.push({
          title: extractTitleFromURL(currentUrl),
          url: currentUrl,
          status: 'error',
          message: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Processed ${processedUrls.size} pages: ${successCount} new, ${duplicateCount} duplicates, ${errorCount} errors`,
      documentsProcessed: processedUrls.size,
      successCount,
      duplicateCount,
      errorCount,
      results,
    });

  } catch (error: any) {
    console.error('Parse link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse link' },
      { status: 500 }
    );
  }
}

async function processDocument(
  supabase: any,
  documentText: string,
  sourceUrl: string,
  title: string,
  category: string | undefined,
  source: string | undefined,
  results: ParsedDocument[]
) {
  const userProvidedData = {
    title,
    category,
    source: source || 'Town of Nantucket',
  };

  let parsedData;
  try {
    parsedData = await parseDocumentWithClaude(documentText, userProvidedData);
  } catch (claudeError) {
    console.error('Claude parsing failed, trying OpenAI:', claudeError);
    parsedData = await parseDocumentWithOpenAI(documentText, userProvidedData);
  }

  const { data: entry, error: dbError } = await supabase
    .from('entries')
    .insert({
      title: parsedData.title,
      source: parsedData.source,
      category: parsedData.category,
      summary: parsedData.summary,
      key_metrics: parsedData.key_metrics || [],
      visualizations: parsedData.visualizations || [],
      insights: parsedData.insights || [],
      comparisons: parsedData.comparisons || [],
      notable_updates: parsedData.notable_updates || [],
      plain_english_summary: parsedData.plain_english_summary || [],
      date_published: parsedData.date_published,
      document_excerpt: parsedData.document_excerpt,
      file_path: sourceUrl,
    })
    .select()
    .single();

  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`);
  }

  console.log(`Successfully processed: ${parsedData.title}`);

  results.push({
    title: parsedData.title,
    url: sourceUrl,
    status: 'success',
  });
}
