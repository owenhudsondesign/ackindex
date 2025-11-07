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
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminOrError = await requireAdminApi({ user });
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const {
      url,
      title,
      scrape_frequency = '1 week',
      priority = 5,
      status = 'active',
      // Scraper configuration options
      max_depth = 2,
      max_pages = 20,
      extract_pdfs = true,
      scrape_javascript = false,
      wait_for_dynamic_content = false,
      timeout_seconds = 30,
      // Chunking configuration
      chunk_size = 500,
      chunk_overlap = 50,
      // Additional options
      scrape_options = {}
    } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate configuration ranges
    if (max_depth < 1 || max_depth > 10) {
      return NextResponse.json({ error: 'max_depth must be between 1 and 10' }, { status: 400 });
    }
    if (max_pages < 1 || max_pages > 200) {
      return NextResponse.json({ error: 'max_pages must be between 1 and 200' }, { status: 400 });
    }
    if (timeout_seconds < 10 || timeout_seconds > 120) {
      return NextResponse.json({ error: 'timeout_seconds must be between 10 and 120' }, { status: 400 });
    }
    if (chunk_size < 100 || chunk_size > 2000) {
      return NextResponse.json({ error: 'chunk_size must be between 100 and 2000' }, { status: 400 });
    }
    if (chunk_overlap < 0 || chunk_overlap > 500) {
      return NextResponse.json({ error: 'chunk_overlap must be between 0 and 500' }, { status: 400 });
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
        // Scraper configuration
        max_depth,
        max_pages,
        extract_pdfs,
        scrape_javascript,
        wait_for_dynamic_content,
        timeout_seconds,
        // Chunking configuration
        chunk_size,
        chunk_overlap,
        // Additional options
        scrape_options,
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
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminOrError = await requireAdminApi({ user });
    if (adminOrError instanceof NextResponse) return adminOrError;

    const body = await request.json();
    const {
      id,
      url,
      title,
      scrape_frequency,
      priority,
      status,
      max_depth,
      max_pages,
      extract_pdfs,
      scrape_javascript,
      wait_for_dynamic_content,
      timeout_seconds,
      chunk_size,
      chunk_overlap,
      scrape_options
    } = body;

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

    // Scraper configuration updates with validation
    if (max_depth !== undefined) {
      if (max_depth < 1 || max_depth > 10) {
        return NextResponse.json({ error: 'max_depth must be between 1 and 10' }, { status: 400 });
      }
      updates.max_depth = max_depth;
    }
    if (max_pages !== undefined) {
      if (max_pages < 1 || max_pages > 200) {
        return NextResponse.json({ error: 'max_pages must be between 1 and 200' }, { status: 400 });
      }
      updates.max_pages = max_pages;
    }
    if (extract_pdfs !== undefined) updates.extract_pdfs = extract_pdfs;
    if (scrape_javascript !== undefined) updates.scrape_javascript = scrape_javascript;
    if (wait_for_dynamic_content !== undefined) updates.wait_for_dynamic_content = wait_for_dynamic_content;
    if (timeout_seconds !== undefined) {
      if (timeout_seconds < 10 || timeout_seconds > 120) {
        return NextResponse.json({ error: 'timeout_seconds must be between 10 and 120' }, { status: 400 });
      }
      updates.timeout_seconds = timeout_seconds;
    }

    // Chunking configuration updates with validation
    if (chunk_size !== undefined) {
      if (chunk_size < 100 || chunk_size > 2000) {
        return NextResponse.json({ error: 'chunk_size must be between 100 and 2000' }, { status: 400 });
      }
      updates.chunk_size = chunk_size;
    }
    if (chunk_overlap !== undefined) {
      if (chunk_overlap < 0 || chunk_overlap > 500) {
        return NextResponse.json({ error: 'chunk_overlap must be between 0 and 500' }, { status: 400 });
      }
      updates.chunk_overlap = chunk_overlap;
    }
    if (scrape_options !== undefined) updates.scrape_options = scrape_options;

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
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminOrError = await requireAdminApi({ user });
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
