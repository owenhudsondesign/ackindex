import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { validateUrl } from '@/lib/apifyScraper';
import { createDocument } from '@/lib/database';
import { scrapingQueue } from '@/lib/queues';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin authorization
    const supabase = await createAdminSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

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
      created_by: adminOrError.id,
    });

    // Add job to queue (instead of fire-and-forget)
    const job = await scrapingQueue.add(
      'scrape-url',
      {
        documentId: document.id,
        url,
        userId: adminOrError.id,
      },
      {
        priority: 5, // Normal priority (lower number = higher priority)
        jobId: document.id, // Use document ID as job ID for idempotency
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`[Scrape API] Queued scraping job ${job.id} for document ${document.id}`);

    return NextResponse.json({
      message: 'URL scraping queued successfully',
      documentId: document.id,
      jobId: job.id,
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
