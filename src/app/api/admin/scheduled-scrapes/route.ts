import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
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
 * Create a new scheduled scrape
 */
export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/scheduled-scrapes', method: 'POST' });

  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { session } } = await authSupabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const { url, title, scrape_frequency = '1 week', priority = 5, status = 'active' } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check if URL already exists
    const { data: existing } = await serviceSupabase
      .from('scheduled_scrapes')
      .select('id')
      .eq('url', url)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'URL already scheduled' }, { status: 409 });
    }

    // Insert new scheduled scrape (use service role for insert, but set created_by to admin user)
    const { data, error } = await serviceSupabase
      .from('scheduled_scrapes')
      .insert({
        url,
        title: title || new URL(url).hostname,
        scrape_frequency,
        priority,
        status,
        created_by: adminOrError.id, // Set admin as creator
        next_scrape_at: new Date().toISOString(), // Schedule for immediate scraping
      })
      .select()
      .single();

    if (error) {
      log.error({ err: error }, 'Error creating scheduled scrape');
      return NextResponse.json({ error: 'Failed to create scheduled scrape' }, { status: 500 });
    }

    return NextResponse.json({ success: true, scrape: data });
  } catch (error) {
    log.error({ err: error }, 'Unexpected error creating scrape');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Update an existing scheduled scrape
 */
export async function PATCH(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/scheduled-scrapes', method: 'PATCH' });

  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { session } } = await authSupabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const { id, url, title, scrape_frequency, priority, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Scrape ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (url !== undefined) {
      try {
        new URL(url);
        updates.url = url;
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }
    if (title !== undefined) updates.title = title;
    if (scrape_frequency !== undefined) updates.scrape_frequency = scrape_frequency;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;

    const { data, error } = await serviceSupabase
      .from('scheduled_scrapes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error({ err: error }, 'Error updating scheduled scrape');
      return NextResponse.json({ error: 'Failed to update scheduled scrape' }, { status: 500 });
    }

    return NextResponse.json({ success: true, scrape: data });
  } catch (error) {
    log.error({ err: error }, 'Unexpected error updating scrape');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Delete a scheduled scrape
 */
export async function DELETE(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/admin/scheduled-scrapes', method: 'DELETE' });

  try {
    // Check authentication and admin authorization
    const authSupabase = await createAdminSupabaseClient();
    const { data: { session } } = await authSupabase.auth.getSession();

    const adminOrError = await requireAdminApi(session);
    if (adminOrError instanceof NextResponse) return adminOrError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Scrape ID is required' }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('scheduled_scrapes')
      .delete()
      .eq('id', id);

    if (error) {
      log.error({ err: error }, 'Error deleting scheduled scrape');
      return NextResponse.json({ error: 'Failed to delete scheduled scrape' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Unexpected error deleting scrape');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
