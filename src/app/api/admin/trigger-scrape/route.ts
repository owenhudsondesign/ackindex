import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabase = createClient(
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
 * This is a synchronous trigger - it calls the cron endpoint internally
 */
export async function POST(request: NextRequest) {
  try {
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
      const { error: updateError } = await supabase
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
      const { error: updateError } = await supabase
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

    // Now trigger the cron job
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[Manual Trigger] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not properly configured' },
        { status: 500 }
      );
    }

    // Get the base URL for the cron endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   `https://${process.env.VERCEL_URL}` ||
                   'http://localhost:3000';
    
    const cronUrl = `${baseUrl}/api/cron/scrape`;

    console.log(`[Manual Trigger] Calling cron endpoint: ${cronUrl}`);

    // Call the cron endpoint
    const cronResponse = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const cronResult = await cronResponse.json();

    if (!cronResponse.ok) {
      console.error('[Manual Trigger] Cron job failed:', cronResult);
      return NextResponse.json(
        {
          error: 'Cron job failed',
          details: cronResult,
        },
        { status: 500 }
      );
    }

    console.log('[Manual Trigger] Cron job completed successfully:', cronResult);

    return NextResponse.json({
      success: true,
      message: 'Scraping triggered successfully',
      result: cronResult,
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'active';

    const query = supabase
      .from('scheduled_scrapes')
      .select('*')
      .order('priority', { ascending: false })
      .order('next_scrape_at', { ascending: true })
      .limit(limit);

    if (status !== 'all') {
      query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Manual Trigger] Error fetching scheduled scrapes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled scrapes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ scrapes: data || [] });
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

