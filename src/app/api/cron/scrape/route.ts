import { NextRequest, NextResponse } from 'next/server';
import { executeScheduledScraping } from '@/lib/scheduledScraping';
import logger from '@/lib/logger';

/**
 * Cron job endpoint for scheduled scraping
 * Runs periodically (e.g., at 2 AM daily) via Vercel Cron
 */
export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/cron/scrape' });

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      log.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }

    if (authHeader !== expectedAuth) {
      log.warn('Unauthorized cron access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting scheduled scrape job');

    // Execute the scheduled scraping
    const results = await executeScheduledScraping(5); // Process 5 URLs at a time

    log.info({ succeeded: results.succeeded, failed: results.failed }, 'Cron scrape completed');

    return NextResponse.json({
      message: 'Scrape job completed',
      ...results,
    });
  } catch (error) {
    log.error({ err: error }, 'Cron scrape error');
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
