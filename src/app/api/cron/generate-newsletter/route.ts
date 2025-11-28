/**
 * Cron job to auto-generate the weekly newsletter for review
 *
 * This runs every Sunday at 12pm ET to create a pending newsletter
 * that can be reviewed before the Monday 6am send.
 *
 * Schedule: Every Sunday at 12:00pm ET
 * Vercel Cron: 0 17 * * 0 (12:00pm ET = 17:00 UTC during EST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getRecentMeetings, generateWeeklySummary } from '@/lib/newsletterSummary';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized attempt to run generate-newsletter');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if there's already a pending newsletter (don't overwrite)
    const { data: existingPending } = await supabaseAdmin
      .from('newsletter_triggers')
      .select('id, subject, created_at')
      .eq('status', 'pending')
      .eq('newsletter_type', 'weekly_summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPending) {
      logger.info({
        existingId: existingPending.id,
        subject: existingPending.subject
      }, '[Cron] Pending newsletter already exists, skipping generation');
      return NextResponse.json({
        success: true,
        skipped: true,
        existingId: existingPending.id,
        message: 'Pending newsletter already exists'
      });
    }

    // Fetch recent meetings (last 7 days)
    const meetings = await getRecentMeetings(7);

    if (meetings.length === 0) {
      logger.info('[Cron] No meetings found for newsletter generation');
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No meetings found in the last 7 days'
      });
    }

    // Generate summary
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ackindex.com';
    const summary = await generateWeeklySummary(meetings, baseUrl);

    // Insert as pending for review
    const { data: trigger, error: insertError } = await supabaseAdmin
      .from('newsletter_triggers')
      .insert({
        subject: summary.subject,
        preview_text: summary.previewText,
        html_content: summary.htmlContent,
        plain_text_content: summary.plainTextContent,
        subject_es: summary.subject_es,
        html_content_es: summary.htmlContent_es,
        plain_text_content_es: summary.plainTextContent_es,
        subject_pt: summary.subject_pt,
        html_content_pt: summary.htmlContent_pt,
        plain_text_content_pt: summary.plainTextContent_pt,
        newsletter_type: 'weekly_summary',
        week_start: summary.weekStart.toISOString().split('T')[0],
        week_end: summary.weekEnd.toISOString().split('T')[0],
        meetings_count: summary.meetingsCount,
        meeting_types: summary.meetingTypes,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      logger.error({ error: insertError }, '[Cron] Failed to create newsletter');
      return NextResponse.json(
        { error: 'Failed to generate newsletter' },
        { status: 500 }
      );
    }

    logger.info({
      triggerId: trigger.id,
      subject: summary.subject,
      meetingsCount: summary.meetingsCount
    }, '[Cron] Newsletter generated for review');

    return NextResponse.json({
      success: true,
      triggerId: trigger.id,
      subject: summary.subject,
      meetingsCount: summary.meetingsCount,
      message: 'Newsletter generated and ready for review'
    });
  } catch (error) {
    logger.error({ error }, '[Cron] Unexpected error in generate-newsletter');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
