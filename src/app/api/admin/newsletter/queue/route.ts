/**
 * Newsletter Queue API
 *
 * GET /api/admin/newsletter/queue - Get all newsletters (pending, sent, etc.)
 * DELETE /api/admin/newsletter/queue?id=xxx - Delete a newsletter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function GET() {
  try {
    // Auth check
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get all newsletters ordered by created_at
    const { data: newsletters, error } = await supabaseAdmin
      .from('newsletter_triggers')
      .select('id, subject, status, created_at, processed_at, meetings_count, week_start, week_end')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error({ error }, '[Newsletter Queue] Failed to fetch newsletters');
      return NextResponse.json(
        { error: 'Failed to fetch newsletters' },
        { status: 500 }
      );
    }

    return NextResponse.json({ newsletters });
  } catch (error) {
    logger.error({ error }, '[Newsletter Queue] Unexpected error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get newsletter ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Newsletter ID is required' },
        { status: 400 }
      );
    }

    // Delete the newsletter
    const { error } = await supabaseAdmin
      .from('newsletter_triggers')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error, id }, '[Newsletter Queue] Failed to delete newsletter');
      return NextResponse.json(
        { error: 'Failed to delete newsletter' },
        { status: 500 }
      );
    }

    logger.info({ id, deletedBy: user?.id }, '[Newsletter Queue] Newsletter deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, '[Newsletter Queue] Unexpected error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
