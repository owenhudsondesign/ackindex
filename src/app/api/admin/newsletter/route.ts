/**
 * Newsletter Admin API
 *
 * POST /api/admin/newsletter - Generate and trigger weekly summary newsletter
 * GET /api/admin/newsletter - Preview the newsletter without sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { getRecentMeetings, generateWeeklySummary } from '@/lib/newsletterSummary';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

/**
 * GET - Preview the newsletter without triggering send
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Get days parameter (default 7)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    logger.info({ days }, '[Newsletter] Generating preview');

    // Fetch recent meetings
    const meetings = await getRecentMeetings(days);

    if (meetings.length === 0) {
      return NextResponse.json({
        preview: true,
        meetingsCount: 0,
        message: 'No published meetings found in the specified period',
        meetings: [],
      });
    }

    // Generate summary
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ackindex.com';
    const summary = await generateWeeklySummary(meetings, baseUrl);

    logger.info({
      meetingsCount: summary.meetingsCount,
      meetingTypes: summary.meetingTypes,
    }, '[Newsletter] Preview generated');

    return NextResponse.json({
      preview: true,
      subject: summary.subject,
      previewText: summary.previewText,
      htmlContent: summary.htmlContent,
      plainTextContent: summary.plainTextContent,
      meetingsCount: summary.meetingsCount,
      meetingTypes: summary.meetingTypes,
      weekStart: summary.weekStart.toISOString(),
      weekEnd: summary.weekEnd.toISOString(),
      meetings: meetings.map(m => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        meeting_type: m.meeting_type,
        meeting_date: m.meeting_date,
      })),
    });
  } catch (error) {
    logger.error({ error }, '[Newsletter] Preview failed');
    return NextResponse.json(
      { error: 'Failed to generate newsletter preview' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate and trigger the newsletter send via Dreamlit
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminOrError = await requireAdminApi(user);
    if (adminOrError instanceof NextResponse) return adminOrError;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;

    logger.info({ days, triggeredBy: user?.id }, '[Newsletter] Triggering newsletter send');

    // Fetch recent meetings
    const meetings = await getRecentMeetings(days);

    // Generate summary
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ackindex.com';
    const summary = await generateWeeklySummary(meetings, baseUrl);

    // Insert into newsletter_triggers table for Dreamlit to pick up
    // Includes all language versions for Dreamlit to select based on user preference
    const { data: trigger, error } = await supabaseAdmin
      .from('newsletter_triggers')
      .insert({
        // English (default)
        subject: summary.subject,
        preview_text: summary.previewText,
        html_content: summary.htmlContent,
        plain_text_content: summary.plainTextContent,
        // Spanish
        subject_es: summary.subject_es,
        html_content_es: summary.htmlContent_es,
        plain_text_content_es: summary.plainTextContent_es,
        // Portuguese
        subject_pt: summary.subject_pt,
        html_content_pt: summary.htmlContent_pt,
        plain_text_content_pt: summary.plainTextContent_pt,
        // Metadata
        newsletter_type: 'weekly_summary',
        week_start: summary.weekStart.toISOString().split('T')[0],
        week_end: summary.weekEnd.toISOString().split('T')[0],
        meetings_count: summary.meetingsCount,
        meeting_types: summary.meetingTypes,
        status: 'pending',
        triggered_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, '[Newsletter] Failed to insert trigger');
      return NextResponse.json(
        { error: 'Failed to trigger newsletter' },
        { status: 500 }
      );
    }

    logger.info({
      triggerId: trigger.id,
      meetingsCount: summary.meetingsCount,
      meetingTypes: summary.meetingTypes,
    }, '[Newsletter] Newsletter triggered successfully');

    return NextResponse.json({
      success: true,
      triggerId: trigger.id,
      subject: summary.subject,
      meetingsCount: summary.meetingsCount,
      meetingTypes: summary.meetingTypes,
      weekStart: summary.weekStart.toISOString(),
      weekEnd: summary.weekEnd.toISOString(),
      message: 'Newsletter triggered. Dreamlit will send it to subscribers.',
    });
  } catch (error) {
    logger.error({ error }, '[Newsletter] Trigger failed');
    return NextResponse.json(
      { error: 'Failed to trigger newsletter' },
      { status: 500 }
    );
  }
}
