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
    const { url, category, source } = body;

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

    console.log(`Starting crawl of: ${url}`);

    // Fetch and parse the page
    const html = await fetchHTML(url);
    const pdfLinks = extractPDFLinks(html, url);

    console.log(`Found ${pdfLinks.length} PDF links`);

    if (pdfLinks.length === 0) {
      return NextResponse.json({
        message: 'No PDF links found on this page',
        documentsProcessed: 0,
        successCount: 0,
        duplicateCount: 0,
        errorCount: 0,
        results: [],
      });
    }

    const results: ParsedDocument[] = [];
    const supabase = getServiceSupabase();

    // Process each PDF
    for (const pdfUrl of pdfLinks) {
      try {
        console.log(`Processing: ${pdfUrl}`);

        // Extract title from URL
        const extractedTitle = extractTitleFromURL(pdfUrl);

        // Check if already exists
        const exists = await checkIfExists(supabase, pdfUrl, extractedTitle);
        if (exists) {
          console.log(`Skipping duplicate: ${extractedTitle}`);
          results.push({
            title: extractedTitle,
            url: pdfUrl,
            status: 'duplicate',
            message: 'Document already exists in database',
          });
          continue;
        }

        // Download PDF
        const pdfBuffer = await downloadPDF(pdfUrl);

        // Extract text
        const documentText = await extractTextFromPDF(pdfBuffer);

        if (!documentText || documentText.length < 50) {
          throw new Error('Insufficient text extracted from PDF');
        }

        console.log(`Extracted ${documentText.length} characters from PDF`);

        // Parse with AI
        const userProvidedData = {
          title: extractedTitle,
          category: category,
          source: source || 'Town of Nantucket',
        };

        let parsedData;
        try {
          parsedData = await parseDocumentWithClaude(documentText, userProvidedData);
        } catch (claudeError) {
          console.error('Claude parsing failed, trying OpenAI:', claudeError);
          parsedData = await parseDocumentWithOpenAI(documentText, userProvidedData);
        }

        // Store in Supabase
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
            file_path: pdfUrl, // Store the source URL
          })
          .select()
          .single();

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`);
        }

        console.log(`Successfully processed: ${parsedData.title}`);

        results.push({
          title: parsedData.title,
          url: pdfUrl,
          status: 'success',
        });

      } catch (error: any) {
        console.error(`Error processing ${pdfUrl}:`, error);
        results.push({
          title: extractTitleFromURL(pdfUrl),
          url: pdfUrl,
          status: 'error',
          message: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Processed ${pdfLinks.length} PDFs: ${successCount} new, ${duplicateCount} duplicates, ${errorCount} errors`,
      documentsProcessed: pdfLinks.length,
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
