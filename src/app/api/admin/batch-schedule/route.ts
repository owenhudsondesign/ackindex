import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateUrl } from '@/lib/apifyScraper';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { urls, frequency = '1 week', priority = 5 } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required and must not be empty' },
        { status: 400 }
      );
    }

    console.log(`[Batch Schedule] Processing ${urls.length} URLs for user ${session.user.id}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each URL
    for (const url of urls) {
      try {
        // Validate URL
        const validation = validateUrl(url);
        if (!validation.valid) {
          results.failed++;
          results.errors.push(`${url}: ${validation.error}`);
          continue;
        }

        // Extract title from URL
        const title = extractTitleFromUrl(url);

        // Insert or update scheduled scrape
        const { error: upsertError } = await supabase.from('scheduled_scrapes').upsert(
          {
            url,
            title,
            scrape_frequency: frequency,
            priority,
            status: 'active',
            created_by: session.user.id,
            next_scrape_at: new Date().toISOString(), // Schedule immediately
          },
          {
            onConflict: 'url',
            ignoreDuplicates: false,
          }
        );

        if (upsertError) {
          console.error(`[Batch Schedule] Error scheduling ${url}:`, upsertError);
          results.failed++;
          results.errors.push(`${url}: ${upsertError.message}`);
        } else {
          results.success++;
          console.log(`[Batch Schedule] Successfully scheduled: ${url}`);
        }
      } catch (error) {
        console.error(`[Batch Schedule] Error processing ${url}:`, error);
        results.failed++;
        results.errors.push(
          `${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(
      `[Batch Schedule] Completed: ${results.success} success, ${results.failed} failed`
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Batch Schedule] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Helper: Extract a readable title from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const lastSegment = path.split('/').filter(Boolean).pop() || urlObj.hostname;

    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\.[^.]+$/, '') // Remove extension
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch {
    return url;
  }
}
