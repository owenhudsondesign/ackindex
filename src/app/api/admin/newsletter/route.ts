/**
 * Newsletter Admin API
 *
 * POST /api/admin/newsletter - Generate and send weekly summary newsletter via Resend
 * GET /api/admin/newsletter - Preview the newsletter without sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, requireAdminApi } from '@/lib/serverAdminAuth';
import { getRecentMeetings, generateWeeklySummary } from '@/lib/newsletterSummary';
import { supabaseAdmin } from '@/lib/supabase';
import { sendNewsletterToSubscribers } from '@/lib/resend';
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
 * POST - Generate and send the newsletter via Resend
 * Accepts optional customContent to override generated content
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
    const customContent = body.customContent as {
      subject?: string;
      previewText?: string;
      htmlContent?: string;
    } | undefined;

    const hasCustomContent = customContent && (
      customContent.subject || customContent.previewText || customContent.htmlContent
    );

    logger.info({
      days,
      triggeredBy: user?.id,
      hasCustomContent: !!hasCustomContent
    }, '[Newsletter] Sending newsletter via Resend');

    // Fetch recent meetings
    const meetings = await getRecentMeetings(days);

    // Generate summary (we always generate for translations and metadata)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ackindex.com';
    const summary = await generateWeeklySummary(meetings, baseUrl);

    // Use custom content if provided, otherwise use generated
    const finalSubject = customContent?.subject || summary.subject;
    const finalHtmlContent = customContent?.htmlContent || summary.htmlContent;

    // Build newsletter content object for Resend
    const newsletterContent = {
      id: crypto.randomUUID(),
      subject: finalSubject,
      subject_es: summary.subject_es,
      subject_pt: summary.subject_pt,
      html_content: finalHtmlContent,
      html_content_es: summary.htmlContent_es,
      html_content_pt: summary.htmlContent_pt,
      plain_text_content: summary.plainTextContent,
      plain_text_content_es: summary.plainTextContent_es,
      plain_text_content_pt: summary.plainTextContent_pt,
    };

    // Send via Resend
    const { sent, failed, errors } = await sendNewsletterToSubscribers(newsletterContent);

    // Log to newsletter_triggers for record keeping
    const { data: trigger, error: insertError } = await supabaseAdmin
      .from('newsletter_triggers')
      .insert({
        subject: finalSubject,
        preview_text: customContent?.previewText || summary.previewText,
        html_content: finalHtmlContent,
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
        status: failed === 0 ? 'sent' : 'partial',
        processed_at: new Date().toISOString(),
        triggered_by: user?.id,
      })
      .select()
      .single();

    if (insertError) {
      logger.warn({ error: insertError }, '[Newsletter] Failed to log newsletter to database (emails were still sent)');
    }

    logger.info({
      triggerId: trigger?.id,
      sent,
      failed,
      meetingsCount: summary.meetingsCount,
    }, '[Newsletter] Newsletter sent via Resend');

    return NextResponse.json({
      success: true,
      triggerId: trigger?.id,
      subject: finalSubject,
      meetingsCount: summary.meetingsCount,
      meetingTypes: summary.meetingTypes,
      weekStart: summary.weekStart.toISOString(),
      weekEnd: summary.weekEnd.toISOString(),
      emailsSent: sent,
      emailsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Newsletter sent to ${sent} subscriber${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}.`,
    });
  } catch (error) {
    logger.error({ error }, '[Newsletter] Send failed');
    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}
