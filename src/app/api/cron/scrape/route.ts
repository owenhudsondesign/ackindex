import { NextRequest, NextResponse } from 'next/server';
import { executeScheduledScraping } from '@/lib/scheduledScraping';

/**
 * Cron job endpoint for scheduled scraping
 * Runs periodically (e.g., at 2 AM daily) via Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    if (authHeader !== expectedAuth) {
      console.error('[Cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting scheduled scrape job...');

    // Execute the scheduled scraping
    const results = await executeScheduledScraping(5); // Process 5 URLs at a time

    console.log(`[Cron] Completed: ${results.succeeded} succeeded, ${results.failed} failed`);

    return NextResponse.json({
      message: 'Scrape job completed',
      ...results,
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Required for Vercel Cron
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time
