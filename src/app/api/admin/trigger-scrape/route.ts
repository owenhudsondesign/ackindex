import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { executeScheduledScraping } from '@/lib/scheduledScraping';
import logger from '@/lib/logger';

// Server-side Supabase client with service role key (for database operations)
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Manually trigger scraping for specific URLs or all pending URLs
 * This directly executes the scraping logic without needing to call the cron endpoint
 * Updated: 2025-10-30 - Refactored to use shared scraping logic
 */
export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/trigger-scrape', method: 'POST' });

  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminOrError = await requireAdminApi({ user });
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const { scrapeIds, triggerAll = false } = body;

    if (!triggerAll && (!scrapeIds || scrapeIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either scrapeIds or triggerAll must be provided' },
        { status: 400 }
      );
    }

    log.info('Starting manual scrape trigger');

    // If specific IDs provided, update their next_scrape_at to now and reset failed status
    if (scrapeIds && scrapeIds.length > 0) {
      const { error: updateError } = await serviceSupabase
        .from('scheduled_scrapes')
        .update({
          next_scrape_at: new Date().toISOString(),
          status: 'active',  // Reset failed scrapes to active
          error_count: 0,    // Reset error count
          error_message: null // Clear error message
        })
        .in('id', scrapeIds);

      if (updateError) {
        log.error({ err: updateError }, 'Error updating scrape times');
        return NextResponse.json(
          { error: 'Failed to update scrape times' },
          { status: 500 }
        );
      }

      log.info({ scrapesCount: scrapeIds.length }, 'Updated scrapes to run immediately and reset status');
    }

    // If triggerAll, update all active scrapes that haven't been scraped yet
    if (triggerAll) {
      const { error: updateError } = await serviceSupabase
        .from('scheduled_scrapes')
        .update({ next_scrape_at: new Date().toISOString() })
        .eq('status', 'active')
        .is('last_scraped_at', null);

      if (updateError) {
        log.error({ err: updateError }, 'Error updating all scrapes');
        return NextResponse.json(
          { error: 'Failed to update scrape times' },
          { status: 500 }
        );
      }

      log.info('Updated all pending scrapes to run immediately');
    }

    log.info('URLs updated, now executing scraping');

    // Execute the scraping directly using shared logic
    try {
      const results = await executeScheduledScraping(5); // Process 5 URLs at a time

      log.info({ results }, 'Scraping completed successfully');

      return NextResponse.json({
        success: true,
        message: 'Scraping triggered successfully',
        result: results,
      });
    } catch (scrapeError) {
      // Log the specific scraping error
      log.error({
        err: scrapeError,
        message: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error',
        stack: scrapeError instanceof Error ? scrapeError.stack : undefined
      }, 'Scraping execution failed');

      return NextResponse.json(
        {
          error: 'Scraping failed',
          details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error({
      err: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Manual trigger error');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get list of scheduled scrapes (for displaying in UI)
 */
export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/trigger-scrape', method: 'GET' });

  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      log.error({ authError: authError?.message }, 'Authentication failed in GET');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminOrError = await requireAdminApi({ user });
    if (adminOrError instanceof NextResponse) return adminOrError;

    log.info('Fetching scheduled scrapes');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'active';

    log.info({ limit, status }, 'Query params');

    // Build query
    let query = serviceSupabase
      .from('scheduled_scrapes')
      .select('*')
      .order('priority', { ascending: false })
      .order('next_scrape_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      log.error({ err: error }, 'Error fetching scheduled scrapes');
      return NextResponse.json(
        {
          error: 'Failed to fetch scheduled scrapes',
          details: error.message,
          hint: error.hint || 'Check RLS policies and service role key',
        },
        { status: 500 }
      );
    }

    log.info({ scrapesCount: data?.length || 0 }, 'Successfully fetched scrapes');

    return NextResponse.json({ scrapes: data || [] });
  } catch (error) {
    log.error({ err: error }, 'Unexpected error');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

