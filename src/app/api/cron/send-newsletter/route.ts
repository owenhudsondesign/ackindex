/**
 * Cron job to send the weekly newsletter via Resend
 *
 * This runs every Monday at 6am ET to send any pending newsletter.
 *
 * Schedule: Every Monday at 6:00am ET
 * Vercel Cron: 0 11 * * 1 (6:00am ET = 11:00 UTC during EST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendNewsletterToSubscribers } from '@/lib/resend';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized attempt to run newsletter cron');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the most recent pending newsletter
    const { data: pendingNewsletter, error: findError } = await supabaseAdmin
      .from('newsletter_triggers')
      .select('*')
      .eq('status', 'pending')
      .eq('newsletter_type', 'weekly_summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !pendingNewsletter) {
      logger.info('[Cron] No pending newsletters to send');
      return NextResponse.json({
        success: true,
        message: 'No pending newsletters found'
      });
    }

    logger.info({
      newsletterId: pendingNewsletter.id,
      subject: pendingNewsletter.subject
    }, '[Cron] Sending pending newsletter via Resend');

    // Send via Resend
    const { sent, failed, errors } = await sendNewsletterToSubscribers({
      id: pendingNewsletter.id,
      subject: pendingNewsletter.subject,
      subject_es: pendingNewsletter.subject_es,
      subject_pt: pendingNewsletter.subject_pt,
      html_content: pendingNewsletter.html_content,
      html_content_es: pendingNewsletter.html_content_es,
      html_content_pt: pendingNewsletter.html_content_pt,
      plain_text_content: pendingNewsletter.plain_text_content,
      plain_text_content_es: pendingNewsletter.plain_text_content_es,
      plain_text_content_pt: pendingNewsletter.plain_text_content_pt,
    });

    // Update status
    const { error: updateError } = await supabaseAdmin
      .from('newsletter_triggers')
      .update({
        status: failed === 0 ? 'sent' : 'partial',
        processed_at: new Date().toISOString()
      })
      .eq('id', pendingNewsletter.id);

    if (updateError) {
      logger.error({ error: updateError }, '[Cron] Failed to update newsletter status');
    }

    logger.info({
      newsletterId: pendingNewsletter.id,
      subject: pendingNewsletter.subject,
      sent,
      failed
    }, '[Cron] Newsletter cron completed');

    return NextResponse.json({
      success: true,
      newsletterId: pendingNewsletter.id,
      emailsSent: sent,
      emailsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Newsletter sent to ${sent} subscriber${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`
    });
  } catch (error) {
    logger.error({ error }, '[Cron] Unexpected error in newsletter cron');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
