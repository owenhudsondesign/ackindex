import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { executeScheduledScraping } from '@/lib/scheduledScraping';

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
  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { session } } = await authSupabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const { scrapeIds, triggerAll = false } = body;

    if (!triggerAll && (!scrapeIds || scrapeIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either scrapeIds or triggerAll must be provided' },
        { status: 400 }
      );
    }

    console.log('[Manual Trigger] Starting manual scrape trigger...');

    // If specific IDs provided, update their next_scrape_at to now
    if (scrapeIds && scrapeIds.length > 0) {
      const { error: updateError } = await serviceSupabase
        .from('scheduled_scrapes')
        .update({ next_scrape_at: new Date().toISOString() })
        .in('id', scrapeIds);

      if (updateError) {
        console.error('[Manual Trigger] Error updating scrape times:', updateError);
        return NextResponse.json(
          { error: 'Failed to update scrape times' },
          { status: 500 }
        );
      }

      console.log(`[Manual Trigger] Updated ${scrapeIds.length} scrapes to run immediately`);
    }

    // If triggerAll, update all active scrapes that haven't been scraped yet
    if (triggerAll) {
      const { error: updateError } = await serviceSupabase
        .from('scheduled_scrapes')
        .update({ next_scrape_at: new Date().toISOString() })
        .eq('status', 'active')
        .is('last_scraped_at', null);

      if (updateError) {
        console.error('[Manual Trigger] Error updating all scrapes:', updateError);
        return NextResponse.json(
          { error: 'Failed to update scrape times' },
          { status: 500 }
        );
      }

      console.log('[Manual Trigger] Updated all pending scrapes to run immediately');
    }

    console.log('[Manual Trigger] URLs updated, now executing scraping...');

    // Execute the scraping directly using shared logic
    const results = await executeScheduledScraping(5); // Process 5 URLs at a time

    console.log('[Manual Trigger] Scraping completed successfully:', results);

    return NextResponse.json({
      success: true,
      message: 'Scraping triggered successfully',
      result: results,
    });
  } catch (error) {
    console.error('[Manual Trigger] Error:', error);
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
  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { session } } = await authSupabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    console.log('[Manual Trigger GET] Fetching scheduled scrapes...');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'active';

    console.log(`[Manual Trigger GET] Query params - limit: ${limit}, status: ${status}`);

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
      console.error('[Manual Trigger GET] Error fetching scheduled scrapes:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch scheduled scrapes',
          details: error.message,
          hint: error.hint || 'Check RLS policies and service role key',
        },
        { status: 500 }
      );
    }

    console.log(`[Manual Trigger GET] Successfully fetched ${data?.length || 0} scrapes`);

    return NextResponse.json({ scrapes: data || [] });
  } catch (error) {
    console.error('[Manual Trigger GET] Unexpected error:', error);
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

