/**
 * Flag Response API
 *
 * Allows users to report incorrect or hallucinated responses.
 * Part of the anti-hallucination feedback system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';
import { captureException } from '@/lib/sentry';

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

// Get user from request (same pattern as chat route)
async function getUserFromRequest(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session } } = await supabaseSSR.auth.getSession();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || '',
      };
    }
  } catch (error) {
    logger.debug({ error }, 'Cookie auth failed in flag-response');
  }

  return null;
}

export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/flag-response' });

  try {
    const body = await request.json();
    const {
      queryText,
      responseText,
      citations,
      flagReason,
      flagType,
      verificationResult,
      similarityScores,
      userEmail, // For anonymous users
    } = body;

    // Validate required fields
    if (!queryText || !responseText) {
      return NextResponse.json(
        { error: 'Query and response text are required' },
        { status: 400 }
      );
    }

    if (!flagType) {
      return NextResponse.json(
        { error: 'Flag type is required' },
        { status: 400 }
      );
    }

    // Get authenticated user (if any)
    const user = await getUserFromRequest(request);
    const isAnonymous = !user;

    log.info({
      userId: user?.id,
      isAnonymous,
      flagType,
      queryLength: queryText.length,
    }, 'Flagging response');

    // Insert flag into database
    const { data: flag, error } = await supabase
      .from('flagged_responses')
      .insert({
        query_text: queryText,
        response_text: responseText,
        citations: citations || [],
        user_id: user?.id || null,
        user_email: isAnonymous ? userEmail : user?.email,
        is_anonymous: isAnonymous,
        flag_reason: flagReason || '',
        flag_type: flagType,
        verification_result: verificationResult || null,
        similarity_scores: similarityScores || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      log.error({ error }, 'Failed to insert flag');
      throw error;
    }

    log.info({ flagId: flag.id }, 'Response flagged successfully');

    // Update metrics: increment flagged_responses for current hour (fire-and-forget)
    Promise.resolve(supabase.rpc('record_flagged_response')).catch(err => {
      log.error({ err }, 'Failed to update flagged response metrics');
    });

    return NextResponse.json({
      success: true,
      flagId: flag.id,
      message: 'Thank you for reporting this issue. Our team will review it.',
    });

  } catch (error) {
    log.error({ err: error }, 'Flag response API error');

    captureException(error, {
      tags: { endpoint: '/api/flag-response' },
    });

    return NextResponse.json(
      {
        error: 'Failed to submit flag',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve user's own flags (for history)
export async function GET(request: NextRequest) {
  const log = logger.child({ endpoint: '/api/flag-response' });

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: flags, error } = await supabase
      .from('flagged_responses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      log.error({ error }, 'Failed to fetch flags');
      throw error;
    }

    return NextResponse.json({
      flags: flags || [],
    });

  } catch (error) {
    log.error({ err: error }, 'Get flags API error');

    return NextResponse.json(
      { error: 'Failed to fetch flags' },
      { status: 500 }
    );
  }
}
